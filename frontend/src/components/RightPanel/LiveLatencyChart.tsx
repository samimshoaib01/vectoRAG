import { useEffect, useMemo, useRef, useState } from 'react'
import { api } from '../../api/client'
import type { Metric } from '../../types'

interface Sample {
  bf: number
  kd: number
  hnsw: number
}

const COLORS = {
  bf: '#f38ba8',
  kd: '#89dceb',
  hnsw: '#b388ff',
}

const HISTORY = 60
const TICK_MS = 1200

function fmt(us: number) {
  return us < 1000 ? `${us} μs` : `${(us / 1000).toFixed(2)} ms`
}

export function LiveLatencyChart({ metric }: { metric: Metric }) {
  const [samples, setSamples] = useState<Sample[]>([])
  const [running, setRunning] = useState(true)
  const [count, setCount] = useState<number | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)

  // Stable random 128D query vector so the chart isn't dominated by query variance.
  const queryVec = useMemo(() => {
    const v: number[] = []
    let seed = 1337
    for (let i = 0; i < 128; i++) {
      seed = (seed * 9301 + 49297) % 233280
      v.push(seed / 233280)
    }
    return v
  }, [])

  // Periodically run benchmark
  useEffect(() => {
    if (!running) return
    let cancelled = false
    let timer: number | undefined

    const tick = async () => {
      try {
        const r = await api.benchmark({ v: queryVec, k: 5, metric })
        if (cancelled) return
        setCount(r.itemCount)
        setSamples((prev) => {
          const next = [...prev, { bf: r.bruteforceUs, kd: r.kdtreeUs, hnsw: r.hnswUs }]
          return next.length > HISTORY ? next.slice(-HISTORY) : next
        })
      } catch {
        // backend hiccup; skip this tick
      }
      if (!cancelled) timer = window.setTimeout(tick, TICK_MS)
    }
    tick()

    return () => {
      cancelled = true
      if (timer) clearTimeout(timer)
    }
  }, [running, metric, queryVec])

  // Render chart
  useEffect(() => {
    const canvas = canvasRef.current
    const wrap = wrapRef.current
    if (!canvas || !wrap) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const W = wrap.clientWidth
    const H = 200
    canvas.width = W * devicePixelRatio
    canvas.height = H * devicePixelRatio
    canvas.style.width = `${W}px`
    canvas.style.height = `${H}px`
    ctx.scale(devicePixelRatio, devicePixelRatio)
    ctx.clearRect(0, 0, W, H)

    // background
    ctx.fillStyle = '#07070f'
    ctx.fillRect(0, 0, W, H)

    if (samples.length < 2) {
      ctx.fillStyle = '#4a4a6a'
      ctx.font = '11px monospace'
      ctx.textAlign = 'center'
      ctx.fillText('warming up…', W / 2, H / 2)
      return
    }

    const padL = 38
    const padR = 8
    const padT = 8
    const padB = 18
    const plotW = W - padL - padR
    const plotH = H - padT - padB

    // log-scale Y axis (huge dynamic range between HNSW and brute)
    const flat = samples.flatMap((s) => [s.bf, s.kd, s.hnsw]).filter((v) => v > 0)
    const minV = Math.max(1, Math.min(...flat))
    const maxV = Math.max(...flat)
    const logMin = Math.log10(Math.max(1, minV * 0.7))
    const logMax = Math.log10(maxV * 1.15)
    const yFor = (v: number) => {
      const t = (Math.log10(Math.max(1, v)) - logMin) / (logMax - logMin)
      return padT + plotH - t * plotH
    }
    const xFor = (i: number) =>
      padL + (i / Math.max(samples.length - 1, 1)) * plotW

    // gridlines + Y labels at decades
    ctx.font = '9px monospace'
    ctx.textAlign = 'right'
    ctx.strokeStyle = '#151528'
    ctx.lineWidth = 1
    const startDecade = Math.floor(logMin)
    const endDecade = Math.ceil(logMax)
    for (let d = startDecade; d <= endDecade; d++) {
      const val = Math.pow(10, d)
      const y = yFor(val)
      if (y < padT || y > padT + plotH) continue
      ctx.beginPath()
      ctx.moveTo(padL, y)
      ctx.lineTo(W - padR, y)
      ctx.stroke()
      ctx.fillStyle = '#4a4a6a'
      ctx.fillText(fmt(val), padL - 4, y + 3)
    }

    // X axis label
    ctx.fillStyle = '#4a4a6a'
    ctx.textAlign = 'center'
    ctx.fillText(`last ${samples.length} runs →`, padL + plotW / 2, H - 4)

    // draw lines
    const lines: { key: keyof Sample; color: string }[] = [
      { key: 'bf', color: COLORS.bf },
      { key: 'kd', color: COLORS.kd },
      { key: 'hnsw', color: COLORS.hnsw },
    ]
    for (const line of lines) {
      ctx.strokeStyle = line.color
      ctx.shadowColor = line.color
      ctx.shadowBlur = 6
      ctx.lineWidth = 1.6
      ctx.beginPath()
      samples.forEach((s, i) => {
        const x = xFor(i)
        const y = yFor(s[line.key])
        if (i === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      })
      ctx.stroke()
      ctx.shadowBlur = 0
    }
  }, [samples])

  const latest = samples[samples.length - 1]

  return (
    <div className="flex flex-col gap-2">
      <div className="flex justify-between items-center">
        <div className="text-[10px] text-muted">
          {count != null ? <>N = {count.toLocaleString()} · {metric}</> : null}
        </div>
        <button
          type="button"
          onClick={() => setRunning((r) => !r)}
          className="text-[10px] px-2 py-0.5 rounded border border-border text-muted hover:text-text cursor-pointer"
        >
          {running ? '⏸ pause' : '▶ resume'}
        </button>
      </div>
      <div ref={wrapRef} className="w-full">
        <canvas ref={canvasRef} className="block w-full rounded-md" />
      </div>
      {latest && (
        <div className="grid grid-cols-3 gap-2 text-[10px]">
          <div className="flex flex-col">
            <span style={{ color: COLORS.bf }}>Brute</span>
            <span className="text-text font-medium">{fmt(latest.bf)}</span>
          </div>
          <div className="flex flex-col">
            <span style={{ color: COLORS.kd }}>KD-Tree</span>
            <span className="text-text font-medium">{fmt(latest.kd)}</span>
          </div>
          <div className="flex flex-col">
            <span style={{ color: COLORS.hnsw }}>HNSW</span>
            <span className="text-text font-medium">{fmt(latest.hnsw)}</span>
          </div>
        </div>
      )}
    </div>
  )
}
