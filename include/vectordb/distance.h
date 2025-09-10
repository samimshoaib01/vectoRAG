#pragma once

#include <functional>
#include <string>
#include <vector>

namespace vdb {

using DistFn = std::function<float(const std::vector<float>&, const std::vector<float>&)>;

float euclidean(const std::vector<float>& a, const std::vector<float>& b);
float cosine   (const std::vector<float>& a, const std::vector<float>& b);
float manhattan(const std::vector<float>& a, const std::vector<float>& b);

DistFn getDistFn(const std::string& metric);

}  // namespace vdb
