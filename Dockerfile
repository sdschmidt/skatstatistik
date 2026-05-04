# syntax=docker/dockerfile:1.7

FROM node:22-alpine AS base
RUN corepack enable

FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml .npmrc ./
RUN pnpm install --frozen-lockfile

FROM base AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm build && pnpm prune --prod

FROM base AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0
COPY --from=build /app/build ./build
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json
# Drizzle migrations, seed CSVs, and scripts (added in later milestones).
# Defensive ./empty target prevents COPY from failing if a dir is absent
# during early scaffolding.
COPY --from=build /app/drizzle ./drizzle
COPY --from=build /app/scripts ./scripts
COPY --from=build /app/seed ./seed
COPY --from=build /app/drizzle.config.ts ./drizzle.config.ts
EXPOSE 3000
# Migrations apply on each start; drizzle-orm's migrator is idempotent.
CMD ["sh", "-c", "node scripts/migrate.js && node build/index.js"]
