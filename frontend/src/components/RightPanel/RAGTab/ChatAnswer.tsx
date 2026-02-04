import { useEffect, useRef, useState } from 'react'
import type { RAGResponse } from '../../../types'

export function ChatAnswer({ data }: { data: RAGResponse }) {
  const [shown, setShown] = useState('')
  const [done, setDone] = useState(false)
  const [openCtx, setOpenCtx] = useState<number | null>(null)
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setShown('')
    setDone(false)
    let i = 0
    const full = data.answer
    const timer = setInterval(() => {
      if (i >= full.length) {
        clearInterval(timer)
        setDone(true)
        return
      }
      i = Math.min(i + 3, full.length)
      setShown(full.slice(0, i))
      // auto-scroll
      if (wrapRef.current) {
        const parent = wrapRef.current.closest('.chat-scroll') as HTMLElement | null
        if (parent) parent.scrollTop = parent.scrollHeight
      }
    }, 18)
    return () => clearInterval(timer)
  }, [data.answer])

  return (
    <div
      ref={wrapRef}
      className="bg-bg border border-border rounded-lg p-3 animate-[fadeUp_0.25s_ease]"
    >
      <div className="text-[9px] tracking-[2px] text-green mb-1.5">
        🤖 {data.model || 'llm'}
      </div>
      <div className="text-xs leading-loose whitespace-pre-wrap">
        {shown}
        {!done && <span className="animate-pulse">▋</span>}
      </div>
      {data.contexts.length > 0 && (
        <div className="mt-2.5 border-t border-border pt-2">
          <div className="text-[9px] tracking-[1px] text-muted mb-1.5">
            RETRIEVED CONTEXT ({data.contexts.length} chunks)
          </div>
          {data.contexts.map((c, i) => (
            <div key={i} className="inline-block">
              <button
                type="button"
                onClick={() => setOpenCtx(openCtx === i ? null : i)}
                className="text-[9px] px-1.5 py-0.5 rounded-xl m-0.5 bg-accent/10 border border-accent/20 text-accent cursor-pointer hover:bg-accent/20 transition-colors"
              >
                #{i + 1} {c.title} · {c.distance.toFixed(3)}
              </button>
              {openCtx === i && (
                <div className="text-[10px] text-muted leading-relaxed mt-1.5 p-2 bg-[#0a0a18] rounded-md whitespace-pre-wrap">
                  {c.text}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
