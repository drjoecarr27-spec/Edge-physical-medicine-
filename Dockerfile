FROM node:22-alpine
WORKDIR /app
COPY server.mjs theme.css enhance.js ./
RUN node --check server.mjs && node --check enhance.js && node server.mjs --snapshot
ENV NODE_ENV=production
EXPOSE 8080
CMD ["node", "server.mjs"]
