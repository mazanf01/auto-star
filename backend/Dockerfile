FROM node:22-alpine

WORKDIR /app

# Install deps
COPY backend/package*.json ./
RUN npm ci --omit=dev

# Copy app
COPY backend/ ./

ENV NODE_ENV=production
ENV PORT=3001

EXPOSE 3001

# Healthcheck
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -qO- http://localhost:3001/health || exit 1

CMD ["node", "server.js"]
