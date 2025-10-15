#pragma once

#include <mutex>
#include <string>
#include <unordered_map>
#include <utility>
#include <vector>

#include "vectordb/bruteforce.h"
#include "vectordb/hnsw.h"

namespace vdb {

struct DocItem {
    int id;
    std::string title;
    std::string text;
    std::vector<float> emb;
};

// HNSW-only index for real Ollama embeddings (dim determined at runtime).
// Falls back to brute force when the store is tiny — HNSW quality is poor below ~10 nodes.
class DocumentDB {
public:
    DocumentDB();

    int insert(const std::string& title, const std::string& text,
               const std::vector<float>& emb);
    // Like insert() but uses a caller-supplied id (for Postgres hydration on startup).
    int insertWithId(int id, const std::string& title, const std::string& text,
                     const std::vector<float>& emb);
    std::vector<std::pair<float, DocItem>> search(
        const std::vector<float>& q, int k, float maxDist = 0.7f);
    bool remove(int id);
    std::vector<DocItem> all();
    size_t size();
    int getDims();

private:
    std::unordered_map<int, DocItem> store_;
    HNSW       hnsw_;
    BruteForce bf_;
    std::mutex mu_;
    int nextId_ = 1;
    int dims_   = 0;
};

}  // namespace vdb
