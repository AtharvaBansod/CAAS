# Messaging Service Dockerfile
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --production

# Copy source code
COPY . .

# Build TypeScript
RUN npm install -g typescript && \
    npm run build && \
    npm uninstall -g typescript

# Expose port (if needed for health checks)
EXPOSE 3004

# Start the service
CMD ["npm", "start"]
