FROM node:20-slim

WORKDIR /tests/fresh_e2e

COPY package.json ./
RUN npm install --no-audit --no-fund

COPY run-fresh.js ./

CMD ["npm", "test"]
