FROM node:24.0.2-alpine as base
WORKDIR /app

FROM base as build

COPY package.json ./
RUN npm install
COPY . .
RUN npm run build

FROM base as production

EXPOSE 3000
ENV NODE_ENV=production
COPY --from=build /app/.output ./.output

CMD ["node", ".output/server/index.mjs"]