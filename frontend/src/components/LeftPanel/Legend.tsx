const ROWS: { color: string; label: string }[] = [
  { color: 'var(--color-cs)', label: 'CS / Algorithms' },
  { color: 'var(--color-math)', label: 'Mathematics' },
  { color: 'var(--color-food)', label: 'Food & Cooking' },
  { color: 'var(--color-sports)', label: 'Sports & Games' },
  { color: 'var(--color-green)', label: 'Documents (RAG)' },
]

export function Legend() {
  return (
    <div className="flex flex-col gap-1.5">
      {ROWS.map((r) => (
        <div
          key={r.label}
          className="flex items-center gap-2 text-[11px] text-muted"
        >
          <span
            className="w-2.5 h-2.5 rounded-full shrink-0"
            style={{
              background: r.color,
              boxShadow: `0 0 5px ${r.color}`,
            }}
          />
          {r.label}
        </div>
      ))}
    </div>
  )
}
