import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { api } from '../../../api/client'
import type { RAGContext, RAGResponse } from '../../../types'
import { Button, Section, Select, Textarea } from '../../ui/primitives'
import { ChatAnswer } from './ChatAnswer'

interface Props {
  onContexts?: (contexts: RAGContext[]) => void
}

export function RAGTab({ onContexts }: Props) {
  const [question, setQuestion] = useState('')
  const [k, setK] = useState(3)
  // Single-shot Q&A (matches original): only show the latest answer.
  const [last, setLast] = useState<{ q: string; a: RAGResponse } | null>(null)
  const [shownQ, setShownQ] = useState<string | null>(null)

  const ask = useMutation({
    mutationFn: (payload: { question: string; k: number }) =>
      api.docAsk(payload),
    onSuccess: (data, vars) => {
      setLast({ q: vars.question, a: data })
      setQuestion('')
      if (!data.error) onContexts?.(data.contexts)
    },
  })

  function submit() {
    const q = question.trim()
    if (!q || ask.isPending) return
    setShownQ(q)
    setLast(null)
    ask.mutate({ question: q, k })
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-5 chat-scroll">
      <Section title="Ask a Question">
        <div className="flex flex-col gap-2">
          <Textarea
            rows={3}
            placeholder={`What is dynamic programming?\nExplain the main idea of HNSW.\nHow does the recipe differ from…`}
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) submit()
            }}
          />
          <div className="flex gap-1.5">
            <Select
              value={k}
              onChange={(e) => setK(parseInt(e.target.value, 10))}
              className="!w-auto shrink-0"
            >
              <option value={2}>Top 2</option>
              <option value={3}>Top 3</option>
              <option value={5}>Top 5</option>
            </Select>
            <Button
              variant="green"
              onClick={submit}
              disabled={!question.trim() || ask.isPending}
              className="flex-1"
            >
              {ask.isPending ? 'Thinking…' : '🤖 ASK AI'}
            </Button>
          </div>
          <div className="text-[10px] text-muted leading-relaxed">
            Uses your inserted documents as context. Answers come from the
            local LLM.
          </div>
        </div>
      </Section>

      <Section title="Conversation">
        <div className="flex flex-col gap-3">
          {!shownQ && !ask.isPending && (
            <div className="text-[11px] text-muted">
              Ask a question about your inserted documents…
            </div>
          )}
          {shownQ && (
            <div className="bg-accent/10 border border-accent/25 rounded-lg px-3 py-2.5 text-xs leading-snug">
              {shownQ}
            </div>
          )}
          {ask.isPending && (
            <div className="flex items-center gap-2 text-[11px] text-muted">
              <span className="inline-block w-3.5 h-3.5 border-2 border-border border-t-accent rounded-full animate-spin" />
              Retrieving context & generating answer…
            </div>
          )}
          {ask.isError && !ask.isPending && (
            <div className="bg-bg border border-border rounded-lg p-3 text-xs text-red">
              Server error — is the backend running?
            </div>
          )}
          {last?.a.error && (
            <div className="bg-bg border border-border rounded-lg p-3 text-xs text-red">
              {last.a.error}
            </div>
          )}
          {last?.a && !last.a.error && <ChatAnswer data={last.a} />}
        </div>
      </Section>
    </div>
  )
}
