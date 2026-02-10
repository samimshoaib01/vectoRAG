import { useState } from 'react'
import type {
  Algo,
  BenchmarkResponse,
  HNSWInfo,
  Metric,
  RAGContext,
  SearchHit,
} from '../../types'
import { DocsTab } from './DocsTab'
import { LiveLatencyChart } from './LiveLatencyChart'
import { RAGTab } from './RAGTab'
import { SearchTab } from './SearchTab'
import { Tabs, type TabName } from './Tabs'

interface Props {
  searchResults: SearchHit[]
  latencyUs: number | undefined
  searchAlgo: Algo | undefined
  searchMetric: Metric | undefined
  searchK: number | undefined
  queryEmbedding: number[] | null
  benchmark: BenchmarkResponse | undefined
  hnswInfo: HNSWInfo | undefined
  hnswLoading: boolean
  currentMetric: Metric
  onDeleteResult: (id: number) => void
  onRAGContexts?: (contexts: RAGContext[]) => void
}

export function RightPanel({ onRAGContexts, currentMetric, ...searchProps }: Props) {
  const [tab, setTab] = useState<TabName>('search')

  return (
    <aside className="w-[360px] shrink-0 bg-card border-l border-border flex flex-col overflow-hidden">
      <Tabs active={tab} onChange={setTab} />
      {tab === 'search' && <SearchTab {...searchProps} />}
      {tab === 'live' && (
        <div className="p-4 overflow-y-auto">
          <div className="text-[11px] text-muted mb-2 leading-snug">
            Auto-benchmarks every 1.2s against the live index. Y-axis is log-scale
            (µs). Watch HNSW pull away as N grows.
          </div>
          <LiveLatencyChart metric={currentMetric} />
        </div>
      )}
      {tab === 'docs' && <DocsTab />}
      {tab === 'rag' && <RAGTab onContexts={onRAGContexts} />}
    </aside>
  )
}
