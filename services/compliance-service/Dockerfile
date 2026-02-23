# Multi-stage build for compliance service
FROM node:20-alpine AS builder

WORKDIR /app

# Copy service files
COPY services/compliance-service/package*.json ./
COPY services/compliance-service/tsconfig.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY services/compliance-service/src ./src

# Build TypeScript
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Copy package files and install production dependencies
COPY services/compliance-service/package*.json ./
RUN npm install --only=production

# Copy built files from builder
COPY --from=builder /app/dist ./dist

# Create non-root user
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001
USER nodejs

# Expose port
EXPOSE 3008

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3008/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start service with dumb-init
CMD ["dumb-init", "node", "dist/src/server.js"]
