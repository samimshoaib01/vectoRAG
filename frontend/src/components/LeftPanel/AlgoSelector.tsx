import type { Algo } from '../../types'

const OPTIONS: { value: Algo; label: string }[] = [
  { value: 'hnsw', label: 'HNSW' },
  { value: 'kdtree', label: 'KD-TREE' },
  { value: 'bruteforce', label: 'BRUTE' },
]

export function AlgoSelector({
  value,
  onChange,
}: {
  value: Algo
  onChange: (a: Algo) => void
}) {
  return (
    <div className="flex gap-1.5">
      {OPTIONS.map((opt) => {
        const on = opt.value === value
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={
              'flex-1 px-1 py-1.5 rounded-md border text-[10px] tracking-wide cursor-pointer transition-colors ' +
              (on
                ? 'border-accent text-accent bg-accent/10'
                : 'border-border text-muted bg-bg hover:text-text')
            }
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}
