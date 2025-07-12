FROM ghcr.io/puppeteer/puppeteer:24.12.1 AS base
WORKDIR /app

FROM base AS build
USER root
COPY package.json ./
RUN npm install
RUN npx puppeteer browsers install chrome
COPY . .

RUN chown -R node:node /app
USER node

RUN npm run build

FROM base AS production

EXPOSE 3000
ENV NODE_ENV=production
COPY --from=build /app/.output ./.output
COPY --from=build /root/.cache/puppeteer/ /root/.cache/puppeteer/

CMD ["node", ".output/server/index.mjs"]
