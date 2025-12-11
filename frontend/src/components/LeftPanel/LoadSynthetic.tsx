import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../../api/client'
import { Button, Select } from '../ui/primitives'

const PRESETS = [100, 1000, 5000, 10000]

export function LoadSynthetic() {
  const [count, setCount] = useState(5000)
  const qc = useQueryClient()

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['items'] })
    qc.invalidateQueries({ queryKey: ['stats'] })
    qc.invalidateQueries({ queryKey: ['hnsw'] })
  }

  const load = useMutation({
    mutationFn: () => api.loadSynthetic(count),
    onSuccess: invalidate,
  })

  const reset = useMutation({
    mutationFn: () => api.resetVectors(),
    onSuccess: invalidate,
  })

  const busy = load.isPending || reset.isPending
  const result = load.data

  return (
    <div className="flex flex-col gap-1.5">
      <Select
        value={count}
        onChange={(e) => setCount(parseInt(e.target.value, 10))}
        disabled={busy}
      >
        {PRESETS.map((n) => (
          <option key={n} value={n}>
            +{n.toLocaleString()} vectors
          </option>
        ))}
      </Select>
      <Button
        variant="secondary"
        onClick={() => load.mutate()}
        disabled={busy}
      >
        {load.isPending ? 'Inserting…' : '🚀 LOAD SYNTHETIC'}
      </Button>
      <Button
        variant="danger"
        onClick={() => reset.mutate()}
        disabled={busy}
      >
        {reset.isPending ? 'Resetting…' : '↺ RESET TO 20'}
      </Button>
      <div className="text-[10px] min-h-[14px] text-muted">
        {result && !load.isPending && (
          <span className="text-green">
            ✓ +{result.inserted.toLocaleString()} in {result.elapsedMs} ms
            · total {result.totalCount.toLocaleString()}
          </span>
        )}
        {reset.data && !reset.isPending && (
          <span className="text-green">
            ✓ reset to {reset.data.count} demo vectors
          </span>
        )}
        {(load.isError || reset.isError) && !busy && (
          <span className="text-red">✗ failed — backend running?</span>
        )}
        {!result && !load.isError && !reset.data && (
          <span>For benchmarks at scale (HNSW &gt; brute force)</span>
        )}
      </div>
    </div>
  )
}
