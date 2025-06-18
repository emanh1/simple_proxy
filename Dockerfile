FROM node:24.0.2-alpine as base
WORKDIR /app

FROM base as build

COPY package.json ./
RUN npm install
RUN npx puppeteer browsers install chrome
COPY . .
RUN npm run build

FROM base as production

EXPOSE 3000
ENV NODE_ENV=production
COPY --from=build /app/.output ./.output
COPY --from=build /root/.cache/puppeteer/ /root/.cache/puppeteer/

CMD ["node", ".output/server/index.mjs"]
