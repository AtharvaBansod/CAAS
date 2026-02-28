FROM node:20-slim
WORKDIR /workspace
COPY package.json tsconfig.json ./
RUN npm install --no-audit --no-fund
COPY src ./src
COPY tests ./tests
RUN npm run build
CMD ["npm", "test"]
