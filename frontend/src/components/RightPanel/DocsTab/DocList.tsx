import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../../../api/client'

export function DocList() {
  const { data: docs, isLoading } = useQuery({
    queryKey: ['docs'],
    queryFn: api.docList,
  })
  const qc = useQueryClient()

  const del = useMutation({
    mutationFn: (id: number) => api.docDelete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['docs'] })
      qc.invalidateQueries({ queryKey: ['status'] })
    },
  })

  if (isLoading) {
    return <div className="text-[11px] text-muted">Loading…</div>
  }
  if (!docs || !docs.length) {
    return <div className="text-[11px] text-muted">No documents yet.</div>
  }

  return (
    <div className="flex flex-col gap-2">
      {docs.map((d) => (
        <div
          key={d.id}
          className="bg-bg border border-border rounded-lg px-3 py-2.5 animate-[fadeUp_0.25s_ease]"
        >
          <div className="text-xs font-medium text-green mb-1">{d.title}</div>
          <div className="text-[10px] text-muted leading-relaxed mb-1.5">
            {d.preview}
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[9px] text-muted">{d.words} words</span>
            <button
              type="button"
              onClick={() => del.mutate(d.id)}
              disabled={del.isPending}
              className="text-[10px] px-1.5 py-0.5 rounded border border-red/25 text-red bg-red/10 hover:bg-red/25 transition-colors cursor-pointer disabled:opacity-50"
              aria-label={`delete ${d.title}`}
            >
              ✕
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
