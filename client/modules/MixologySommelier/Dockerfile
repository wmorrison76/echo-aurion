# Multi-stage build for SommelierAI Frontend

# Build stage
FROM node:18-alpine as builder

WORKDIR /app

# Copy package files
COPY package.json package-lock.json pnpm-lock.yaml* ./

# Install dependencies
RUN npm ci --legacy-peer-deps

# Copy source code
COPY . .

# Build the frontend and server
ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}

# Build client (frontend)
RUN npm run build:client

# Build server (backend Node server)
RUN npm run build:server

# Production stage
FROM node:18-alpine

WORKDIR /app

# Install only production dependencies
COPY package.json package-lock.json pnpm-lock.yaml* ./
RUN npm ci --omit=dev --legacy-peer-deps

# Copy built files from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server ./server

# Expose port 3000
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Start the application
CMD ["npm", "start"]
