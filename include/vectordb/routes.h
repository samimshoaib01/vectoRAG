#pragma once

namespace httplib { class Server; }

namespace vdb {

class VectorDB;
class DocumentDB;
class OllamaClient;
class Storage;

// Wire all REST endpoints onto `svr`. The three components are captured by
// reference and must outlive the server.
//
// Returns true if the React build at frontend/dist/ was successfully mounted
// at /, false if it fell back to serving the legacy index.html at /.
bool registerRoutes(httplib::Server& svr,
                    VectorDB& db,
                    DocumentDB& docDB,
                    OllamaClient& ollama,
                    Storage& storage,
                    int demoDims);

}  // namespace vdb
