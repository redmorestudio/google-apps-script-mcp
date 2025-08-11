FROM node:24.5-alpine AS builder

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm install

COPY . .

ENTRYPOINT ["node", "mcpServer.js"]