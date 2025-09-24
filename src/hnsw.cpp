#include "vectordb/hnsw.h"

#include <algorithm>
#include <cmath>
#include <functional>
#include <queue>

namespace vdb {

HNSW::HNSW(int M, int efBuild)
    : M_(M), M0_(2 * M), ef_build_(efBuild),
      mL_(1.0f / std::log((float)M)), rng_(42) {}

int HNSW::randLevel() {
    std::uniform_real_distribution<float> u(0.0f, 1.0f);
    return (int)std::floor(-std::log(u(rng_)) * mL_);
}

std::vector<std::pair<float, int>> HNSW::searchLayer(
    const std::vector<float>& q, int ep, int ef, int lyr, DistFn dist)
{
    std::unordered_map<int, bool> vis;
    std::priority_queue<std::pair<float, int>,
        std::vector<std::pair<float, int>>, std::greater<>> cands;
    std::priority_queue<std::pair<float, int>> found;

    float d0 = dist(q, G_[ep].item.emb);
    vis[ep] = true;
    cands.push({d0, ep});
    found.push({d0, ep});

    while (!cands.empty()) {
        auto [cd, cid] = cands.top(); cands.pop();
        if ((int)found.size() >= ef && cd > found.top().first) break;
        if (lyr >= (int)G_[cid].nbrs.size()) continue;
        for (int nid : G_[cid].nbrs[lyr]) {
            if (vis[nid] || !G_.count(nid)) continue;
            vis[nid] = true;
            float nd = dist(q, G_[nid].item.emb);
            if ((int)found.size() < ef || nd < found.top().first) {
                cands.push({nd, nid});
                found.push({nd, nid});
                if ((int)found.size() > ef) found.pop();
            }
        }
    }

    std::vector<std::pair<float, int>> res;
    while (!found.empty()) { res.push_back(found.top()); found.pop(); }
    std::sort(res.begin(), res.end());
    return res;
}

std::vector<int> HNSW::selectNbrs(std::vector<std::pair<float, int>>& cands, int maxM) {
    std::vector<int> r;
    for (int i = 0; i < std::min((int)cands.size(), maxM); i++)
        r.push_back(cands[i].second);
    return r;
}

void HNSW::insert(const VectorItem& item, DistFn dist) {
    int id  = item.id;
    int lvl = randLevel();
    G_[id]  = {item, lvl, std::vector<std::vector<int>>(lvl + 1)};

    if (entryPt_ == -1) { entryPt_ = id; topLayer_ = lvl; return; }

    int ep = entryPt_;
    for (int lc = topLayer_; lc > lvl; lc--) {
        if (lc < (int)G_[ep].nbrs.size()) {
            auto W = searchLayer(item.emb, ep, 1, lc, dist);
            if (!W.empty()) ep = W[0].second;
        }
    }
    for (int lc = std::min(topLayer_, lvl); lc >= 0; lc--) {
        auto W   = searchLayer(item.emb, ep, ef_build_, lc, dist);
        int maxM = (lc == 0) ? M0_ : M_;
        auto sel = selectNbrs(W, maxM);
        G_[id].nbrs[lc] = sel;

        for (int nid : sel) {
            if (!G_.count(nid)) continue;
            if ((int)G_[nid].nbrs.size() <= lc) G_[nid].nbrs.resize(lc + 1);
            auto& conn = G_[nid].nbrs[lc];
            conn.push_back(id);
            if ((int)conn.size() > maxM) {
                std::vector<std::pair<float, int>> ds;
                for (int c : conn)
                    if (G_.count(c))
                        ds.push_back({dist(G_[nid].item.emb, G_[c].item.emb), c});
                std::sort(ds.begin(), ds.end());
                conn.clear();
                for (int i = 0; i < maxM && i < (int)ds.size(); i++)
                    conn.push_back(ds[i].second);
            }
        }
        if (!W.empty()) ep = W[0].second;
    }
    if (lvl > topLayer_) { topLayer_ = lvl; entryPt_ = id; }
}

std::vector<std::pair<float, int>> HNSW::knn(
    const std::vector<float>& q, int k, int ef, DistFn dist)
{
    if (entryPt_ == -1) return {};
    int ep = entryPt_;
    for (int lc = topLayer_; lc > 0; lc--) {
        if (lc < (int)G_[ep].nbrs.size()) {
            auto W = searchLayer(q, ep, 1, lc, dist);
            if (!W.empty()) ep = W[0].second;
        }
    }
    auto W = searchLayer(q, ep, std::max(ef, k), 0, dist);
    if ((int)W.size() > k) W.resize(k);
    return W;
}

void HNSW::remove(int id) {
    if (!G_.count(id)) return;
    for (auto& [nid, nd] : G_)
        for (auto& layer : nd.nbrs)
            layer.erase(std::remove(layer.begin(), layer.end(), id), layer.end());
    if (entryPt_ == id) {
        entryPt_ = -1;
        topLayer_ = 0;
        for (auto& [nid, nd] : G_) {
            if (nid == id) continue;
            if (entryPt_ == -1 || nd.maxLyr > topLayer_) {
                entryPt_ = nid;
                topLayer_ = nd.maxLyr;
            }
        }
    }
    G_.erase(id);
}

HNSW::GraphInfo HNSW::getInfo() {
    GraphInfo gi;
    gi.topLayer  = topLayer_;
    gi.nodeCount = (int)G_.size();
    int maxL = std::max(topLayer_ + 1, 1);
    gi.nodesPerLayer.assign(maxL, 0);
    gi.edgesPerLayer.assign(maxL, 0);
    for (auto& [id, nd] : G_) {
        gi.nodes.push_back({id, nd.item.metadata, nd.item.category, nd.maxLyr});
        for (int lc = 0; lc <= nd.maxLyr && lc < maxL; lc++) {
            gi.nodesPerLayer[lc]++;
            if (lc < (int)nd.nbrs.size())
                for (int nid : nd.nbrs[lc])
                    if (id < nid) {
                        gi.edgesPerLayer[lc]++;
                        gi.edges.push_back({id, nid, lc});
                    }
        }
    }
    return gi;
}

}  // namespace vdb
