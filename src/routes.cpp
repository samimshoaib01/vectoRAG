#include "vectordb/routes.h"

#include "httplib.h"
#include "vectordb/demo_data.h"
#include "vectordb/distance.h"
#include "vectordb/documentdb.h"
#include "vectordb/json_utils.h"
#include "vectordb/ollama_client.h"
#include "vectordb/storage.h"
#include "vectordb/text_utils.h"
#include "vectordb/vectordb.h"

#include <algorithm>
#include <chrono>
#include <fstream>
#include <iomanip>
#include <random>
#include <sstream>
#include <string>
#include <vector>

namespace vdb {

namespace {

void cors(httplib::Response& res) {
    res.set_header("Access-Control-Allow-Origin",  "*");
    res.set_header("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
    res.set_header("Access-Control-Allow-Headers", "Content-Type");
}

}  // namespace

bool registerRoutes(httplib::Server& svr,
                    VectorDB& db,
                    DocumentDB& docDB,
                    OllamaClient& ollama,
                    Storage& storage,
                    int demoDims)
{
    svr.Options(".*", [](const httplib::Request&, httplib::Response& res) {
        cors(res); res.status = 204;
    });

    // ── DEMO VECTOR ENDPOINTS ─────────────────────────────────────────

    svr.Get("/search", [&, demoDims](const httplib::Request& req, httplib::Response& res) {
        cors(res);
        auto q = parseVec(req.get_param_value("v"));
        if ((int)q.size() != demoDims) {
            res.set_content("{\"error\":\"need " + std::to_string(demoDims) + "D vector\"}",
                            "application/json");
            return;
        }
        int k = 5;
        try { k = std::stoi(req.get_param_value("k")); } catch (...) {}
        auto metric = req.get_param_value("metric"); if (metric.empty()) metric = "cosine";
        auto algo   = req.get_param_value("algo");   if (algo.empty())   algo   = "hnsw";

        auto out = db.search(q, k, metric, algo);
        std::ostringstream ss;
        ss << "{\"results\":[";
        for (size_t i = 0; i < out.hits.size(); i++) {
            if (i) ss << ',';
            auto& h = out.hits[i];
            ss << "{\"id\":"        << h.id
               << ",\"metadata\":"  << jS(h.meta)
               << ",\"category\":"  << jS(h.cat)
               << ",\"distance\":"  << std::fixed << std::setprecision(6) << h.dist
               << ",\"embedding\":" << jVec(h.emb) << '}';
        }
        ss << "],\"latencyUs\":" << out.us
           << ",\"algo\":"       << jS(out.algo)
           << ",\"metric\":"     << jS(out.metric) << '}';
        res.set_content(ss.str(), "application/json");
    });

    svr.Post("/insert", [&, demoDims](const httplib::Request& req, httplib::Response& res) {
        cors(res);
        std::string meta, cat;
        std::vector<float> emb;
        if (!parseInsertBody(req.body, meta, cat, emb) || (int)emb.size() != demoDims) {
            res.set_content("{\"error\":\"invalid body\"}", "application/json");
            return;
        }
        int id = db.insert(meta, cat, emb, getDistFn("cosine"));
        res.set_content("{\"id\":" + std::to_string(id) + "}", "application/json");
    });

    svr.Delete(R"(/delete/(\d+))", [&](const httplib::Request& req, httplib::Response& res) {
        cors(res);
        int id  = std::stoi(req.matches[1]);
        bool ok = db.remove(id);
        res.set_content("{\"ok\":" + std::string(ok ? "true" : "false") + "}",
                        "application/json");
    });

    svr.Get("/items", [&](const httplib::Request&, httplib::Response& res) {
        cors(res);
        auto items = db.all();
        std::ostringstream ss;
        ss << '[';
        for (size_t i = 0; i < items.size(); i++) {
            if (i) ss << ',';
            auto& v = items[i];
            ss << "{\"id\":"        << v.id
               << ",\"metadata\":"  << jS(v.metadata)
               << ",\"category\":"  << jS(v.category)
               << ",\"embedding\":" << jVec(v.emb) << '}';
        }
        ss << ']';
        res.set_content(ss.str(), "application/json");
    });

    svr.Get("/benchmark", [&, demoDims](const httplib::Request& req, httplib::Response& res) {
        cors(res);
        auto q = parseVec(req.get_param_value("v"));
        if ((int)q.size() != demoDims) {
            res.set_content("{\"error\":\"need " + std::to_string(demoDims) + "D vector\"}",
                            "application/json");
            return;
        }
        int k = 5; try { k = std::stoi(req.get_param_value("k")); } catch (...) {}
        auto metric = req.get_param_value("metric"); if (metric.empty()) metric = "cosine";
        auto b = db.benchmark(q, k, metric);
        std::ostringstream ss;
        ss << "{\"bruteforceUs\":" << b.bfUs << ",\"kdtreeUs\":" << b.kdUs
           << ",\"hnswUs\":"       << b.hnswUs << ",\"itemCount\":" << b.n << '}';
        res.set_content(ss.str(), "application/json");
    });

    // Bulk-load synthetic vectors. Generates `count` random demo vectors
    // clustered into the four categories (CS / Math / Food / Sports) so the
    // benchmark can demonstrate HNSW's logarithmic scaling — at 20 vectors
    // brute-force wins; at 5000+ HNSW pulls ahead.
    svr.Post("/load-synthetic", [&, demoDims](const httplib::Request& req, httplib::Response& res) {
        cors(res);
        int n = 5000;
        try { n = std::stoi(req.get_param_value("count")); } catch (...) {}
        n = std::max(1, std::min(n, 50000));

        const char* CATS[] = {"cs", "math", "food", "sports"};
        auto dist = getDistFn("cosine");

        // Generate isotropic Gaussian clusters: every dimension contributes
        // equally to category identity (random per-category centroids), so
        // no single axis is a clean separator. That breaks KD-tree pruning
        // and is what makes HNSW visibly faster — same regime as real
        // sentence/image embeddings.
        std::mt19937 rng(42);  // fixed seed → centroids stable across reloads
        std::uniform_real_distribution<float> uniform01(0.05f, 0.95f);
        std::vector<std::vector<float>> centroids(4, std::vector<float>(demoDims));
        for (int c = 0; c < 4; ++c)
            for (int j = 0; j < demoDims; ++j)
                centroids[c][j] = uniform01(rng);

        std::mt19937 rng2(std::random_device{}());
        std::normal_distribution<float>    jitter(0.0f, 0.06f);
        std::uniform_int_distribution<int> pickCat(0, 3);

        auto t0 = std::chrono::steady_clock::now();
        for (int i = 0; i < n; i++) {
            int c = pickCat(rng2);
            std::vector<float> emb(demoDims);
            for (int j = 0; j < demoDims; j++)
                emb[j] = std::clamp(centroids[c][j] + jitter(rng2), 0.0f, 1.0f);
            std::string meta = std::string("synthetic ") + CATS[c]
                             + " #" + std::to_string(i);
            db.insert(meta, CATS[c], emb, dist);
        }
        auto elapsedMs = std::chrono::duration_cast<std::chrono::milliseconds>(
            std::chrono::steady_clock::now() - t0).count();

        std::ostringstream ss;
        ss << "{\"inserted\":"  << n
           << ",\"totalCount\":" << db.size()
           << ",\"elapsedMs\":"  << elapsedMs << '}';
        res.set_content(ss.str(), "application/json");
    });

    // Wipe everything and reload the 20 hand-crafted demo vectors. Lets the
    // user reset after a bulk load without restarting the server.
    svr.Post("/reset-vectors", [&](const httplib::Request&, httplib::Response& res) {
        cors(res);
        db.clear();
        loadDemo(db);
        std::ostringstream ss;
        ss << "{\"count\":" << db.size() << '}';
        res.set_content(ss.str(), "application/json");
    });

    svr.Get("/hnsw-info", [&](const httplib::Request&, httplib::Response& res) {
        cors(res);
        auto gi = db.hnswInfo();
        std::ostringstream ss;
        ss << "{\"topLayer\":" << gi.topLayer << ",\"nodeCount\":" << gi.nodeCount
           << ",\"nodesPerLayer\":[";
        for (size_t i = 0; i < gi.nodesPerLayer.size(); i++) {
            if (i) ss << ','; ss << gi.nodesPerLayer[i];
        }
        ss << "],\"edgesPerLayer\":[";
        for (size_t i = 0; i < gi.edgesPerLayer.size(); i++) {
            if (i) ss << ','; ss << gi.edgesPerLayer[i];
        }
        ss << "],\"nodes\":[";
        for (size_t i = 0; i < gi.nodes.size(); i++) {
            if (i) ss << ',';
            auto& n = gi.nodes[i];
            ss << "{\"id\":" << n.id << ",\"metadata\":" << jS(n.metadata)
               << ",\"category\":" << jS(n.category) << ",\"maxLyr\":" << n.maxLyr << '}';
        }
        ss << "],\"edges\":[";
        for (size_t i = 0; i < gi.edges.size(); i++) {
            if (i) ss << ',';
            auto& e = gi.edges[i];
            ss << "{\"src\":" << e.src << ",\"dst\":" << e.dst << ",\"lyr\":" << e.lyr << '}';
        }
        ss << "]}";
        res.set_content(ss.str(), "application/json");
    });

    // ── DOCUMENT + RAG ENDPOINTS ──────────────────────────────────────

    svr.Post("/doc/insert", [&](const httplib::Request& req, httplib::Response& res) {
        cors(res);
        auto title = extractStr(req.body, "title");
        auto text  = extractStr(req.body, "text");
        if (title.empty() || text.empty()) {
            res.set_content("{\"error\":\"need title and text\"}", "application/json");
            return;
        }

        auto chunks = chunkText(text, 250, 30);
        std::vector<int> ids;

        for (int i = 0; i < (int)chunks.size(); i++) {
            auto emb = ollama.embed(chunks[i]);
            if (emb.empty()) {
                res.set_content(
                    "{\"error\":\"Ollama unavailable. "
                    "Install from https://ollama.com then run: "
                    "ollama pull nomic-embed-text && ollama pull llama3.2\"}",
                    "application/json");
                return;
            }
            std::string chunkTitle = (chunks.size() > 1)
                ? title + " [" + std::to_string(i + 1) + "/" + std::to_string(chunks.size()) + "]"
                : title;
            int id = storage.isConnected()
                ? storage.saveChunk(chunkTitle, chunks[i], emb)
                : -1;
            if (id > 0)
                ids.push_back(docDB.insertWithId(id, chunkTitle, chunks[i], emb));
            else
                ids.push_back(docDB.insert(chunkTitle, chunks[i], emb));
        }

        std::ostringstream ss;
        ss << "{\"ids\":[";
        for (size_t i = 0; i < ids.size(); i++) { if (i) ss << ','; ss << ids[i]; }
        ss << "],\"chunks\":" << chunks.size()
           << ",\"dims\":"    << docDB.getDims() << '}';
        res.set_content(ss.str(), "application/json");
    });

    svr.Delete(R"(/doc/delete/(\d+))", [&](const httplib::Request& req, httplib::Response& res) {
        cors(res);
        int id  = std::stoi(req.matches[1]);
        bool ok = docDB.remove(id);
        if (ok && storage.isConnected()) storage.deleteChunk(id);
        res.set_content("{\"ok\":" + std::string(ok ? "true" : "false") + "}",
                        "application/json");
    });

    svr.Get("/doc/list", [&](const httplib::Request&, httplib::Response& res) {
        cors(res);
        auto docs = docDB.all();
        std::ostringstream ss;
        ss << '[';
        for (size_t i = 0; i < docs.size(); i++) {
            if (i) ss << ',';
            std::string preview = docs[i].text.substr(0, 120);
            if (docs[i].text.size() > 120) preview += "…";
            ss << "{\"id\":"      << docs[i].id
               << ",\"title\":"   << jS(docs[i].title)
               << ",\"preview\":" << jS(preview)
               << ",\"words\":"   << (int)std::count(docs[i].text.begin(), docs[i].text.end(), ' ') + 1
               << '}';
        }
        ss << ']';
        res.set_content(ss.str(), "application/json");
    });

    svr.Post("/doc/search", [&](const httplib::Request& req, httplib::Response& res) {
        cors(res);
        auto question = extractStr(req.body, "question");
        int  k        = extractInt(req.body, "k", 3);
        if (question.empty()) {
            res.set_content("{\"error\":\"need question\"}", "application/json");
            return;
        }

        auto qEmb = ollama.embed(question);
        if (qEmb.empty()) {
            res.set_content("{\"error\":\"Ollama unavailable\"}", "application/json");
            return;
        }

        auto hits = docDB.search(qEmb, k);
        std::ostringstream ss;
        ss << "{\"contexts\":[";
        for (size_t i = 0; i < hits.size(); i++) {
            if (i) ss << ',';
            ss << "{\"id\":"       << hits[i].second.id
               << ",\"title\":"    << jS(hits[i].second.title)
               << ",\"distance\":" << std::fixed << std::setprecision(4) << hits[i].first << '}';
        }
        ss << "]}";
        res.set_content(ss.str(), "application/json");
    });

    // Full RAG pipeline: embed → retrieve → generate.
    svr.Post("/doc/ask", [&](const httplib::Request& req, httplib::Response& res) {
        cors(res);
        auto question = extractStr(req.body, "question");
        int  k        = extractInt(req.body, "k", 3);
        if (question.empty()) {
            res.set_content("{\"error\":\"need question\"}", "application/json");
            return;
        }

        auto qEmb = ollama.embed(question);
        if (qEmb.empty()) {
            res.set_content("{\"error\":\"Ollama unavailable\"}", "application/json");
            return;
        }

        auto hits = docDB.search(qEmb, k);

        std::ostringstream ctx;
        for (int i = 0; i < (int)hits.size(); i++) {
            ctx << "[" << (i + 1) << "] " << hits[i].second.title << ":\n"
                << hits[i].second.text << "\n\n";
        }

        // Two-mode prompt:
        //   - No retrieved chunks → free-form general-knowledge answer.
        //   - Retrieved chunks    → strict grounding; no mixing in pretrained
        //                           facts, no "but also there's a famous X…" tail.
        std::string prompt;
        if (hits.empty()) {
            prompt =
                "You are a helpful assistant. Answer the user's question "
                "directly and concisely using your own knowledge.\n\n"
                "Question: " + question + "\n\n"
                "Answer:";
        } else {
            prompt =
                "You are a helpful assistant. Answer the user's question using "
                "ONLY the information in the provided context below. "
                "Do NOT add facts from your own general knowledge. "
                "Do NOT mention other famous people, places, or things that "
                "share a name with the subject. "
                "If the context does not contain the answer, reply exactly: "
                "\"I don't have information about that in my notes.\" "
                "Do not mention the word 'context' or 'provided text' in your "
                "answer. Just answer naturally and stop.\n\n"
                "Context:\n" + ctx.str() +
                "Question: " + question + "\n\n"
                "Answer:";
        }

        auto answer = ollama.generate(prompt);

        std::ostringstream ss;
        ss << "{\"answer\":" << jS(answer)
           << ",\"model\":"  << jS(ollama.genModel)
           << ",\"contexts\":[";
        for (size_t i = 0; i < hits.size(); i++) {
            if (i) ss << ',';
            ss << "{\"id\":"       << hits[i].second.id
               << ",\"title\":"    << jS(hits[i].second.title)
               << ",\"text\":"     << jS(hits[i].second.text)
               << ",\"distance\":" << std::fixed << std::setprecision(4) << hits[i].first << '}';
        }
        ss << "],\"docCount\":" << docDB.size() << '}';
        res.set_content(ss.str(), "application/json");
    });

    svr.Get("/status", [&, demoDims](const httplib::Request&, httplib::Response& res) {
        cors(res);
        bool up = ollama.isAvailable();
        std::ostringstream ss;
        ss << "{\"ollamaAvailable\":"  << (up ? "true" : "false")
           << ",\"embedModel\":"       << jS(ollama.embedModel)
           << ",\"genModel\":"         << jS(ollama.genModel)
           << ",\"docCount\":"         << docDB.size()
           << ",\"docDims\":"          << docDB.getDims()
           << ",\"demoDims\":"         << demoDims
           << ",\"demoCount\":"        << db.size() << '}';
        res.set_content(ss.str(), "application/json");
    });

    svr.Get("/stats", [&, demoDims](const httplib::Request&, httplib::Response& res) {
        cors(res);
        std::ostringstream ss;
        ss << "{\"count\":"      << db.size()
           << ",\"dims\":"       << demoDims
           << ",\"algorithms\":[\"bruteforce\",\"kdtree\",\"hnsw\"]"
           << ",\"metrics\":[\"euclidean\",\"cosine\",\"manhattan\"]}";
        res.set_content(ss.str(), "application/json");
    });

    // ── STATIC FILE SERVING ───────────────────────────────────────────
    //
    // Primary UI is the React build at frontend/dist/. If that directory
    // exists, set_mount_point serves index.html at / and assets at
    // /assets/*. If the React app hasn't been built yet, fall back to the
    // legacy single-file index.html so the demo still works.
    //
    // The legacy UI is always available at /legacy for A/B comparison.

    auto serveLegacy = [](const httplib::Request&, httplib::Response& res) {
        std::ifstream f("index.html");
        if (!f.is_open()) { res.status = 404; return; }
        res.set_content(
            std::string(std::istreambuf_iterator<char>(f),
                        std::istreambuf_iterator<char>()),
            "text/html");
    };

    bool reactMounted = svr.set_mount_point("/", "frontend/dist");
    if (!reactMounted) {
        // No React build yet → serve legacy UI at / too.
        svr.Get("/", serveLegacy);
    }

    svr.Get("/legacy", serveLegacy);

    return reactMounted;
}

}  // namespace vdb
