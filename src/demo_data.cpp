#include "vectordb/demo_data.h"

#include "vectordb/distance.h"
#include "vectordb/vectordb.h"

#include <array>
#include <string>
#include <vector>

namespace vdb {

namespace {

using Pattern16 = std::array<float, 16>;

// Expand a 16-value "semantic signature" to 128D by repeating each value 8x.
// Preserves category structure (CS: 0-31, Math: 32-63, Food: 64-95, Sport: 96-127)
// so PCA visualization still groups cleanly.
std::vector<float> expand(const Pattern16& p) {
    std::vector<float> out(128);
    for (int i = 0; i < 16; ++i)
        for (int r = 0; r < 8; ++r)
            out[i * 8 + r] = p[i];
    return out;
}

struct Entry {
    const char*   meta;
    const char*   cat;
    Pattern16     p;
};

const Entry kEntries[] = {
    {"Linked List: nodes connected by pointers", "cs",
     {0.90f,0.85f,0.72f,0.68f,0.12f,0.08f,0.15f,0.10f,0.05f,0.08f,0.06f,0.09f,0.07f,0.11f,0.08f,0.06f}},
    {"Binary Search Tree: O(log n) search and insert", "cs",
     {0.88f,0.82f,0.78f,0.74f,0.15f,0.10f,0.08f,0.12f,0.06f,0.07f,0.08f,0.05f,0.09f,0.06f,0.07f,0.10f}},
    {"Dynamic Programming: memoization overlapping subproblems", "cs",
     {0.82f,0.76f,0.88f,0.80f,0.20f,0.18f,0.12f,0.09f,0.07f,0.06f,0.08f,0.07f,0.08f,0.09f,0.06f,0.07f}},
    {"Graph BFS and DFS: breadth and depth first traversal", "cs",
     {0.85f,0.80f,0.75f,0.82f,0.18f,0.14f,0.10f,0.08f,0.06f,0.09f,0.07f,0.06f,0.10f,0.08f,0.09f,0.07f}},
    {"Hash Table: O(1) lookup with collision chaining", "cs",
     {0.87f,0.78f,0.70f,0.76f,0.13f,0.11f,0.09f,0.14f,0.08f,0.07f,0.06f,0.08f,0.07f,0.10f,0.08f,0.09f}},
    {"Calculus: derivatives integrals and limits", "math",
     {0.12f,0.15f,0.18f,0.10f,0.91f,0.86f,0.78f,0.72f,0.08f,0.06f,0.07f,0.09f,0.07f,0.08f,0.06f,0.10f}},
    {"Linear Algebra: matrices eigenvalues eigenvectors", "math",
     {0.20f,0.18f,0.15f,0.12f,0.88f,0.90f,0.82f,0.76f,0.09f,0.07f,0.08f,0.06f,0.10f,0.07f,0.08f,0.09f}},
    {"Probability: distributions random variables Bayes theorem", "math",
     {0.15f,0.12f,0.20f,0.18f,0.84f,0.80f,0.88f,0.82f,0.07f,0.08f,0.06f,0.10f,0.09f,0.06f,0.09f,0.08f}},
    {"Number Theory: primes modular arithmetic RSA cryptography", "math",
     {0.22f,0.16f,0.14f,0.20f,0.80f,0.85f,0.76f,0.90f,0.08f,0.09f,0.07f,0.06f,0.08f,0.10f,0.07f,0.06f}},
    {"Combinatorics: permutations combinations generating functions", "math",
     {0.18f,0.20f,0.16f,0.14f,0.86f,0.78f,0.84f,0.80f,0.06f,0.07f,0.09f,0.08f,0.06f,0.09f,0.10f,0.07f}},
    {"Neapolitan Pizza: wood-fired dough San Marzano tomatoes", "food",
     {0.08f,0.06f,0.09f,0.07f,0.07f,0.08f,0.06f,0.09f,0.90f,0.86f,0.78f,0.72f,0.08f,0.06f,0.09f,0.07f}},
    {"Sushi: vinegared rice raw fish and nori rolls", "food",
     {0.06f,0.08f,0.07f,0.09f,0.09f,0.06f,0.08f,0.07f,0.86f,0.90f,0.82f,0.76f,0.07f,0.09f,0.06f,0.08f}},
    {"Ramen: noodle soup with chashu pork and soft-boiled eggs", "food",
     {0.09f,0.07f,0.06f,0.08f,0.08f,0.09f,0.07f,0.06f,0.82f,0.78f,0.90f,0.84f,0.09f,0.07f,0.08f,0.06f}},
    {"Tacos: corn tortillas with carnitas salsa and cilantro", "food",
     {0.07f,0.09f,0.08f,0.06f,0.06f,0.07f,0.09f,0.08f,0.78f,0.82f,0.86f,0.90f,0.06f,0.08f,0.07f,0.09f}},
    {"Croissant: laminated pastry with buttery flaky layers", "food",
     {0.06f,0.07f,0.10f,0.09f,0.10f,0.06f,0.07f,0.10f,0.85f,0.80f,0.76f,0.82f,0.09f,0.07f,0.10f,0.06f}},
    {"Basketball: fast-paced shooting dribbling slam dunks", "sports",
     {0.09f,0.07f,0.08f,0.10f,0.08f,0.09f,0.07f,0.06f,0.08f,0.07f,0.09f,0.06f,0.91f,0.85f,0.78f,0.72f}},
    {"Football: tackles touchdowns field goals and strategy", "sports",
     {0.07f,0.09f,0.06f,0.08f,0.09f,0.07f,0.10f,0.08f,0.07f,0.09f,0.08f,0.07f,0.87f,0.89f,0.82f,0.76f}},
    {"Tennis: racket volleys groundstrokes and Wimbledon serves", "sports",
     {0.08f,0.06f,0.09f,0.07f,0.07f,0.08f,0.06f,0.09f,0.09f,0.06f,0.07f,0.08f,0.83f,0.80f,0.88f,0.82f}},
    {"Chess: openings endgames tactics strategic board game", "sports",
     {0.25f,0.20f,0.22f,0.18f,0.22f,0.18f,0.20f,0.15f,0.06f,0.08f,0.07f,0.09f,0.80f,0.84f,0.78f,0.90f}},
    {"Swimming: butterfly freestyle backstroke Olympic competition", "sports",
     {0.06f,0.08f,0.07f,0.09f,0.08f,0.06f,0.09f,0.07f,0.10f,0.08f,0.06f,0.07f,0.85f,0.82f,0.86f,0.80f}},
};

}  // namespace

void loadDemo(VectorDB& db) {
    auto dist = getDistFn("cosine");
    for (const auto& e : kEntries) {
        db.insert(e.meta, e.cat, expand(e.p), dist);
    }
}

}  // namespace vdb
