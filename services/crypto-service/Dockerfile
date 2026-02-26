# Crypto Service Dockerfile - Optimized
# Stage 1: Build shared compliance-client package
FROM node:20-alpine AS package-builder
WORKDIR /app/packages/compliance-client
COPY packages/compliance-client/package*.json ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci 2>/dev/null || npm install
COPY packages/compliance-client/tsconfig.json ./
COPY packages/compliance-client/src ./src
RUN npm run build

# Stage 2: Service builder stage
FROM node:20-alpine AS builder
WORKDIR /services/crypto-service
COPY services/crypto-service/package*.json ./
COPY services/crypto-service/tsconfig.json ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci 2>/dev/null || npm install

# Copy shared client
WORKDIR /
COPY --from=package-builder /app/packages/compliance-client ./packages/compliance-client

# Copy source and build
WORKDIR /services/crypto-service
COPY services/crypto-service/src ./src
RUN npm run build

# Stage 3: Production stage
FROM node:20-alpine AS runner
ENV NODE_ENV=production

RUN --mount=type=cache,target=/var/cache/apk \
    apk add --no-cache dumb-init

# Copy built compliance-client package
WORKDIR /
COPY --from=package-builder /app/packages/compliance-client ./packages/compliance-client

# Install production dependencies only
WORKDIR /services/crypto-service
COPY services/crypto-service/package*.json ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci --only=production 2>/dev/null || npm install --only=production

# Copy built artifacts from builder
COPY --from=builder /services/crypto-service/dist ./dist

# Non-root user
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001 && \
    chown -R nodejs:nodejs /services /packages
USER nodejs

EXPOSE 3009

HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3009/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/src/server.js"]
