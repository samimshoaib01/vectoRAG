#pragma once

#include <mutex>
#include <string>
#include <unordered_map>
#include <vector>

#include "vectordb/bruteforce.h"
#include "vectordb/distance.h"
#include "vectordb/hnsw.h"
#include "vectordb/kdtree.h"
#include "vectordb/types.h"

namespace vdb {

// Unified façade over BruteForce + KDTree + HNSW for the demo (small-dim) index.
// All operations are mutex-guarded; routes use the same instance concurrently.
class VectorDB {
public:
    struct Hit {
        int id;
        std::string meta;
        std::string cat;
        std::vector<float> emb;
        float dist;
    };

    struct SearchOut {
        std::vector<Hit> hits;
        long long us;
        std::string algo;
        std::string metric;
    };

    struct BenchOut {
        long long bfUs;
        long long kdUs;
        long long hnswUs;
        int n;
    };

    const int dims;

    explicit VectorDB(int d);

    int    insert(const std::string& meta, const std::string& cat,
                  const std::vector<float>& emb, DistFn dist);
    bool   remove(int id);
    void   clear();
    SearchOut search(const std::vector<float>& q, int k,
                     const std::string& metric, const std::string& algo);
    BenchOut  benchmark(const std::vector<float>& q, int k, const std::string& metric);
    std::vector<VectorItem> all();
    HNSW::GraphInfo hnswInfo();
    size_t size();

private:
    std::unordered_map<int, VectorItem> store_;
    BruteForce bf_;
    KDTree     kdt_;
    HNSW       hnsw_;
    std::mutex mu_;
    int nextId_ = 1;
};

}  // namespace vdb
