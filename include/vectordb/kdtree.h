#pragma once

#include <queue>
#include <utility>
#include <vector>

#include "vectordb/distance.h"
#include "vectordb/types.h"

namespace vdb {

struct KDNode {
    VectorItem item;
    KDNode* left  = nullptr;
    KDNode* right = nullptr;
    explicit KDNode(const VectorItem& v) : item(v) {}
};

class KDTree {
public:
    explicit KDTree(int dims);
    ~KDTree();

    KDTree(const KDTree&) = delete;
    KDTree& operator=(const KDTree&) = delete;

    void insert(const VectorItem& v);
    std::vector<std::pair<float, int>> knn(const std::vector<float>& q, int k, DistFn dist);
    void rebuild(const std::vector<VectorItem>& items);

private:
    KDNode* root_ = nullptr;
    int dims_;

    void destroy(KDNode* n);
    KDNode* ins(KDNode* n, const VectorItem& v, int d);
    void knnRec(KDNode* n, const std::vector<float>& q, int k, int d, DistFn dist,
                std::priority_queue<std::pair<float, int>>& heap);
};

}  // namespace vdb
