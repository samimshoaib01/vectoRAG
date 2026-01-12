import { useEffect, useRef } from 'react'

const DIMS = 128
const BAND = DIMS / 4
const CAT_COLORS = ['#00d9ff', '#b388ff', '#ffb74d', '#69f0ae']
const DIM_COL = Array.from({ length: DIMS }, (_, i) => CAT_COLORS[Math.floor(i / BAND)])
const GROUPS: [string, number, string][] = [
  ['CS', 0 * BAND, CAT_COLORS[0]],
  ['MATH', 1 * BAND, CAT_COLORS[1]],
  ['FOOD', 2 * BAND, CAT_COLORS[2]],
  ['SPORT', 3 * BAND, CAT_COLORS[3]],
]
const HEIGHT = 76

export function VectorChart({ embedding }: { embedding: number[] | null }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const wrap = wrapRef.current
    if (!canvas || !wrap) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const W = wrap.clientWidth
    canvas.width = W
    canvas.height = HEIGHT
    ctx.clearRect(0, 0, W, HEIGHT)
    ctx.fillStyle = '#07070f'
    ctx.fillRect(0, 0, W, HEIGHT)

    const bw = (W - 4) / DIMS
    if (embedding) {
      for (let i = 0; i < DIMS; i++) {
        const h = embedding[i] * 58
        const x = 2 + i * bw
        const col = DIM_COL[i]
        ctx.shadowColor = col
        ctx.shadowBlur = 5
        ctx.fillStyle = col + 'aa'
        ctx.fillRect(x + 1, 63 - h, bw - 2, h)
      }
      ctx.shadowBlur = 0
    }
    ctx.font = '8px monospace'
    ctx.textAlign = 'center'
    for (const [lbl, gi, col] of GROUPS) {
      ctx.fillStyle = col + '77'
      ctx.fillText(lbl, 2 + (gi + BAND / 2) * bw, 74)
    }
    ctx.textAlign = 'left'
  }, [embedding])

  return (
    <div ref={wrapRef} className="w-full">
      <canvas
        ref={canvasRef}
        height={HEIGHT}
        className="block w-full bg-bg rounded-md"
      />
    </div>
  )
}
