// 2D PCA via two rounds of power iteration on the covariance matrix.
// Ported from the original index.html. Pure function — no canvas, no DOM.

export function pca2D(embeddings: number[][]): [number, number][] {
  const n = embeddings.length
  if (n < 2) return embeddings.map(() => [0, 0])

  const d = embeddings[0].length
  const mean = new Array<number>(d).fill(0)
  for (const e of embeddings) for (let i = 0; i < d; i++) mean[i] += e[i] / n
  const X = embeddings.map((e) => e.map((v, i) => v - mean[i]))

  function powerIter(exclude: number[] | null): number[] {
    let v = new Array<number>(d).fill(0).map(() => Math.random() - 0.5)
    if (exclude) {
      const dot = v.reduce((s, vi, i) => s + vi * exclude[i], 0)
      v = v.map((vi, i) => vi - dot * exclude[i])
    }
    let norm = Math.sqrt(v.reduce((s, vi) => s + vi * vi, 0))
    v = v.map((vi) => vi / norm)

    for (let it = 0; it < 200; it++) {
      const Xv = X.map((row) => row.reduce((s, xij, j) => s + xij * v[j], 0))
      const nv = new Array<number>(d).fill(0)
      for (let k = 0; k < n; k++) for (let j = 0; j < d; j++) nv[j] += X[k][j] * Xv[k]
      if (exclude) {
        const dot = nv.reduce((s, vi, i) => s + vi * exclude[i], 0)
        for (let i = 0; i < d; i++) nv[i] -= dot * exclude[i]
      }
      norm = Math.sqrt(nv.reduce((s, vi) => s + vi * vi, 0))
      if (norm < 1e-10) break
      const prev = v.slice()
      v = nv.map((vi) => vi / norm)
      if (v.reduce((s, vi, i) => s + (vi - prev[i]) ** 2, 0) < 1e-12) break
    }
    return v
  }

  const pc1 = powerIter(null)
  const pc2 = powerIter(pc1)
  return X.map((x) => [
    x.reduce((s, vi, i) => s + vi * pc1[i], 0),
    x.reduce((s, vi, i) => s + vi * pc2[i], 0),
  ])
}
