#pragma once

#include <string>
#include <vector>

namespace vdb {

struct VectorItem {
    int id;
    std::string metadata;
    std::string category;
    std::vector<float> emb;
};

}  // namespace vdb
