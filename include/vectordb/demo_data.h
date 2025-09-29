#pragma once

namespace vdb {

class VectorDB;

// Populate the 16D demo index with 20 vectors across 4 categories (CS, Math,
// Food, Sports). Each dim block (4 dims) lights up for one category — the PCA
// scatter plot in the UI relies on this to show visible clusters.
void loadDemo(VectorDB& db);

}  // namespace vdb
