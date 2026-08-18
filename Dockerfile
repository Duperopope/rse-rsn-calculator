FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY client/package.json client/package-lock.json ./client/
RUN npm ci --prefix client
COPY . .
RUN npm run build && npm prune --omit=dev

FROM node:22-bookworm-slim
ENV NODE_ENV=production PORT=3001 FIMO_DATA_DIR=/data
WORKDIR /app
COPY --from=build --chown=node:node /app /app
RUN mkdir -p /data /app/uploads && chown node:node /data /app/uploads
USER node
EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 CMD node -e "fetch('http://127.0.0.1:3001/api/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"
CMD ["node", "server.js"]
