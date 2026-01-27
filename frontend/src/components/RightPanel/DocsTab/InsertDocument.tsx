import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../../../api/client'
import { textToEmbedding } from '../../../utils/textToEmbedding'
import { Button, TextInput, Textarea } from '../../ui/primitives'

export function InsertDocument() {
  const [title, setTitle] = useState('')
  const [text, setText] = useState('')
  const qc = useQueryClient()

  const insert = useMutation({
    mutationFn: async () => {
      const t = title.trim()
      const txt = text.trim()
      // Real RAG insert: 768D embedding via Ollama, into DocumentDB.
      const result = await api.docInsert({ title: t, text: txt })
      if (result.error) return result
      // Visualizer companion: a forged 16D vector so the scatter plot
      // shows a new green "doc" dot. Independent store from DocumentDB —
      // purely cosmetic for the demo map.
      try {
        await api.insertVector({
          metadata: t,
          category: 'doc',
          embedding: textToEmbedding(t + ' ' + txt),
        })
      } catch {
        // Cosmetic only — don't fail the user's insert if this trips.
      }
      return result
    },
    onSuccess: (data) => {
      if (data.error) return
      setTitle('')
      setText('')
      qc.invalidateQueries({ queryKey: ['docs'] })
      qc.invalidateQueries({ queryKey: ['status'] })
      qc.invalidateQueries({ queryKey: ['items'] })
      qc.invalidateQueries({ queryKey: ['stats'] })
      qc.invalidateQueries({ queryKey: ['hnsw'] })
    },
  })

  const canSubmit = title.trim() && text.trim() && !insert.isPending
  const result = insert.data

  return (
    <div className="flex flex-col gap-2">
      <TextInput
        placeholder="Document title / topic…"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />
      <Textarea
        placeholder={`Paste your notes, textbook excerpt, lecture content…\n\nLong text is automatically split into overlapping chunks and each chunk gets its own real embedding via Ollama's nomic-embed-text model.`}
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <Button
        variant="green"
        onClick={() => insert.mutate()}
        disabled={!canSubmit}
      >
        {insert.isPending ? 'Embedding…' : '⚡ EMBED & INSERT'}
      </Button>
      <div className="text-[11px] min-h-[16px]">
        {insert.isPending && (
          <span className="text-muted">
            Calling Ollama nomic-embed-text…
          </span>
        )}
        {!insert.isPending && result && !result.error && (
          <span className="text-green">
            ✓ Inserted {result.chunks} chunk(s) · {result.dims}D embeddings
          </span>
        )}
        {!insert.isPending && result?.error && (
          <span className="text-red">✗ {result.error}</span>
        )}
        {!insert.isPending && insert.isError && (
          <span className="text-red">✗ Server unreachable</span>
        )}
        {!insert.isPending && !result && !insert.isError && title && !text && (
          <span className="text-muted">⚠ Need both a title and text.</span>
        )}
      </div>
    </div>
  )
}
