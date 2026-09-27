FROM node:22-alpine AS build

WORKDIR /workspace
RUN npm install --global pnpm@11.19.0

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/api-contracts/package.json packages/api-contracts/package.json
RUN pnpm install --frozen-lockfile

COPY . .
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ENV VITE_SUPABASE_URL=${VITE_SUPABASE_URL}
ENV VITE_SUPABASE_ANON_KEY=${VITE_SUPABASE_ANON_KEY}
RUN pnpm --filter @events/api-contracts build \
  && pnpm --filter @events/api build \
  && pnpm --filter @events/web build

FROM node:22-alpine AS runtime

ENV NODE_ENV=production
WORKDIR /workspace
RUN npm install --global pnpm@11.19.0

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/api-contracts/package.json packages/api-contracts/package.json
COPY --from=build /workspace/packages/api-contracts/dist packages/api-contracts/dist
RUN pnpm install --prod --frozen-lockfile

COPY --from=build /workspace/apps/api/dist apps/api/dist
COPY --from=build /workspace/apps/web/dist apps/web/dist

EXPOSE 10000
USER node
CMD ["node", "apps/api/dist/index.js"]
