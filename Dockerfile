# build app
FROM node:16.13.2-alpine as build

WORKDIR /app

COPY package.json ./
COPY yarn.lock ./
COPY tsconfig.json ./
COPY src ./src

RUN yarn install
RUN yarn build

# build prod
FROM node:16.13.2-alpine

WORKDIR /app

COPY package.json ./
COPY yarn.lock ./
RUN yarn install --prod

COPY --from=build /app/build .
COPY ./.env.production.local ./.env

RUN yarn global add pm2

EXPOSE 9051
CMD ["pm2-runtime","server.js"]