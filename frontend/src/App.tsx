import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from './api/client'
import { textToEmbedding } from './utils/textToEmbedding'
import { pca2D } from './utils/pca'
import type {
  Algo,
  BenchmarkResponse,
  Metric,
  RAGContext,
  SearchHit,
  VectorItem,
} from './types'
import { Header } from './components/Header'
import { LeftPanel } from './components/LeftPanel'
import { RightPanel } from './components/RightPanel'
import { ScatterPlot, type QueryPoint } from './components/Scatter/ScatterPlot'

export default function App() {
  // ── Control state ──────────────────────────────────────────
  const [query, setQuery] = useState('')
  const [algo, setAlgo] = useState<Algo>('hnsw')
  const [metric, setMetric] = useState<Metric>('euclidean')
  const [topK, setTopK] = useState(5)

  // ── Last search snapshot ───────────────────────────────────
  const [results, setResults] = useState<SearchHit[]>([])
  const [latencyUs, setLatencyUs] = useState<number | undefined>()
  const [usedAlgo, setUsedAlgo] = useState<Algo>()
  const [usedMetric, setUsedMetric] = useState<Metric>()
  const [usedK, setUsedK] = useState<number>()
  const [benchmark, setBenchmark] = useState<BenchmarkResponse | undefined>()
  const [queryPt, setQueryPt] = useState<QueryPoint | null>(null)
  const [queryEmbedding, setQueryEmbedding] = useState<number[] | null>(null)

  // ── Background queries ─────────────────────────────────────
  const itemsQ = useQuery({ queryKey: ['items'], queryFn: api.getItems })
  const statsQ = useQuery({ queryKey: ['stats'], queryFn: api.getStats })
  const statusQ = useQuery({
    queryKey: ['status'],
    queryFn: api.getStatus,
    refetchInterval: 10_000,
  })
  const hnswQ = useQuery({ queryKey: ['hnsw'], queryFn: api.getHnswInfo })

  const qc = useQueryClient()
  const items: VectorItem[] = itemsQ.data ?? []

  // PCA projection cached per item-set; used to place queryPt on hit centroid.
  const pcaCoords = useMemo(() => {
    if (items.length < 2) return null
    return pca2D(items.map((v) => v.embedding))
  }, [items])

  // hitIds drives which dots pulse on the scatter plot. Demo search sets it
  // from SearchHit[] (top-K from /search). RAG sets it by matching context
  // titles back to "doc"-category dots, which were forged at insert time.
  const [ragHitIds, setRagHitIds] = useState<Set<number>>(new Set())
  const hitIds = useMemo(() => {
    if (ragHitIds.size > 0) return ragHitIds
    return new Set(results.map((r) => r.id))
  }, [results, ragHitIds])

  function handleRAGContexts(contexts: RAGContext[]) {
    // Each RAG chunk title may have a "[i/n]" suffix; the scatter dot's
    // metadata is the raw title. So we match with startsWith.
    const ids = new Set<number>()
    for (const ctx of contexts) {
      const dot = items.find(
        (it) => it.category === 'doc' && ctx.title.startsWith(it.metadata)
      )
      if (dot) ids.add(dot.id)
    }
    setRagHitIds(ids)
    // Also park the query star at the weighted centroid of matched dots.
    if (pcaCoords && ids.size > 0) {
      let sx = 0
      let sy = 0
      let sw = 0
      let rank = 0
      for (const ctx of contexts) {
        const idx = items.findIndex(
          (it) => it.category === 'doc' && ctx.title.startsWith(it.metadata)
        )
        if (idx < 0) continue
        const w = 1 / (rank + 1)
        sx += pcaCoords[idx][0] * w
        sy += pcaCoords[idx][1] * w
        sw += w
        rank++
      }
      if (sw > 0) {
        setQueryPt({ x: sx / sw, y: sy / sw })
      }
    }
  }

  function computeQueryPt(hits: SearchHit[]): QueryPoint | null {
    if (!pcaCoords || hits.length === 0) return null
    let sx = 0
    let sy = 0
    let sw = 0
    for (let i = 0; i < Math.min(3, hits.length); i++) {
      const idx = items.findIndex((it) => it.id === hits[i].id)
      if (idx < 0) continue
      const w = 1 / (i + 1)
      sx += pcaCoords[idx][0] * w
      sy += pcaCoords[idx][1] * w
      sw += w
    }
    if (sw === 0) return null
    return { x: sx / sw, y: sy / sw }
  }

  // ── Mutations ──────────────────────────────────────────────
  const searchMut = useMutation({
    mutationFn: () => {
      const emb = textToEmbedding(query)
      setQueryEmbedding(emb)
      return api.search({ v: emb, k: topK, metric, algo })
    },
    onSuccess: (data) => {
      setResults(data.results)
      setLatencyUs(data.latencyUs)
      setUsedAlgo(algo)
      setUsedMetric(metric)
      setUsedK(topK)
      setQueryPt(computeQueryPt(data.results))
      setRagHitIds(new Set())
    },
  })

  const benchMut = useMutation({
    mutationFn: () =>
      api.benchmark({
        v: textToEmbedding(query.trim() || 'binary tree algorithm'),
        k: 5,
        metric,
      }),
    onSuccess: (data) => setBenchmark(data),
  })

  const deleteMut = useMutation({
    mutationFn: (id: number) => api.deleteVector(id),
    onSuccess: (_, id) => {
      setResults((rs) => rs.filter((r) => r.id !== id))
      qc.invalidateQueries({ queryKey: ['items'] })
      qc.invalidateQueries({ queryKey: ['stats'] })
      qc.invalidateQueries({ queryKey: ['hnsw'] })
    },
  })

  return (
    <div className="h-full flex flex-col">
      <Header stats={statsQ.data} status={statusQ.data} />
      <div className="flex flex-1 overflow-hidden">
        <LeftPanel
          query={query}
          setQuery={setQuery}
          algo={algo}
          setAlgo={setAlgo}
          metric={metric}
          setMetric={setMetric}
          topK={topK}
          setTopK={setTopK}
          onSearch={() => query.trim() && searchMut.mutate()}
          onBenchmark={() => benchMut.mutate()}
          searchPending={searchMut.isPending}
          benchPending={benchMut.isPending}
        />

        <ScatterPlot items={items} hitIds={hitIds} queryPt={queryPt} />

        <RightPanel
          searchResults={results}
          latencyUs={latencyUs}
          searchAlgo={usedAlgo}
          searchMetric={usedMetric}
          searchK={usedK}
          queryEmbedding={queryEmbedding}
          benchmark={benchmark}
          hnswInfo={hnswQ.data}
          hnswLoading={hnswQ.isLoading}
          currentMetric={metric}
          onDeleteResult={(id) => deleteMut.mutate(id)}
          onRAGContexts={handleRAGContexts}
        />
      </div>
    </div>
  )
}
