#pragma once

#include <string>
#include <vector>

namespace vdb {

// JSON string-literal builder (handles control character escapes).
std::string jS(const std::string& s);

// Build a JSON array of floats with fixed precision.
std::string jVec(const std::vector<float>& v);

// Parse a comma-separated float list (e.g. "1.0,2.0,3.0").
std::vector<float> parseVec(const std::string& s);

// String-search-based JSON field extractors. No nested-object handling — these
// are deliberately minimal because the bodies we read from the UI are flat.
std::string extractStr(const std::string& body, const std::string& key);
int         extractInt(const std::string& body, const std::string& key, int def = 0);

// Specialized parser for POST /insert: pulls metadata, category, embedding[].
bool parseInsertBody(const std::string& b, std::string& meta,
                     std::string& cat, std::vector<float>& emb);

}  // namespace vdb
