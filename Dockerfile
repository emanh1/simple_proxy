FROM node:current-alpine3.22 AS base
WORKDIR /app

FROM base AS build
COPY package.json ./
RUN npm install
COPY . .

RUN npm run build

FROM ghcr.io/puppeteer/puppeteer:latest AS production

EXPOSE 3000
ENV NODE_ENV=production
COPY --from=build /app/.output ./.output

CMD ["node", ".output/server/index.mjs"]