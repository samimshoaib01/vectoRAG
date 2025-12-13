import type { Algo, Metric } from '../../types'
import { Button, Section, Select, TextInput } from '../ui/primitives'
import { AlgoSelector } from './AlgoSelector'
import { InsertVector } from './InsertVector'
import { Legend } from './Legend'
import { LoadSynthetic } from './LoadSynthetic'

interface Props {
  query: string
  setQuery: (s: string) => void
  algo: Algo
  setAlgo: (a: Algo) => void
  metric: Metric
  setMetric: (m: Metric) => void
  topK: number
  setTopK: (k: number) => void
  onSearch: () => void
  onBenchmark: () => void
  searchPending: boolean
  benchPending: boolean
}

export function LeftPanel({
  query,
  setQuery,
  algo,
  setAlgo,
  metric,
  setMetric,
  topK,
  setTopK,
  onSearch,
  onBenchmark,
  searchPending,
  benchPending,
}: Props) {
  return (
    <aside className="w-[260px] shrink-0 bg-card border-r border-border overflow-y-auto p-4 flex flex-col gap-5">
      <Section title="Query (Demo Vectors)">
        <div className="flex flex-col gap-1.5">
          <TextInput
            placeholder="binary tree, sushi, basketball…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && onSearch()}
          />
          <Button
            variant="primary"
            onClick={onSearch}
            disabled={searchPending || !query.trim()}
          >
            {searchPending ? 'searching…' : '⚡ SEARCH'}
          </Button>
        </div>
      </Section>

      <Section title="Algorithm">
        <AlgoSelector value={algo} onChange={setAlgo} />
        <p className="text-[10px] text-muted mt-1.5 leading-snug">
          {algo === 'hnsw' && (
            <>
              <span className="text-green">✓ HNSW</span> — approximate. O(log N).
              Best for high-D embeddings. The only one that scales past ~10⁵
              vectors at 128D+.
            </>
          )}
          {algo === 'kdtree' && (
            <>
              <span className="text-cs">✓ KD-Tree</span> — exact for Euclidean.
              Degrades to O(N) past D≈20 (curse of dimensionality). No incremental
              delete — rebuilds on remove.
            </>
          )}
          {algo === 'bruteforce' && (
            <>
              <span className="text-math">✓ Brute force</span> — exact. O(N·D)
              every query. Use as the correctness baseline.
            </>
          )}
        </p>
      </Section>

      <Section title="Distance Metric">
        <Select
          value={metric}
          onChange={(e) => setMetric(e.target.value as Metric)}
        >
          <option value="euclidean">Euclidean Distance</option>
          <option value="cosine">Cosine Similarity</option>
          <option value="manhattan">Manhattan Distance</option>
        </Select>
        {(metric === 'cosine' || metric === 'manhattan') && algo === 'kdtree' && (
          <p className="text-[10px] text-muted mt-1.5 leading-snug">
            ⚠ KD-tree returns <span className="text-red">approximate</span> results
            for {metric}. Pruning is exact only for Euclidean. Use HNSW for cosine
            on real embeddings.
          </p>
        )}
      </Section>

      <Section title={<>Top-K: <span className="text-text">{topK}</span></>}>
        <input
          type="range"
          min={1}
          max={10}
          value={topK}
          onChange={(e) => setTopK(parseInt(e.target.value, 10))}
          className="w-full accent-accent cursor-pointer"
        />
      </Section>

      <Section title="Category Legend">
        <Legend />
      </Section>

      <Section title="Insert Demo Vector">
        <InsertVector />
      </Section>

      <Section title="Benchmark">
        <Button
          variant="secondary"
          onClick={onBenchmark}
          disabled={benchPending}
        >
          {benchPending ? 'running…' : '▶ COMPARE ALL ALGOS'}
        </Button>
      </Section>

      <Section title="Synthetic Data">
        <LoadSynthetic />
      </Section>
    </aside>
  )
}
