# Gateway Service Dockerfile
# Phase 4.5.z - Updated for compliance-client package

FROM node:20-alpine AS package-builder

WORKDIR /app/packages/compliance-client

# Copy and build compliance-client package
COPY packages/compliance-client/package*.json ./
COPY packages/compliance-client/tsconfig.json ./
COPY packages/compliance-client/src ./src

RUN npm install && npm run build

# Service builder stage
FROM node:20-alpine AS builder

# Create proper directory structure
WORKDIR /

# Copy built compliance-client package to proper location
COPY --from=package-builder /app/packages/compliance-client ./packages/compliance-client

# Copy service files
WORKDIR /services/gateway
COPY services/gateway/package*.json ./
COPY services/gateway/tsconfig.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY services/gateway/src ./src

# Build TypeScript
RUN npm run build

# Production image
FROM node:20-alpine

# Create proper directory structure
WORKDIR /

# Copy built compliance-client package
COPY --from=package-builder /app/packages/compliance-client ./packages/compliance-client

# Copy service files
WORKDIR /services/gateway
COPY services/gateway/package*.json ./

# Install production dependencies only
RUN npm install --only=production

# Copy built files from builder
COPY --from=builder /services/gateway/dist ./dist

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Change ownership
RUN chown -R nodejs:nodejs /services/gateway

# Switch to non-root user
USER nodejs

# Set environment
ENV NODE_ENV=production

# Expose ports
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start application
CMD ["node", "dist/src/main.js"]
