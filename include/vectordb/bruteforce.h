#pragma once

#include <utility>
#include <vector>

#include "vectordb/distance.h"
#include "vectordb/types.h"

namespace vdb {

class BruteForce {
public:
    std::vector<VectorItem> items;

    void insert(const VectorItem& v);
    std::vector<std::pair<float, int>> knn(const std::vector<float>& q, int k, DistFn dist);
    void remove(int id);
};

}  // namespace vdb
