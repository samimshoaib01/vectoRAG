// Keyword-bucket embedder. Maps free-text → 128D vector by scoring four
// category buckets (CS / Math / Food / Sports). Each category fills a
// contiguous 32-dim band; the rest stays at low baseline noise.

export const DIMS = 128
const BAND = DIMS / 4  // 32 dims per category

const KW: Record<string, string[]> = {
  cs: [
    'algorithm', 'data', 'tree', 'graph', 'array', 'linked', 'hash', 'stack',
    'queue', 'sort', 'binary', 'dynamic', 'programming', 'recursion',
    'complexity', 'pointer', 'node', 'search', 'insert', 'bfs', 'dfs',
    'heap', 'trie',
  ],
  math: [
    'calculus', 'matrix', 'probability', 'theorem', 'integral', 'derivative',
    'linear', 'algebra', 'equation', 'function', 'prime', 'modular',
    'combinatorics', 'permutation', 'eigenvalue', 'statistics', 'proof',
  ],
  food: [
    'food', 'pizza', 'sushi', 'ramen', 'pasta', 'recipe', 'cook', 'eat',
    'restaurant', 'dish', 'ingredient', 'flavor', 'spice', 'noodle', 'bread',
    'croissant', 'taco', 'fish', 'rice', 'soup',
    // South Asian / Indian
    'samosa', 'biryani', 'dosa', 'idli', 'naan', 'paratha', 'roti', 'paneer',
    'tandoori', 'masala', 'curry', 'dal', 'chutney', 'pakora', 'jalebi',
    'gulab', 'lassi', 'chai', 'kebab', 'momo', 'chaat',
    // Common additions
    'burger', 'sandwich', 'salad', 'cake', 'cheese', 'chicken', 'beef',
    'vegetable', 'fruit', 'dessert', 'snack', 'meal', 'breakfast', 'dinner',
  ],
  sports: [
    'sport', 'basketball', 'football', 'tennis', 'chess', 'swim', 'game',
    'play', 'score', 'team', 'athlete', 'competition', 'match', 'tournament',
    'olympic', 'dribble', 'tackle', 'serve',
    // South Asian / common
    'cricket', 'kabaddi', 'hockey', 'badminton', 'wrestling', 'boxing',
    'volleyball', 'baseball', 'rugby', 'golf', 'marathon', 'racing',
    'batsman', 'bowler', 'wicket', 'goal', 'pitch',
  ],
}

const BUCKET_OFFSET: Record<string, number> = {
  cs: 0 * BAND,
  math: 1 * BAND,
  food: 2 * BAND,
  sports: 3 * BAND,
}

export function textToEmbedding(text: string): number[] {
  const tokens = text.toLowerCase().split(/\s+/).filter(Boolean)
  const scores: Record<string, number> = { cs: 0, math: 0, food: 0, sports: 0 }

  for (const w of tokens) {
    for (const [cat, kws] of Object.entries(KW)) {
      for (const kw of kws) {
        if (w.includes(kw) || kw.startsWith(w)) {
          scores[cat] += 0.35
          break
        }
      }
    }
  }

  const maxScore = Math.max(...Object.values(scores), 0.01)
  const norm = (v: number) => Math.min((v / maxScore) * 0.88, 0.94)
  const jitter = () => (Math.random() - 0.5) * 0.04

  const emb = new Array<number>(DIMS).fill(0.08)
  for (const [cat, offset] of Object.entries(BUCKET_OFFSET)) {
    const s = scores[cat]
    if (s < 0.01) continue
    const base = norm(s)
    for (let i = 0; i < BAND; i++) {
      const decay = 1 - (i / BAND) * 0.18
      emb[offset + i] = Math.max(0.05, base * decay + jitter())
    }
  }
  return emb
}
