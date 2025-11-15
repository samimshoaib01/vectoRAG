export type Category = 'cs' | 'math' | 'food' | 'sports' | 'doc' | string

export type Algo = 'hnsw' | 'kdtree' | 'bruteforce'
export type Metric = 'cosine' | 'euclidean' | 'manhattan'

export interface VectorItem {
  id: number
  metadata: string
  category: Category
  embedding: number[]
}

export interface SearchHit {
  id: number
  metadata: string
  category: Category
  distance: number
  embedding: number[]
}

export interface SearchResponse {
  results: SearchHit[]
  latencyUs: number
  algo: Algo
  metric: Metric
}

export interface InsertResponse {
  id: number
  error?: string
}

export interface OkResponse {
  ok: boolean
}

export interface BenchmarkResponse {
  bruteforceUs: number
  kdtreeUs: number
  hnswUs: number
  itemCount: number
}

export interface LoadSyntheticResponse {
  inserted: number
  totalCount: number
  elapsedMs: number
}

export interface HNSWNode {
  id: number
  metadata: string
  category: Category
  maxLyr: number
}

export interface HNSWEdge {
  src: number
  dst: number
  lyr: number
}

export interface HNSWInfo {
  topLayer: number
  nodeCount: number
  nodesPerLayer: number[]
  edgesPerLayer: number[]
  nodes: HNSWNode[]
  edges: HNSWEdge[]
}

export interface StatusResponse {
  ollamaAvailable: boolean
  embedModel: string
  genModel: string
  docCount: number
  docDims: number
  demoDims: number
  demoCount: number
}

export interface StatsResponse {
  count: number
  dims: number
  algorithms: Algo[]
  metrics: Metric[]
}

export interface DocSummary {
  id: number
  title: string
  preview: string
  words: number
}

export interface DocInsertResponse {
  ids?: number[]
  chunks?: number
  dims?: number
  error?: string
}

export interface DocSearchContext {
  id: number
  title: string
  distance: number
}

export interface DocSearchResponse {
  contexts: DocSearchContext[]
  error?: string
}

export interface RAGContext {
  id: number
  title: string
  text: string
  distance: number
}

export interface RAGResponse {
  answer: string
  model: string
  contexts: RAGContext[]
  docCount: number
  error?: string
}
