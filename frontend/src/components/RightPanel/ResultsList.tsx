import type { SearchHit } from '../../types'

const COL: Record<string, string> = {
  cs: 'var(--color-cs)',
  math: 'var(--color-math)',
  food: 'var(--color-food)',
  sports: 'var(--color-sports)',
  doc: 'var(--color-green)',
}

export function ResultsList({
  results,
  onDelete,
  emptyMessage = 'Run a search to see results…',
}: {
  results: SearchHit[]
  onDelete: (id: number) => void
  emptyMessage?: string
}) {
  if (!results.length) {
    return <div className="text-[11px] text-muted">{emptyMessage}</div>
  }
  return (
    <div className="flex flex-col gap-2">
      {results.map((r, i) => {
        const col = COL[r.category] ?? 'var(--color-accent)'
        return (
          <div
            key={r.id}
            className="bg-bg border border-border rounded-lg px-3 py-2.5 hover:border-border-strong transition-colors animate-[fadeUp_0.25s_ease]"
          >
            <div className="text-[9px] text-muted tracking-[1px] mb-1">
              #{i + 1} NEAREST
            </div>
            <div className="text-xs leading-snug mb-1.5">{r.metadata}</div>
            <div className="flex items-center justify-between gap-1.5">
              <span
                className="text-[9px] px-1.5 py-0.5 rounded-lg tracking-wide"
                style={{
                  background: `${col}18`,
                  color: col,
                  border: `1px solid ${col}44`,
                }}
              >
                {r.category.toUpperCase()}
              </span>
              <span className="text-[10px] text-muted flex-1 text-right">
                dist: {r.distance.toFixed(5)}
              </span>
              <button
                type="button"
                onClick={() => onDelete(r.id)}
                className="text-[10px] px-1.5 py-0.5 rounded border border-red/25 text-red bg-red/10 hover:bg-red/25 transition-colors cursor-pointer"
                aria-label={`delete item ${r.id}`}
              >
                ✕
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
