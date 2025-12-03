import type { StatsResponse, StatusResponse } from '../types'

interface Props {
  stats?: StatsResponse
  status?: StatusResponse
}

export function Header({ stats, status }: Props) {
  const ollamaUp = status?.ollamaAvailable

  return (
    <header className="bg-card border-b border-border px-5 py-2.5 flex items-center gap-3 shrink-0">
      <h1 className="text-base font-semibold tracking-[4px] bg-gradient-to-r from-cs via-accent to-math bg-clip-text text-transparent">
        VECTORDB
      </h1>
      <Badge variant="hl">HNSW</Badge>
      <Badge>KD-TREE</Badge>
      <Badge>BRUTE FORCE</Badge>
      <Badge
        variant={
          ollamaUp === undefined ? 'default' : ollamaUp ? 'ok' : 'err'
        }
      >
        OLLAMA {ollamaUp === undefined ? '…' : ollamaUp ? '✓' : '✗'}
      </Badge>
      <span className="ml-auto text-[11px] text-muted">
        {stats ? `${stats.count} vectors · ${stats.dims} dims` : 'loading…'}
      </span>
    </header>
  )
}

function Badge({
  children,
  variant = 'default',
}: {
  children: React.ReactNode
  variant?: 'default' | 'hl' | 'ok' | 'err'
}) {
  const styles: Record<typeof variant, string> = {
    default: 'border-border text-muted',
    hl: 'border-accent text-accent bg-accent/10',
    ok: 'border-green text-green bg-green/10',
    err: 'border-red text-red bg-red/10',
  }
  return (
    <span
      className={`text-[10px] px-2 py-0.5 rounded-xl tracking-[1px] border ${styles[variant]}`}
    >
      {children}
    </span>
  )
}
