# build app
FROM node:18-alpine as build

WORKDIR /app

COPY package.json ./
COPY yarn.lock ./
COPY tsconfig.json ./
COPY src ./src

RUN yarn install
RUN yarn build

# build prod
FROM node:18-alpine

WORKDIR /app

COPY package.json ./
COPY yarn.lock ./
RUN yarn install --prod

COPY --from=build /app/build .
COPY ./.env.production.local ./.env

RUN yarn global add pm2

EXPOSE 9051
EXPOSE 9052
ENV NODE_ENV=production
CMD ["pm2-runtime", "server.js"]