#pragma once

#include <string>
#include <vector>

namespace vdb {

// Split text into overlapping word-bounded chunks for embedding.
std::vector<std::string> chunkText(const std::string& text,
                                   int chunkWords   = 250,
                                   int overlapWords = 30);

}  // namespace vdb
