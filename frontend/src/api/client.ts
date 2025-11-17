import type {
  Algo,
  BenchmarkResponse,
  DocInsertResponse,
  DocSearchResponse,
  DocSummary,
  HNSWInfo,
  InsertResponse,
  LoadSyntheticResponse,
  Metric,
  OkResponse,
  RAGResponse,
  SearchResponse,
  StatsResponse,
  StatusResponse,
  VectorItem,
} from '../types'

class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

async function request<T>(
  path: string,
  init: RequestInit = {}
): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: {
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...init.headers,
    },
  })
  if (!res.ok) {
    throw new ApiError(res.status, `${path} → ${res.status}`)
  }
  return res.json() as Promise<T>
}

export const api = {
  // ── Demo (16D) vector index ───────────────────────────────────
  getItems: () => request<VectorItem[]>('/items'),
  getStats: () => request<StatsResponse>('/stats'),
  getHnswInfo: () => request<HNSWInfo>('/hnsw-info'),

  search: (params: {
    v: number[]
    k: number
    metric: Metric
    algo: Algo
  }) => {
    const qs = new URLSearchParams({
      v: params.v.join(','),
      k: String(params.k),
      metric: params.metric,
      algo: params.algo,
    })
    return request<SearchResponse>(`/search?${qs}`)
  },

  benchmark: (params: { v: number[]; k: number; metric: Metric }) => {
    const qs = new URLSearchParams({
      v: params.v.join(','),
      k: String(params.k),
      metric: params.metric,
    })
    return request<BenchmarkResponse>(`/benchmark?${qs}`)
  },

  insertVector: (body: {
    metadata: string
    category: string
    embedding: number[]
  }) =>
    request<InsertResponse>('/insert', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  deleteVector: (id: number) =>
    request<OkResponse>(`/delete/${id}`, { method: 'DELETE' }),

  loadSynthetic: (count: number) =>
    request<LoadSyntheticResponse>(`/load-synthetic?count=${count}`, {
      method: 'POST',
    }),

  resetVectors: () =>
    request<{ count: number }>('/reset-vectors', { method: 'POST' }),

  // ── Documents (Ollama-embedded) + RAG ─────────────────────────
  getStatus: () => request<StatusResponse>('/status'),
  docList: () => request<DocSummary[]>('/doc/list'),

  docInsert: (body: { title: string; text: string }) =>
    request<DocInsertResponse>('/doc/insert', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  docDelete: (id: number) =>
    request<OkResponse>(`/doc/delete/${id}`, { method: 'DELETE' }),

  docSearch: (body: { question: string; k: number }) =>
    request<DocSearchResponse>('/doc/search', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  docAsk: (body: { question: string; k: number }) =>
    request<RAGResponse>('/doc/ask', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
}

export { ApiError }
