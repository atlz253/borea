FROM node:22-bookworm-slim AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm install --global npm@11.6.2 && npm ci

COPY . .
RUN npm run build

FROM node:22-bookworm-slim AS runtime

RUN apt-get update \
	&& apt-get install --yes --no-install-recommends ca-certificates git \
	&& rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production \
	HOST=0.0.0.0 \
	PORT=3000

WORKDIR /app

RUN mkdir -p /app/data && chown node:node /app/data

COPY --from=build --chown=node:node /app/.output ./.output
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/prisma ./prisma
COPY --from=build --chown=node:node /app/prisma.config.ts ./

USER node

EXPOSE 3000
VOLUME ["/app/data"]

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
	CMD ["node", "-e", "fetch(`http://127.0.0.1:${process.env.PORT ?? '3000'}/`).then((response) => { if (response.status >= 500) process.exit(1); }).catch(() => process.exit(1));"]

ENTRYPOINT ["sh", "-c", "node node_modules/prisma/build/index.js migrate deploy && exec node .output/server/index.mjs"]
