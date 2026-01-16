import type { HNSWInfo } from '../../types'

export function HNSWLayers({
  data,
  isLoading,
}: {
  data: HNSWInfo | undefined
  isLoading: boolean
}) {
  if (isLoading) {
    return <div className="text-[11px] text-muted">Loading…</div>
  }
  if (!data || !data.nodesPerLayer.length) {
    return <div className="text-[11px] text-muted">Empty</div>
  }
  const maxN = data.nodesPerLayer[0] || 1

  return (
    <div className="flex flex-col gap-1.5">
      {data.nodesPerLayer.map((cnt, lyr) => {
        const pct = Math.max((cnt / maxN) * 100, 2)
        const edges = data.edgesPerLayer[lyr] ?? 0
        return (
          <div key={lyr} className="flex items-center gap-2 text-[10px]">
            <div className="w-[18px] text-right text-accent">L{lyr}</div>
            <div className="flex-1 h-1.5 bg-bg rounded-sm overflow-hidden">
              <div
                className="h-full bg-accent rounded-sm opacity-70 transition-[width] duration-400"
                style={{ width: `${pct}%` }}
              />
            </div>
            <div className="w-20 text-right text-muted">
              {cnt}n · {edges}e
            </div>
          </div>
        )
      })}
    </div>
  )
}
