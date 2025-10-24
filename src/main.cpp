#include "httplib.h"
#include "vectordb/demo_data.h"
#include "vectordb/documentdb.h"
#include "vectordb/ollama_client.h"
#include "vectordb/routes.h"
#include "vectordb/storage.h"
#include "vectordb/vectordb.h"

#include <cstdlib>
#include <iostream>

namespace {
constexpr int kDemoDims = 128;
constexpr int kPort     = 8080;
}

int main() {
    vdb::VectorDB db(kDemoDims);
    vdb::DocumentDB docDB;

    const char* ollamaHost = std::getenv("OLLAMA_HOST");
    const char* ollamaPortEnv = std::getenv("OLLAMA_PORT");
    int ollamaPort = ollamaPortEnv ? std::stoi(ollamaPortEnv) : 11434;
    vdb::OllamaClient ollama(ollamaHost ? ollamaHost : "127.0.0.1", ollamaPort);

    // Read connection string from env; fall back to a local default.
    const char* dbUrl = std::getenv("DATABASE_URL");
    std::string connStr = dbUrl ? dbUrl : "postgresql://localhost/vectordb";
    vdb::Storage storage(connStr);

    // Hydrate DocumentDB from Postgres so documents survive restarts.
    if (storage.isConnected()) {
        auto chunks = storage.loadAll();
        for (auto& c : chunks)
            docDB.insertWithId(c.id, c.title, c.text, c.emb);
        std::cout << "[storage] Loaded " << chunks.size()
                  << " chunk(s) from PostgreSQL\n";
    }

    vdb::loadDemo(db);

    bool ollamaUp = ollama.isAvailable();
    std::cout << "=== VectorDB Engine ===\n"
              << "http://localhost:" << kPort << "\n"
              << db.size() << " demo vectors | " << kDemoDims
              << " dims | HNSW+KD-Tree+BruteForce\n"
              << "Ollama: " << (ollamaUp ? "ONLINE" : "OFFLINE (install from ollama.com)") << "\n";
    if (ollamaUp)
        std::cout << "  embed model: " << ollama.embedModel
                  << "  gen model: "   << ollama.genModel << "\n";

    httplib::Server svr;
    bool reactMounted = vdb::registerRoutes(svr, db, docDB, ollama, storage, kDemoDims);

    std::cout << "UI: "
              << (reactMounted
                      ? "React build (frontend/dist) at /"
                      : "Legacy index.html at / (run `npm run build` in frontend/ for React)")
              << "\n     Legacy UI always available at /legacy\n";

    svr.listen("0.0.0.0", kPort);
    return 0;
}
