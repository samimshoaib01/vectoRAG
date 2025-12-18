import type { Algo, Metric } from '../../types'

export function LatencyDisplay({
  latencyUs,
  algo,
  metric,
  k,
}: {
  latencyUs: number | undefined
  algo: Algo | undefined
  metric: Metric | undefined
  k: number | undefined
}) {
  const big =
    latencyUs === undefined
      ? '—'
      : latencyUs < 1000
        ? `${latencyUs} μs`
        : `${(latencyUs / 1000).toFixed(2)} ms`
  const sub =
    latencyUs === undefined
      ? 'No query yet'
      : `${algo?.toUpperCase()}  ·  ${metric}  ·  k=${k}`
  return (
    <div>
      <div className="text-3xl font-semibold text-cs drop-shadow-[0_0_20px_rgba(0,217,255,0.4)]">
        {big}
      </div>
      <div className="text-[11px] text-muted mt-0.5">{sub}</div>
    </div>
  )
}
