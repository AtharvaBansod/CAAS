FROM node:20-slim

WORKDIR /sdk

COPY package.json package-lock.json* ./
RUN --mount=type=cache,target=/root/.npm \
    npm install --no-audit --no-fund --prefer-offline

COPY tsconfig.json ./
COPY src ./src
COPY tests ./tests

CMD ["npm", "test"]
