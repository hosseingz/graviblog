# ==============================================================================
# Multi-Stage Dockerfile for Production Next.js App Router
# Base Image: Node.js 20 Alpine
# ==============================================================================

# ------------------------------------------------------------------------------
# Stage 1: Install Dependencies
# ------------------------------------------------------------------------------
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
ENV PATH=/app/node_modules/.bin:$PATH

# Registry override for restricted networks / corporate mirrors.
#   docker compose build --build-arg NPM_REGISTRY=https://registry.npmmirror.com
# or set NPM_REGISTRY in the project .env file.
ARG NPM_REGISTRY=https://registry.npmjs.org/

# Copy package descriptors and lockfiles
COPY package.json package-lock.json* yarn.lock* pnpm-lock.yaml* ./

# Install dependencies based on preferred package manager.
# Retry/timeout settings keep the install alive on slow or flaky links, and the
# explicit verification below turns an incomplete install into a clear failure.
# npm can exit 0 after every tarball fetch times out, leaving node_modules
# half-built; that used to surface much later as "sh: next: not found".
RUN \
  npm config set registry "$NPM_REGISTRY" && \
  npm config set fetch-retries 5 && \
  npm config set fetch-retry-mintimeout 15000 && \
  npm config set fetch-retry-maxtimeout 120000 && \
  npm config set fetch-timeout 600000 && \
  npm config set maxsockets 5 && \
  if [ -f yarn.lock ]; then yarn --frozen-lockfile; \
  elif [ -f package-lock.json ]; then npm ci --no-audit --no-fund; \
  elif [ -f pnpm-lock.yaml ]; then corepack enable pnpm && pnpm i --frozen-lockfile; \
  else npm install --no-audit --no-fund; \
  fi && \
  if [ ! -x node_modules/.bin/next ]; then \
    echo "ERROR: dependency installation is incomplete (node_modules/.bin/next is missing)."; \
    echo "The npm registry '$NPM_REGISTRY' was most likely unreachable from the Docker build."; \
    echo "Retry the build, or point it at a reachable registry, e.g.:"; \
    echo "  NPM_REGISTRY=https://registry.npmmirror.com in .env  (or --build-arg NPM_REGISTRY=...)"; \
    exit 1; \
  fi


# ------------------------------------------------------------------------------
# Stage 2: Build Application
# ------------------------------------------------------------------------------
FROM node:20-alpine AS builder
WORKDIR /app

# Copy the application source first, then the pre-installed dependencies.
# node_modules/.next are excluded by .dockerignore, so the copy below is safe.
COPY . .
COPY --from=deps /app/node_modules ./node_modules

# Optional Build Arguments for Public Edge URL injection
ARG NEXT_PUBLIC_API_BASE_URL
ENV NEXT_PUBLIC_API_BASE_URL=${NEXT_PUBLIC_API_BASE_URL}

ENV PATH=/app/node_modules/.bin:$PATH
# Disable Next.js telemetry collection during build
ENV NEXT_TELEMETRY_DISABLED=1

# Build standalone Next.js production bundle
RUN \
  if [ -f yarn.lock ]; then yarn build; \
  elif [ -f package-lock.json ]; then npm run build; \
  elif [ -f pnpm-lock.yaml ]; then corepack enable pnpm && pnpm run build; \
  else npm run build; \
  fi


# ------------------------------------------------------------------------------
# Stage 3: Minimal Production Runtime
# ------------------------------------------------------------------------------
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Create non-root system group and user (UID/GID 1001)
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy static assets and standalone server from builder stage
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget -qO- http://localhost:3000/ || exit 1

CMD ["node", "server.js"]
