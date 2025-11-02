#pragma once

#include <string>
#include <vector>

namespace vdb {

// PostgreSQL-backed persistence for document chunks.
// Embeddings are stored as comma-separated floats (TEXT column).
// On startup, call loadAll() to rebuild the in-memory HNSW index.
class Storage {
public:
    explicit Storage(const std::string& connStr);
    ~Storage();

    bool isConnected() const;
    void createSchema();

    struct ChunkRow {
        int id;
        std::string title;
        std::string text;
        std::vector<float> emb;
    };

    // Insert a chunk; returns the Postgres-assigned id, or -1 on error.
    int saveChunk(const std::string& title, const std::string& text,
                  const std::vector<float>& emb);

    bool deleteChunk(int id);

    std::vector<ChunkRow> loadAll();

private:
    void* conn_ = nullptr;  // PGconn*

    static std::string serializeEmb(const std::vector<float>& emb);
    static std::vector<float> deserializeEmb(const std::string& s);
};

}  // namespace vdb
