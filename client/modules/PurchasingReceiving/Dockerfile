# Multi-stage build for optimal image size
FROM node:20-alpine AS builder

WORKDIR /app

# Install pnpm
RUN corepack enable pnpm

# Copy dependency files
COPY pnpm-lock.yaml package.json ./

# Install dependencies with verbose logging
RUN echo "Installing dependencies..." && pnpm install --frozen-lockfile 2>&1 | tail -20

# Copy source code
COPY . .

# Build the application with verbose output
RUN echo "Building client..." && pnpm build:client 2>&1 | grep -E "(error|warning|✓|built)" || true
RUN echo "Building server..." && pnpm build:server 2>&1 | grep -E "(error|warning|✓|built)" || true

# Verify build output exists
RUN echo "Verifying build output..." && \
    if [ ! -f dist/spa/index.html ]; then echo "ERROR: dist/spa/index.html not found!" && exit 1; fi && \
    if [ ! -f dist/server/node-build.mjs ]; then echo "ERROR: dist/server/node-build.mjs not found!" && exit 1; fi && \
    echo "✓ Build artifacts verified" && \
    du -sh dist/spa && du -sh dist/server

# Production stage
FROM node:20-alpine

WORKDIR /app

# Install pnpm
RUN corepack enable pnpm

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install production dependencies only
RUN pnpm install --frozen-lockfile --prod

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist

# Verify production files exist
RUN echo "Verifying production build..." && \
    if [ ! -d dist/spa/assets ]; then echo "ERROR: dist/spa/assets not found!" && exit 1; fi && \
    if [ ! -f dist/server/node-build.mjs ]; then echo "ERROR: dist/server/node-build.mjs not found!" && exit 1; fi && \
    echo "✓ Production build verified" && \
    ls -lah dist/spa/ && echo "---" && ls -lah dist/server/ | head -10

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Start the server
CMD ["node", "dist/server/node-build.mjs"]
