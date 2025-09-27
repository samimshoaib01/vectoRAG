#include "vectordb/vectordb.h"

#include <chrono>

namespace vdb {

VectorDB::VectorDB(int d) : dims(d), kdt_(d), hnsw_(16, 200) {}

int VectorDB::insert(const std::string& meta, const std::string& cat,
                     const std::vector<float>& emb, DistFn dist)
{
    std::lock_guard<std::mutex> lk(mu_);
    VectorItem v{nextId_++, meta, cat, emb};
    store_[v.id] = v;
    bf_.insert(v);
    kdt_.insert(v);
    hnsw_.insert(v, dist);
    return v.id;
}

bool VectorDB::remove(int id) {
    std::lock_guard<std::mutex> lk(mu_);
    if (!store_.count(id)) return false;
    store_.erase(id);
    bf_.remove(id);
    hnsw_.remove(id);

    // KD-tree doesn't support efficient deletion — rebuild from remaining items.
    std::vector<VectorItem> rem;
    rem.reserve(store_.size());
    for (auto& [i, v] : store_) rem.push_back(v);
    kdt_.rebuild(rem);
    return true;
}

void VectorDB::clear() {
    std::lock_guard<std::mutex> lk(mu_);
    store_.clear();
    bf_.items.clear();
    kdt_.rebuild({});
    hnsw_ = HNSW(16, 200);
    nextId_ = 1;
}

VectorDB::SearchOut VectorDB::search(
    const std::vector<float>& q, int k,
    const std::string& metric, const std::string& algo)
{
    std::lock_guard<std::mutex> lk(mu_);
    auto dfn = getDistFn(metric);
    auto t0  = std::chrono::high_resolution_clock::now();

    std::vector<std::pair<float, int>> raw;
    if      (algo == "bruteforce") raw = bf_.knn(q, k, dfn);
    else if (algo == "kdtree")     raw = kdt_.knn(q, k, dfn);
    else                            raw = hnsw_.knn(q, k, 50, dfn);

    long long us = std::chrono::duration_cast<std::chrono::microseconds>(
        std::chrono::high_resolution_clock::now() - t0).count();

    SearchOut out;
    out.us = us;
    out.algo = algo;
    out.metric = metric;
    for (auto& [d, id] : raw)
        if (store_.count(id))
            out.hits.push_back({id, store_[id].metadata, store_[id].category, store_[id].emb, d});
    return out;
}

VectorDB::BenchOut VectorDB::benchmark(
    const std::vector<float>& q, int k, const std::string& metric)
{
    std::lock_guard<std::mutex> lk(mu_);
    auto dfn = getDistFn(metric);
    auto time = [&](auto fn) -> long long {
        auto t = std::chrono::high_resolution_clock::now();
        fn();
        return std::chrono::duration_cast<std::chrono::microseconds>(
            std::chrono::high_resolution_clock::now() - t).count();
    };
    return {
        time([&]{ bf_.knn(q, k, dfn); }),
        time([&]{ kdt_.knn(q, k, dfn); }),
        time([&]{ hnsw_.knn(q, k, 50, dfn); }),
        (int)store_.size()
    };
}

std::vector<VectorItem> VectorDB::all() {
    std::lock_guard<std::mutex> lk(mu_);
    std::vector<VectorItem> r;
    r.reserve(store_.size());
    for (auto& [id, v] : store_) r.push_back(v);
    return r;
}

HNSW::GraphInfo VectorDB::hnswInfo() {
    std::lock_guard<std::mutex> lk(mu_);
    return hnsw_.getInfo();
}

size_t VectorDB::size() {
    std::lock_guard<std::mutex> lk(mu_);
    return store_.size();
}

}  // namespace vdb
