import type { StatusResponse } from '../../../types'

export function OllamaStatusCard({
  data,
  isLoading,
}: {
  data: StatusResponse | undefined
  isLoading: boolean
}) {
  if (isLoading || !data) {
    return (
      <div className="bg-bg border border-border rounded-lg px-3 py-2.5 text-[11px] text-muted">
        Checking…
      </div>
    )
  }
  if (data.ollamaAvailable) {
    return (
      <div className="bg-bg border border-green/30 rounded-lg px-3 py-2.5 text-[11px] leading-relaxed">
        <span className="text-green">● Online</span>
        <br />
        Embed: <span className="text-accent">{data.embedModel}</span>
        <br />
        Generate: <span className="text-accent">{data.genModel}</span>
        <br />
        Dims:{' '}
        <span className="text-muted">
          {data.docDims || '(first insert sets this)'}
        </span>
        <br />
        Documents: <span className="text-text">{data.docCount}</span>
      </div>
    )
  }
  return (
    <div className="bg-bg border border-red/30 rounded-lg px-3 py-2.5 text-[11px] leading-relaxed">
      <span className="text-red">● Offline</span>
      <br />
      <br />
      To enable RAG features:
      <br />
      <span className="text-muted">
        1. Install from ollama.com
        <br />
        2. ollama pull nomic-embed-text
        <br />
        3. ollama pull llama3.2
      </span>
    </div>
  )
}
