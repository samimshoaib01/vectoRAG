#pragma once

#include <random>
#include <string>
#include <unordered_map>
#include <utility>
#include <vector>

#include "vectordb/distance.h"
#include "vectordb/types.h"

namespace vdb {

class HNSW {
public:
    HNSW(int M = 16, int efBuild = 200);

    void insert(const VectorItem& item, DistFn dist);
    std::vector<std::pair<float, int>> knn(const std::vector<float>& q, int k, int ef, DistFn dist);
    void remove(int id);
    size_t size() const { return G_.size(); }

    struct NodeView { int id; std::string metadata, category; int maxLyr; };
    struct EdgeView { int src, dst, lyr; };
    struct GraphInfo {
        int topLayer;
        int nodeCount;
        std::vector<int> nodesPerLayer;
        std::vector<int> edgesPerLayer;
        std::vector<NodeView> nodes;
        std::vector<EdgeView> edges;
    };
    GraphInfo getInfo();

private:
    struct Node {
        VectorItem item;
        int maxLyr;
        std::vector<std::vector<int>> nbrs;
    };

    std::unordered_map<int, Node> G_;
    int   M_, M0_, ef_build_;
    float mL_;
    int   topLayer_ = -1;
    int   entryPt_  = -1;
    std::mt19937 rng_;

    int randLevel();
    std::vector<std::pair<float, int>> searchLayer(
        const std::vector<float>& q, int ep, int ef, int lyr, DistFn dist);
    std::vector<int> selectNbrs(std::vector<std::pair<float, int>>& cands, int maxM);
};

}  // namespace vdb
