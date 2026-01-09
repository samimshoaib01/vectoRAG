import type { BenchmarkResponse } from '../../types'

const ROWS: { key: keyof BenchmarkResponse; label: string; color: string }[] = [
  { key: 'bruteforceUs', label: 'Brute Force', color: '#f38ba8' },
  { key: 'kdtreeUs',     label: 'KD-Tree',     color: '#89dceb' },
  { key: 'hnswUs',       label: 'HNSW',        color: '#b388ff' },
]

function fmt(us: number) {
  return us < 1000 ? `${us} μs` : `${(us / 1000).toFixed(2)} ms`
}

export function BenchmarkBars({ data }: { data: BenchmarkResponse }) {
  const max = Math.max(data.bruteforceUs, data.kdtreeUs, data.hnswUs, 1)
  return (
    <div className="flex flex-col gap-2.5">
      {ROWS.map((r) => {
        const us = data[r.key] as number
        const pct = Math.max((us / max) * 100, 2)
        return (
          <div key={r.key} className="flex flex-col gap-1">
            <div className="flex justify-between text-[10px]">
              <span style={{ color: r.color }}>{r.label}</span>
              <span className="text-muted">{fmt(us)}</span>
            </div>
            <div className="h-1.5 bg-bg rounded-sm overflow-hidden">
              <div
                className="h-full rounded-sm transition-[width] duration-500 ease-out"
                style={{ width: `${pct}%`, background: r.color }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}
