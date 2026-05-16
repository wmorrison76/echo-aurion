# --- Build stage ---
FROM node:18-bullseye AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci || npm i
COPY . .
# Allow custom entry via env (default src/index.jsx)
ARG BUILD_ENTRY=src/index.jsx
ENV BUILD_ENTRY=$BUILD_ENTRY
RUN node scripts/build_prod.mjs || echo "Skipping esbuild bundle (scripts/build_prod.mjs not present or esbuild missing)."

# --- Runtime stage (nginx for static) ---
FROM nginx:1.27-alpine AS runtime
WORKDIR /usr/share/nginx/html
COPY --from=build /app/dist ./
# Fallback index for SPA routes
RUN printf '%s' "<!doctype html><title>Echo Capstone</title><div id='root'></div><script type='module' src='/index.js'></script>" > index.html || true
# Copy default nginx config for SPA
COPY docker/nginx-spa.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
