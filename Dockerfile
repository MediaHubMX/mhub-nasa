FROM node:16-alpine AS build
WORKDIR /code
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:16-alpine AS deps
WORKDIR /code
COPY package.json package-lock.json ./
RUN npm ci --production
RUN version=$(node -e "console.log(require('./package-lock.json').packages['node_modules/@mediahubmx/schema'].version)")
RUN npm i @mediahubmx/cassandra-cache@$version && rm -rf node_modules/@mediahubmx/cassandra-cache/node_modules/@mediahubmx

FROM node:16-alpine
WORKDIR /code
ENV LOAD_MEDIAHUBMX_CACHE_MODULE "@mediahubmx/cassandra-cache"
COPY --from=build /code/dist ./dist/
COPY --from=deps /code/node_modules ./node_modules/
USER node
CMD node dist
