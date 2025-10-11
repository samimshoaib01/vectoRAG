#pragma once

#include <string>
#include <vector>

namespace vdb {

// Thin wrapper over Ollama's local REST API. All calls are blocking; the
// generate() endpoint can take 30s+ on CPU-only laptops.
class OllamaClient {
public:
    std::string embedModel = "nomic-embed-text";
    std::string genModel   = "llama3.2";

    OllamaClient(std::string host = "127.0.0.1", int port = 11434);

    bool isAvailable();
    std::vector<float> embed(const std::string& text);
    std::string        generate(const std::string& prompt);

private:
    std::string host_;
    int         port_;

    static std::string esc(const std::string& s);
    static std::vector<float> parseEmbedding(const std::string& body);
};

}  // namespace vdb
