FROM node:24-slim

RUN --mount=type=cache,target=/var/cache/apt,sharing=locked \
    --mount=type=cache,target=/var/lib/apt/lists,sharing=locked \
    rm -f /etc/apt/apt.conf.d/docker-clean \
    && apt-get update \
    && apt-get install -y --no-install-recommends git ca-certificates procps

ENV COREPACK_HOME=/home/node/.local/share/corepack \
    COREPACK_ENABLE_DOWNLOAD_PROMPT=0
RUN corepack enable

RUN mkdir -p /home/node/.local/share/pnpm/store /home/node/.cache \
    && chown -R node:node /home/node/.local /home/node/.cache

USER node

ARG PNPM_VERSION=12.9.1
RUN corepack prepare pnpm@${PNPM_VERSION} --activate \
    && pnpm config set store-dir /home/node/.local/share/pnpm/store \
    && pnpm config set package-import-method copy
