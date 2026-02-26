FROM node:20-slim

WORKDIR /tests/new_e2e

COPY package*.json ./
RUN npm install --omit=dev --no-audit --no-fund

COPY . .

CMD ["npm", "test"]
