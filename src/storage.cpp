#include "vectordb/storage.h"

#include <libpq-fe.h>
#include <iomanip>
#include <iostream>
#include <sstream>

namespace vdb {

static PGconn* conn(void* p) { return static_cast<PGconn*>(p); }

Storage::Storage(const std::string& connStr) {
    conn_ = PQconnectdb(connStr.c_str());
    if (PQstatus(conn(conn_)) != CONNECTION_OK) {
        std::cerr << "[storage] PostgreSQL connection failed: "
                  << PQerrorMessage(conn(conn_)) << "\n";
    } else {
        std::cout << "[storage] PostgreSQL connected\n";
        createSchema();
    }
}

Storage::~Storage() {
    if (conn_) PQfinish(conn(conn_));
}

bool Storage::isConnected() const {
    return conn_ && PQstatus(conn(conn_)) == CONNECTION_OK;
}

void Storage::createSchema() {
    const char* sql =
        "CREATE TABLE IF NOT EXISTS chunks ("
        "  id         SERIAL PRIMARY KEY,"
        "  title      TEXT NOT NULL,"
        "  chunk_text TEXT NOT NULL,"
        "  embedding  TEXT NOT NULL,"
        "  created_at TIMESTAMPTZ DEFAULT NOW()"
        ");";
    PGresult* res = PQexec(conn(conn_), sql);
    if (PQresultStatus(res) != PGRES_COMMAND_OK)
        std::cerr << "[storage] createSchema error: " << PQerrorMessage(conn(conn_)) << "\n";
    PQclear(res);
}

int Storage::saveChunk(const std::string& title, const std::string& text,
                       const std::vector<float>& emb) {
    if (!isConnected()) return -1;

    std::string embStr = serializeEmb(emb);
    const char* params[3] = { title.c_str(), text.c_str(), embStr.c_str() };

    PGresult* res = PQexecParams(conn(conn_),
        "INSERT INTO chunks (title, chunk_text, embedding) VALUES ($1, $2, $3) RETURNING id",
        3, nullptr, params, nullptr, nullptr, 0);

    int id = -1;
    if (PQresultStatus(res) == PGRES_TUPLES_OK && PQntuples(res) > 0)
        id = std::stoi(PQgetvalue(res, 0, 0));
    else
        std::cerr << "[storage] saveChunk error: " << PQerrorMessage(conn(conn_)) << "\n";
    PQclear(res);
    return id;
}

bool Storage::deleteChunk(int id) {
    if (!isConnected()) return false;

    std::string idStr = std::to_string(id);
    const char* params[1] = { idStr.c_str() };

    PGresult* res = PQexecParams(conn(conn_),
        "DELETE FROM chunks WHERE id = $1",
        1, nullptr, params, nullptr, nullptr, 0);

    bool ok = PQresultStatus(res) == PGRES_COMMAND_OK;
    if (!ok) std::cerr << "[storage] deleteChunk error: " << PQerrorMessage(conn(conn_)) << "\n";
    PQclear(res);
    return ok;
}

std::vector<Storage::ChunkRow> Storage::loadAll() {
    std::vector<ChunkRow> rows;
    if (!isConnected()) return rows;

    PGresult* res = PQexec(conn(conn_),
        "SELECT id, title, chunk_text, embedding FROM chunks ORDER BY id");

    if (PQresultStatus(res) != PGRES_TUPLES_OK) {
        std::cerr << "[storage] loadAll error: " << PQerrorMessage(conn(conn_)) << "\n";
        PQclear(res);
        return rows;
    }

    int n = PQntuples(res);
    rows.reserve(n);
    for (int i = 0; i < n; i++) {
        ChunkRow row;
        row.id    = std::stoi(PQgetvalue(res, i, 0));
        row.title = PQgetvalue(res, i, 1);
        row.text  = PQgetvalue(res, i, 2);
        row.emb   = deserializeEmb(PQgetvalue(res, i, 3));
        rows.push_back(std::move(row));
    }
    PQclear(res);
    return rows;
}

std::string Storage::serializeEmb(const std::vector<float>& emb) {
    std::ostringstream ss;
    ss << std::fixed << std::setprecision(8);
    for (size_t i = 0; i < emb.size(); i++) {
        if (i) ss << ',';
        ss << emb[i];
    }
    return ss.str();
}

std::vector<float> Storage::deserializeEmb(const std::string& s) {
    std::vector<float> out;
    std::istringstream ss(s);
    std::string tok;
    while (std::getline(ss, tok, ',')) {
        try { out.push_back(std::stof(tok)); } catch (...) {}
    }
    return out;
}

}  // namespace vdb
