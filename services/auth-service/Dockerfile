# Auth Service Dockerfile - Optimized
# Stage 1: Build shared compliance-client package
FROM node:20 AS package-builder
WORKDIR /app/packages/compliance-client
COPY packages/compliance-client/package*.json ./
RUN npm install
COPY packages/compliance-client/tsconfig.json ./
COPY packages/compliance-client/src ./src
RUN npm run build

# Stage 2: Service builder stage
FROM node:20 AS builder

WORKDIR /services/auth-service
# Copy shared client
COPY --from=package-builder /app/packages/compliance-client /packages/compliance-client

# Copy dependencies first
COPY services/auth-service/package*.json ./
COPY services/auth-service/tsconfig.json ./
RUN npm install

# Copy source and build
COPY services/auth-service/src ./src
RUN npm run build
RUN npm prune --production

# Stage 3: Production final image
FROM node:20-slim AS runner
WORKDIR /services/auth-service
ENV NODE_ENV=production

# Install dumb-init
RUN apt-get update && apt-get install -y dumb-init && rm -rf /var/lib/apt/lists/*

COPY --from=builder /packages/compliance-client /packages/compliance-client
COPY --from=builder /services/auth-service/dist ./dist
COPY --from=builder /services/auth-service/node_modules ./node_modules
COPY --from=builder /services/auth-service/package.json ./package.json

# Non-root user
RUN groupadd -g 1001 nodejs && useradd -m -u 1001 -g nodejs nodejs
RUN chown -R nodejs:nodejs /services/auth-service
USER nodejs

EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/server.js"]
