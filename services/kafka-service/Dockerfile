# Multi-stage build for Kafka Service
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY src/ ./src/

# Build TypeScript
RUN npm run build

# Production stage
FROM node:20-alpine AS production

WORKDIR /app

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S kafka -u 1001

# Copy built application
COPY --from=builder --chown=kafka:nodejs /app/dist ./dist
COPY --from=builder --chown=kafka:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=kafka:nodejs /app/package.json ./

# Switch to non-root user
USER kafka

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('./dist/client/health-check.js').healthCheck().then(() => process.exit(0)).catch(() => process.exit(1))"

# Expose metrics port
EXPOSE 9999

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/index.js"]