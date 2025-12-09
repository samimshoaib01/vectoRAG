import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../../api/client'
import { textToEmbedding } from '../../utils/textToEmbedding'
import { Button, Select, TextInput } from '../ui/primitives'

const CATEGORIES: { value: string; label: string }[] = [
  { value: 'cs', label: 'CS / Algorithms' },
  { value: 'math', label: 'Mathematics' },
  { value: 'food', label: 'Food & Cooking' },
  { value: 'sports', label: 'Sports & Games' },
]

export function InsertVector() {
  const [meta, setMeta] = useState('')
  const [cat, setCat] = useState('cs')
  const qc = useQueryClient()

  const insert = useMutation({
    mutationFn: (payload: { metadata: string; category: string }) =>
      api.insertVector({
        ...payload,
        embedding: textToEmbedding(payload.metadata + ' ' + payload.category),
      }),
    onSuccess: () => {
      setMeta('')
      qc.invalidateQueries({ queryKey: ['items'] })
      qc.invalidateQueries({ queryKey: ['stats'] })
      qc.invalidateQueries({ queryKey: ['hnsw'] })
    },
  })

  return (
    <div className="flex flex-col gap-1.5">
      <TextInput
        placeholder="Description…"
        value={meta}
        onChange={(e) => setMeta(e.target.value)}
      />
      <Select value={cat} onChange={(e) => setCat(e.target.value)}>
        {CATEGORIES.map((c) => (
          <option key={c.value} value={c.value}>
            {c.label}
          </option>
        ))}
      </Select>
      <Button
        variant="secondary"
        onClick={() => meta.trim() && insert.mutate({ metadata: meta.trim(), category: cat })}
        disabled={insert.isPending || !meta.trim()}
      >
        {insert.isPending ? 'inserting…' : '+ INSERT'}
      </Button>
      {insert.isError && (
        <div className="text-[10px] text-red">
          insert failed — is the backend running?
        </div>
      )}
    </div>
  )
}
