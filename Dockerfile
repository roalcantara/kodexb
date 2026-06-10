# syntax=docker/dockerfile:1.7
# ─────────────────────────────────────────────────────────────────────────────
# Multi-stage Dockerfile — Electrobun Linux bundle for kb
#
# STAGES:
#   builder → oven/bun:1-slim (Debian-slim + Bun), compiles the Electrobun
#             Linux bundle. Debian/glibc is required because Electrobun's CLI
#             and core binaries are dynamically linked against glibc and crash
#             with ENOEXEC on Alpine + gcompat.
#   final   → debian:bookworm-slim with only the bundled application. Same
#             glibc ABI as the builder so /opt/kb/bin/launcher runs cleanly.
#
# USAGE:
#   mise run docker:build --nocache --platform amd64        # via mise task
#   mise run docker:test                                    # CST verification
#   docker build -t roalcantara/kb:latest .                 # direct build
#   docker run --rm roalcantara/kb --help                   # direct run
#
# REFERENCES:
#   https://github.com/blackboardsh/electrobun
#   https://github.com/GoogleContainerTools/container-structure-test
# ─────────────────────────────────────────────────────────────────────────────

# ── STAGE 1: builder ──────────────────────────────────────────────────────────
FROM oven/bun:1-slim AS builder
WORKDIR /app

# Electrobun's installer probes for these tools; the build itself shells out to
# them when extracting the downloaded core binaries.
RUN apt-get update \
  && apt-get install -y --no-install-recommends \
       ca-certificates \
       curl \
       git \
       python3 \
       tar \
       unzip \
  && rm -rf /var/lib/apt/lists/*

# Copy lockfile + manifests first for better layer caching — this layer only
# busts when dependencies change, not on source edits. Workspace package.json
# files must be present before `bun install --frozen-lockfile` (root workspaces
# in package.json); copying only root package.json + bun.lock fails CST/CI.
COPY package.json bun.lock ./
COPY packages/workflow-core/package.json packages/workflow-core/
COPY packages/workflow-runtime/package.json packages/workflow-runtime/
RUN --mount=type=cache,target=/root/.bun/install/cache \
    bun install --frozen-lockfile

# Source (.dockerignore excludes node_modules and build output).
COPY . .

# Build the Linux bundle. Electrobun emits build/<env>-linux-<arch>/<app>/.
# We use the dev env so the build skips the post-bundle zstd compression step
# (fragile under Rosetta/QEMU cross-platform builds) and normalise the path so
# the final stage does not need to know the host arch or env.
ARG ELECTROBUN_ENV=dev
RUN set -eu; \
    bash tools/orchestration/scripts/compile_renderer_styles.sh; \
    rm -f node_modules/electrobun/bin/electrobun; \
    bun run build:ci; \
    arch="$(uname -m)"; \
    case "$arch" in \
      x86_64)  suffix="x64" ;; \
      aarch64) suffix="arm64" ;; \
      *) echo "unsupported arch: $arch" >&2; exit 1 ;; \
    esac; \
    bundle_root="build/${ELECTROBUN_ENV}-linux-${suffix}"; \
    app_dir="$(find "$bundle_root" -mindepth 1 -maxdepth 1 -type d -print -quit)"; \
    [ -n "$app_dir" ] || { echo "no bundle dir under $bundle_root" >&2; ls -la "$bundle_root" >&2; exit 1; }; \
    mv "$app_dir" /opt/kb

# ── STAGE 2: final ────────────────────────────────────────────────────────────
FROM debian:bookworm-slim AS final
WORKDIR /opt/kb

# Minimal runtime deps for the Electrobun launcher + bundled Bun. CEF/GTK libs
# are only required when actually displaying the app; the container-structure
# tests verify the bundle is present without launching the GUI.
RUN apt-get update \
  && apt-get install -y --no-install-recommends \
       ca-certificates \
       libstdc++6 \
  && rm -rf /var/lib/apt/lists/*

COPY --from=builder /opt/kb /opt/kb
RUN ln -sf /opt/kb/bin/launcher /usr/local/bin/kb

LABEL org.opencontainers.image.title="kb"
LABEL org.opencontainers.image.description="Native desktop knowledge management app built on Electrobun"
LABEL org.opencontainers.image.source="https://github.com/roalcantara/kb"

ENTRYPOINT ["/opt/kb/bin/launcher"]
