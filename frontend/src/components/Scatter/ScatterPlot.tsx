import { useEffect, useMemo, useRef, useState } from 'react'
import type { VectorItem } from '../../types'
import { pca2D } from '../../utils/pca'

const COL: Record<string, string> = {
  cs: '#00d9ff',
  math: '#b388ff',
  food: '#ffb74d',
  sports: '#69f0ae',
  doc: '#a6e3a1',
}
const DEFAULT_COL = '#90a4ae'

interface Point {
  x: number
  y: number
  item: VectorItem
}

interface Bounds {
  minX: number
  maxX: number
  minY: number
  maxY: number
}

export interface QueryPoint {
  x: number
  y: number
}

interface Props {
  items: VectorItem[]
  hitIds: Set<number>
  queryPt: QueryPoint | null
}

// Cap how many dots we render each frame. Canvas with radial gradients gets
// expensive past ~800. Hits are always rendered; non-hits are sampled.
const RENDER_CAP = 800
// Above this, drop the radial-gradient glow (cheap circle only) so the
// animation stays fluid at 5k+ vectors.
const GLOW_CUTOFF = 400

const MIN_ZOOM = 0.25
const MAX_ZOOM = 6

export function ScatterPlot({ items, hitIds, queryPt }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [hover, setHover] = useState<{
    item: VectorItem
    clientX: number
    clientY: number
  } | null>(null)
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const drag = useRef<{ startX: number; startY: number; basePan: { x: number; y: number } } | null>(null)
  const resetView = () => {
    setZoom(1)
    setPan({ x: 0, y: 0 })
  }
  const zoomBy = (factor: number) =>
    setZoom((z) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z * factor)))

  // ── PCA + bounds (recomputed only when items change) ──────
  const { points, bounds } = useMemo<{
    points: Point[]
    bounds: Bounds
  }>(() => {
    if (items.length < 2) {
      return {
        points: items.map((item) => ({ x: 0, y: 0, item })),
        bounds: { minX: -1, maxX: 1, minY: -1, maxY: 1 },
      }
    }
    const coords = pca2D(items.map((v) => v.embedding))
    const pts: Point[] = items.map((item, i) => ({
      x: coords[i][0],
      y: coords[i][1],
      item,
    }))
    let x0 = Infinity,
      x1 = -Infinity,
      y0 = Infinity,
      y1 = -Infinity
    for (const p of pts) {
      if (p.x < x0) x0 = p.x
      if (p.x > x1) x1 = p.x
      if (p.y < y0) y0 = p.y
      if (p.y > y1) y1 = p.y
    }
    const px = (x1 - x0) * 0.18 || 0.1
    const py = (y1 - y0) * 0.18 || 0.1
    return {
      points: pts,
      bounds: { minX: x0 - px, maxX: x1 + px, minY: y0 - py, maxY: y1 + py },
    }
  }, [items])

  // Cap rendered points. Always include hits; deterministically subsample
  // the rest so the picked sample is stable across renders (no flicker).
  const renderPoints = useMemo<Point[]>(() => {
    if (points.length <= RENDER_CAP) return points
    const out: Point[] = []
    const nonHits: Point[] = []
    for (const p of points) {
      if (hitIds.has(p.item.id)) out.push(p)
      else nonHits.push(p)
    }
    const budget = Math.max(0, RENDER_CAP - out.length)
    const stride = nonHits.length / budget
    for (let i = 0; i < budget; i++) {
      out.push(nonHits[Math.floor(i * stride)])
    }
    return out
  }, [points, hitIds])
  const useGlow = renderPoints.length <= GLOW_CUTOFF

  // ── Render loop ────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let raf = 0
    let pulse = 0
    let lastW = 0
    let lastH = 0

    function w2c(wx: number, wy: number): [number, number] {
      const P = 70
      const W = canvas!.width
      const H = canvas!.height
      const fullRx = bounds.maxX - bounds.minX || 1
      const fullRy = bounds.maxY - bounds.minY || 1
      const rx = fullRx / zoom
      const ry = fullRy / zoom
      const cx = (bounds.maxX + bounds.minX) / 2 + pan.x * fullRx
      const cy = (bounds.maxY + bounds.minY) / 2 + pan.y * fullRy
      const x0 = cx - rx / 2
      const y0 = cy - ry / 2
      return [
        P + ((wx - x0) / rx) * (W - 2 * P),
        H - P - ((wy - y0) / ry) * (H - 2 * P),
      ]
    }

    function frame() {
      // Resize if needed
      const rect = container!.getBoundingClientRect()
      if (rect.width !== lastW || rect.height !== lastH) {
        canvas!.width = rect.width
        canvas!.height = rect.height
        lastW = rect.width
        lastH = rect.height
      }
      const W = canvas!.width
      const H = canvas!.height

      // Background + grid
      ctx!.clearRect(0, 0, W, H)
      ctx!.fillStyle = '#07070f'
      ctx!.fillRect(0, 0, W, H)
      ctx!.strokeStyle = '#0e0e1e'
      ctx!.lineWidth = 1
      for (let i = 0; i <= 8; i++) {
        const tx = 70 + (i / 8) * (W - 140)
        const ty = 70 + (i / 8) * (H - 140)
        ctx!.beginPath()
        ctx!.moveTo(tx, 70)
        ctx!.lineTo(tx, H - 70)
        ctx!.stroke()
        ctx!.beginPath()
        ctx!.moveTo(70, ty)
        ctx!.lineTo(W - 70, ty)
        ctx!.stroke()
      }

      // Axis labels
      ctx!.fillStyle = '#1a1a38'
      ctx!.font = '11px Fira Code, monospace'
      ctx!.fillText('PC₁ →', W / 2 - 40, H - 18)
      ctx!.save()
      ctx!.translate(18, H / 2 + 50)
      ctx!.rotate(-Math.PI / 2)
      ctx!.fillText('PC₂ →', 0, 0)
      ctx!.restore()
      ctx!.fillStyle = '#151530'
      ctx!.font = '12px Fira Code, monospace'
      ctx!.fillText('2D PCA Projection  ·  Semantic Space', 80, 28)

      // Lines from query to hits
      if (queryPt && hitIds.size > 0) {
        const [qx, qy] = w2c(queryPt.x, queryPt.y)
        for (const pt of renderPoints) {
          if (!hitIds.has(pt.item.id)) continue
          const [px, py] = w2c(pt.x, pt.y)
          ctx!.strokeStyle = 'rgba(108,99,255,0.18)'
          ctx!.lineWidth = 1
          ctx!.setLineDash([4, 4])
          ctx!.beginPath()
          ctx!.moveTo(qx, qy)
          ctx!.lineTo(px, py)
          ctx!.stroke()
          ctx!.setLineDash([])
        }
      }

      // Dots
      for (const pt of renderPoints) {
        const [cx, cy] = w2c(pt.x, pt.y)
        const col = COL[pt.item.category] ?? DEFAULT_COL
        const isHit = hitIds.has(pt.item.id)
        const r = isHit ? 10 : useGlow ? 7 : 3
        if (isHit) {
          const pr = r + 7 + Math.sin(pulse) * 3.5
          ctx!.beginPath()
          ctx!.arc(cx, cy, pr, 0, 2 * Math.PI)
          ctx!.strokeStyle = col + '55'
          ctx!.lineWidth = 1.5
          ctx!.stroke()
        }
        if (useGlow) {
          const grd = ctx!.createRadialGradient(cx, cy, 0, cx, cy, r * 3)
          grd.addColorStop(0, col + (isHit ? 'bb' : '88'))
          grd.addColorStop(1, 'transparent')
          ctx!.beginPath()
          ctx!.arc(cx, cy, r * 3, 0, 2 * Math.PI)
          ctx!.fillStyle = grd
          ctx!.fill()
        }
        ctx!.beginPath()
        ctx!.arc(cx, cy, r, 0, 2 * Math.PI)
        ctx!.fillStyle = col
        ctx!.fill()
        if (hover && hover.item.id === pt.item.id) {
          ctx!.beginPath()
          ctx!.arc(cx, cy, r + 5, 0, 2 * Math.PI)
          ctx!.strokeStyle = col
          ctx!.lineWidth = 1.5
          ctx!.stroke()
        }
      }

      // Query star
      if (queryPt) {
        const [qx, qy] = w2c(queryPt.x, queryPt.y)
        ctx!.save()
        ctx!.translate(qx, qy)
        ctx!.shadowColor = '#fff'
        ctx!.shadowBlur = 18
        ctx!.beginPath()
        for (let i = 0; i < 10; i++) {
          const a = (i * Math.PI) / 5 - Math.PI / 2
          const rr = i % 2 === 0 ? 13 : 5
          const x = Math.cos(a) * rr
          const y = Math.sin(a) * rr
          if (i === 0) ctx!.moveTo(x, y)
          else ctx!.lineTo(x, y)
        }
        ctx!.closePath()
        ctx!.fillStyle = '#fff'
        ctx!.fill()
        ctx!.shadowBlur = 0
        ctx!.restore()
        ctx!.fillStyle = '#aaaacc'
        ctx!.font = '10px Fira Code, monospace'
        ctx!.fillText('query', qx + 16, qy + 4)
      }

      // Empty-state message
      if (!points.length) {
        ctx!.fillStyle = '#1a1a38'
        ctx!.font = '13px Fira Code, monospace'
        ctx!.textAlign = 'center'
        ctx!.fillText('Connecting to VectorDB…', W / 2, H / 2)
        ctx!.textAlign = 'left'
      }

      // Hint when a sample is being rendered.
      if (points.length > RENDER_CAP) {
        ctx!.fillStyle = '#1a1a38'
        ctx!.font = '10px Fira Code, monospace'
        ctx!.fillText(
          `showing ${renderPoints.length} of ${points.length} dots`,
          80,
          46
        )
      }

      pulse += 0.05
      raf = requestAnimationFrame(frame)
    }

    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [points, renderPoints, useGlow, bounds, hitIds, queryPt, hover, zoom, pan])

  // ── Mouse → hover ──────────────────────────────────────────
  function handleMove(e: React.MouseEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const mx = e.clientX - rect.left
    const my = e.clientY - rect.top
    let best = 18
    let found: VectorItem | null = null
    const P = 70
    const fullRx = bounds.maxX - bounds.minX || 1
    const fullRy = bounds.maxY - bounds.minY || 1
    const rx = fullRx / zoom
    const ry = fullRy / zoom
    const ccx = (bounds.maxX + bounds.minX) / 2 + pan.x * fullRx
    const ccy = (bounds.maxY + bounds.minY) / 2 + pan.y * fullRy
    const x0 = ccx - rx / 2
    const y0 = ccy - ry / 2
    for (const pt of renderPoints) {
      const cx = P + ((pt.x - x0) / rx) * (canvas.width - 2 * P)
      const cy =
        canvas.height -
        P -
        ((pt.y - y0) / ry) * (canvas.height - 2 * P)
      const d = Math.hypot(mx - cx, my - cy)
      if (d < best) {
        best = d
        found = pt.item
      }
    }
    if (found) {
      setHover({ item: found, clientX: e.clientX, clientY: e.clientY })
    } else if (hover) {
      setHover(null)
    }
  }

  function handleWheel(e: React.WheelEvent<HTMLCanvasElement>) {
    e.preventDefault()
    zoomBy(e.deltaY < 0 ? 1.15 : 1 / 1.15)
  }

  function handleMouseDown(e: React.MouseEvent<HTMLCanvasElement>) {
    if (e.button !== 0) return
    drag.current = {
      startX: e.clientX,
      startY: e.clientY,
      basePan: pan,
    }
  }

  function handleMouseMoveAll(e: React.MouseEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current
    if (drag.current && canvas) {
      const dx = e.clientX - drag.current.startX
      const dy = e.clientY - drag.current.startY
      setPan({
        x: drag.current.basePan.x - dx / canvas.width / zoom,
        y: drag.current.basePan.y + dy / canvas.height / zoom,
      })
      setHover(null)
      return
    }
    handleMove(e)
  }

  function handleMouseUpOrLeave() {
    drag.current = null
  }

  return (
    <div ref={containerRef} className="flex-1 relative overflow-hidden">
      <canvas
        ref={canvasRef}
        className="block w-full h-full cursor-grab active:cursor-grabbing"
        onMouseMove={handleMouseMoveAll}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUpOrLeave}
        onMouseLeave={() => {
          handleMouseUpOrLeave()
          setHover(null)
        }}
        onWheel={handleWheel}
      />
      <div className="absolute top-3 right-3 flex flex-col gap-1.5 z-10">
        <button
          type="button"
          onClick={() => zoomBy(1.4)}
          className="w-7 h-7 rounded-md border border-border bg-card/90 text-text text-sm leading-none cursor-pointer hover:border-accent transition-colors"
          aria-label="zoom in"
        >
          +
        </button>
        <button
          type="button"
          onClick={() => zoomBy(1 / 1.4)}
          className="w-7 h-7 rounded-md border border-border bg-card/90 text-text text-sm leading-none cursor-pointer hover:border-accent transition-colors"
          aria-label="zoom out"
        >
          −
        </button>
        <button
          type="button"
          onClick={resetView}
          className="w-7 h-7 rounded-md border border-border bg-card/90 text-muted text-[9px] leading-none cursor-pointer hover:border-accent hover:text-text transition-colors"
          aria-label="reset view"
          title="reset view"
        >
          ⤢
        </button>
        <div className="text-[9px] text-muted text-center mt-1">{zoom.toFixed(2)}×</div>
      </div>
      {hover && (
        <div
          className="fixed bg-card border border-border rounded-md px-2.5 py-1.5 text-[11px] pointer-events-none max-w-[220px] z-50 leading-relaxed"
          style={{
            left: hover.clientX + 14,
            top: hover.clientY - 8,
          }}
        >
          <span
            style={{
              color: COL[hover.item.category] ?? DEFAULT_COL,
            }}
          >
            [{hover.item.category}]
          </span>
          <br />
          {hover.item.metadata}
        </div>
      )}
    </div>
  )
}
