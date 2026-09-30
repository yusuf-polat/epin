# ─── Bağımlılıklar ────────────────────────────────────────────────────────────
FROM node:22-slim AS deps
WORKDIR /app

RUN apt-get update -y && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*
ENV PRISMA_HIDE_UPDATE_MESSAGE=1

COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci && npx prisma generate

# ─── Test (docker compose --profile test run --rm backend-test) ───────────────
FROM deps AS test
COPY tsconfig.json vitest.config.mts vitest.integration.config.mts ./
COPY src ./src
COPY tests ./tests
CMD ["npm", "test"]

# ─── Build ────────────────────────────────────────────────────────────────────
FROM deps AS builder
COPY tsconfig.json ./
COPY src ./src
RUN npm run build && npm prune --omit=dev

# ─── Runtime ──────────────────────────────────────────────────────────────────
FROM node:22-slim AS runner
WORKDIR /app

RUN apt-get update -y && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
ENV PRISMA_HIDE_UPDATE_MESSAGE=1

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY prisma ./prisma/
COPY docker-entrypoint.sh ./docker-entrypoint.sh
RUN sed -i 's/\r$//' ./docker-entrypoint.sh && chmod +x ./docker-entrypoint.sh && mkdir -p /app/uploads

EXPOSE 5000

HEALTHCHECK --interval=15s --timeout=5s --start-period=30s --retries=5 \
  CMD node -e "fetch('http://127.0.0.1:5000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["./docker-entrypoint.sh"]
