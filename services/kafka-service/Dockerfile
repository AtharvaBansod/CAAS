# Kafka Service Dockerfile - Optimized
# Stage 1: Builder
FROM node:20-alpine AS builder
WORKDIR /app
COPY services/kafka-service/package*.json ./
COPY services/kafka-service/tsconfig.json ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci 2>/dev/null || npm install
COPY services/kafka-service/src ./src
RUN npm run build

# Stage 2: Production
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN --mount=type=cache,target=/var/cache/apk \
    apk add --no-cache dumb-init

# Install production dependencies
COPY services/kafka-service/package*.json ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci --only=production 2>/dev/null || npm install --only=production

# Copy built artifacts
COPY --from=builder /app/dist ./dist

# Non-root user
RUN addgroup -g 1001 -S nodejs && adduser -S kafka -u 1001
USER kafka

EXPOSE 9999

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('./dist/client/health-check.js').healthCheck().then(() => process.exit(0)).catch(() => process.exit(1))"

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/index.js"]