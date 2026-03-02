# ── Stage 1: Build C++ backend + React frontend ───────────────────────────
FROM ubuntu:22.04 AS builder

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get install -y \
    cmake g++ libpq-dev curl ca-certificates \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install frontend deps (separate layer so npm ci is cached unless package.json changes)
COPY frontend/package*.json frontend/
RUN cd frontend && npm ci

# Build React
COPY frontend/ frontend/
RUN cd frontend && npm run build

# Build C++ backend
COPY CMakeLists.txt .
COPY src/ src/
COPY include/ include/
COPY third_party/ third_party/

RUN cmake -S . -B build -DCMAKE_BUILD_TYPE=Release \
    && cmake --build build -j$(nproc)

# ── Stage 2: Minimal runtime image ────────────────────────────────────────
FROM ubuntu:22.04

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get install -y \
    libpq5 ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY --from=builder /app/build/db ./db
COPY --from=builder /app/frontend/dist ./frontend/dist

EXPOSE 8080
CMD ["./db"]
