# Opesi Mansion Mascots: one image holding the built website and the Node server that draws every icon.
FROM node:24-slim AS base
ENV PNPM_HOME=/pnpm PATH=/pnpm:$PATH CI=true
RUN corepack enable
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/server/package.json apps/server/
COPY apps/web/package.json apps/web/
COPY packages/engine/package.json packages/engine/

# Build the static website.
FROM base AS build
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm build

# Run the server with production dependencies only.
FROM base AS runtime
ENV NODE_ENV=production
RUN pnpm install --frozen-lockfile --prod --filter "@opesi-mascots/server..."
COPY packages/engine/src packages/engine/src
COPY apps/server/src apps/server/src
COPY --from=build /app/apps/web/dist apps/web/dist
USER node
EXPOSE 3000
CMD ["node", "apps/server/src/index.mjs"]
