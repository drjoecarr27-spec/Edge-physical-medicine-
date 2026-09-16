FROM node:22-alpine AS builder
WORKDIR /app
RUN apk add --no-cache chromium ttf-freefont && npm install --ignore-scripts --no-audit --no-fund playwright-core@1.55.1
COPY server.mjs theme.css enhance.js verify.mjs ./
RUN node --check server.mjs && node --check enhance.js && node server.mjs --snapshot && node verify.mjs
FROM node:22-alpine
WORKDIR /app
COPY server.mjs theme.css enhance.js ./
COPY --from=builder /app/snapshot ./snapshot
ENV NODE_ENV=production
EXPOSE 8080
CMD ["node", "server.mjs"]
