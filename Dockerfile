FROM python:3.12-slim AS base

# Security: non-root user
RUN groupadd -r aeos && useradd -r -g aeos -d /app -s /sbin/nologin aeos

WORKDIR /app

# Install Rust for bulletproofs (optional, build stage)
FROM base AS builder
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential curl && \
    curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y && \
    rm -rf /var/lib/apt/lists/*

ENV PATH="/root/.cargo/bin:${PATH}"

# Build Rust bulletproofs
COPY bulletproofs/ /app/bulletproofs/
RUN cd /app/bulletproofs && cargo build --release 2>/dev/null || true

# Install Python deps
COPY pyproject.toml /app/
RUN pip install --no-cache-dir ".[server,settlement]"

# Production image
FROM base AS production
COPY --from=builder /usr/local/lib/python3.12/site-packages /usr/local/lib/python3.12/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin
COPY --from=builder /app/bulletproofs/target/release/aeos-bulletproofs /usr/local/bin/aeos-bulletproofs 2>/dev/null || true

COPY aeos/ /app/aeos/
COPY pyproject.toml /app/

# Data directory (mount a volume here for persistence)
RUN mkdir -p /app/data && chown aeos:aeos /app/data
VOLUME /app/data

ENV AEOS_DB_PATH=/app/data/aeos.db
ENV AEOS_HOST=0.0.0.0
ENV AEOS_PORT=8420

USER aeos
EXPOSE 8420

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8420/health')" || exit 1

CMD ["python", "-m", "uvicorn", "aeos.server:app", "--host", "0.0.0.0", "--port", "8420"]
