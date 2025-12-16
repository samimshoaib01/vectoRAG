export type TabName = 'search' | 'live' | 'docs' | 'rag'

const TABS: { id: TabName; label: string }[] = [
  { id: 'search', label: 'SEARCH' },
  { id: 'live', label: 'LIVE' },
  { id: 'docs', label: 'DOCUMENTS' },
  { id: 'rag', label: 'ASK AI' },
]

export function Tabs({
  active,
  onChange,
}: {
  active: TabName
  onChange: (t: TabName) => void
}) {
  return (
    <div className="flex border-b border-border shrink-0">
      {TABS.map((t) => {
        const on = t.id === active
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => onChange(t.id)}
            className={
              'flex-1 px-1.5 py-2.5 text-center text-[10px] tracking-[1px] cursor-pointer transition-colors border-b-2 ' +
              (on
                ? 'text-accent border-accent'
                : 'text-muted border-transparent hover:text-text')
            }
          >
            {t.label}
          </button>
        )
      })}
    </div>
  )
}
