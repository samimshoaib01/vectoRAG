import type {
  Algo,
  BenchmarkResponse,
  HNSWInfo,
  Metric,
  SearchHit,
} from '../../types'
import { Section } from '../ui/primitives'
import { BenchmarkBars } from './BenchmarkBars'
import { HNSWLayers } from './HNSWLayers'
import { LatencyDisplay } from './LatencyDisplay'
import { ResultsList } from './ResultsList'
import { VectorChart } from './VectorChart'

export function SearchTab({
  searchResults,
  latencyUs,
  searchAlgo,
  searchMetric,
  searchK,
  queryEmbedding,
  benchmark,
  hnswInfo,
  hnswLoading,
  onDeleteResult,
}: {
  searchResults: SearchHit[]
  latencyUs: number | undefined
  searchAlgo: Algo | undefined
  searchMetric: Metric | undefined
  searchK: number | undefined
  queryEmbedding: number[] | null
  benchmark: BenchmarkResponse | undefined
  hnswInfo: HNSWInfo | undefined
  hnswLoading: boolean
  onDeleteResult: (id: number) => void
}) {
  return (
    <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-5">
      <Section title="Search Latency">
        <LatencyDisplay
          latencyUs={latencyUs}
          algo={searchAlgo}
          metric={searchMetric}
          k={searchK}
        />
      </Section>

      <Section title="Top Matches">
        <ResultsList results={searchResults} onDelete={onDeleteResult} />
      </Section>

      <Section title="Query Embedding (128D)">
        <VectorChart embedding={queryEmbedding} />
      </Section>

      {benchmark && (
        <Section title="Algorithm Comparison">
          <BenchmarkBars data={benchmark} />
        </Section>
      )}

      <Section title="HNSW Graph Layers">
        <HNSWLayers data={hnswInfo} isLoading={hnswLoading} />
      </Section>
    </div>
  )
}
