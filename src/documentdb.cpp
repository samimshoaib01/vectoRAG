#include "vectordb/documentdb.h"

#include "vectordb/distance.h"
#include "vectordb/types.h"

namespace vdb {

DocumentDB::DocumentDB() : hnsw_(16, 200) {}

int DocumentDB::insert(const std::string& title, const std::string& text,
                       const std::vector<float>& emb)
{
    std::lock_guard<std::mutex> lk(mu_);
    if (dims_ == 0) dims_ = (int)emb.size();
    DocItem item{nextId_++, title, text, emb};
    store_[item.id] = item;
    VectorItem vi{item.id, title, "doc", emb};
    hnsw_.insert(vi, cosine);
    bf_.insert(vi);
    return item.id;
}

int DocumentDB::insertWithId(int id, const std::string& title, const std::string& text,
                              const std::vector<float>& emb)
{
    std::lock_guard<std::mutex> lk(mu_);
    if (dims_ == 0) dims_ = (int)emb.size();
    DocItem item{id, title, text, emb};
    store_[id] = item;
    VectorItem vi{id, title, "doc", emb};
    hnsw_.insert(vi, cosine);
    bf_.insert(vi);
    if (id >= nextId_) nextId_ = id + 1;
    return id;
}

std::vector<std::pair<float, DocItem>> DocumentDB::search(
    const std::vector<float>& q, int k, float maxDist)
{
    std::lock_guard<std::mutex> lk(mu_);
    if (store_.empty()) return {};
    auto raw = (store_.size() < 10)
                   ? bf_.knn(q, k, cosine)
                   : hnsw_.knn(q, k, 50, cosine);
    std::vector<std::pair<float, DocItem>> out;
    for (auto& [d, id] : raw)
        if (store_.count(id) && d <= maxDist) out.push_back({d, store_[id]});
    return out;
}

bool DocumentDB::remove(int id) {
    std::lock_guard<std::mutex> lk(mu_);
    if (!store_.count(id)) return false;
    store_.erase(id);
    hnsw_.remove(id);
    bf_.remove(id);
    return true;
}

std::vector<DocItem> DocumentDB::all() {
    std::lock_guard<std::mutex> lk(mu_);
    std::vector<DocItem> r;
    r.reserve(store_.size());
    for (auto& [id, v] : store_) r.push_back(v);
    return r;
}

size_t DocumentDB::size() {
    std::lock_guard<std::mutex> lk(mu_);
    return store_.size();
}

int DocumentDB::getDims() {
    std::lock_guard<std::mutex> lk(mu_);
    return dims_;
}

}  // namespace vdb
