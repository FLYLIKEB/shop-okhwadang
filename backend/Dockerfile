FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json .npmrc ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-alpine
WORKDIR /app
COPY package*.json .npmrc ./
RUN npm ci --omit=dev
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/src/database/migrations ./src/database/migrations
COPY --from=builder /app/keys ./keys
EXPOSE 3000
CMD ["node", "dist/main"]
