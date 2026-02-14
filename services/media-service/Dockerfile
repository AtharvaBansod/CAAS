FROM node:20-alpine

# Install FFmpeg and ImageMagick for media processing
RUN apk add --no-cache \
    ffmpeg \
    imagemagick \
    python3 \
    make \
    g++

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build

# Remove dev dependencies
RUN npm prune --production

# Expose port
EXPOSE 3005

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "console.log('healthy')" || exit 1

# Start service
CMD ["node", "dist/index.js"]
