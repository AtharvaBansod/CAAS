# Compliance Service Dockerfile - Optimized
# Stage 1: Builder
FROM node:20 AS builder

WORKDIR /app

# Copy package files separately for better caching
COPY services/compliance-service/package*.json ./
RUN npm install

# Copy source and build
COPY services/compliance-service/src ./src
COPY services/compliance-service/tsconfig.json ./
RUN npm run build
RUN npm prune --production

# Stage 2: Production final image
FROM node:20-slim AS runner
WORKDIR /app
ENV NODE_ENV=production

# Install dumb-init
RUN apt-get update && apt-get install -y dumb-init && rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

# Non-root user
RUN groupadd -g 1001 nodejs && useradd -m -u 1001 -g nodejs nodejs
RUN chown -R nodejs:nodejs /app
USER nodejs

EXPOSE 3008
HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3008/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/src/index.js"]
