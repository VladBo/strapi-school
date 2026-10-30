FROM node:20-bookworm-slim AS build

WORKDIR /app
ENV NODE_OPTIONS=--max-old-space-size=3072

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm install --package-lock=false --include=optional --legacy-peer-deps --prefix src/plugins/h5p \
  && npm run build \
  && npm prune --omit=dev \
  && rm -rf src/plugins/h5p/node_modules \
  && npm install --package-lock=false --omit=dev --include=optional --legacy-peer-deps --prefix src/plugins/h5p

FROM node:20-bookworm-slim AS runtime

WORKDIR /app
ENV NODE_ENV=production
ENV HOST=0.0.0.0

COPY --from=build /app/package.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/dist/config ./config
COPY --from=build /app/config/sync ./config/sync
COPY --from=build /app/public ./public
COPY --from=build /app/src ./src

EXPOSE 1337
CMD ["npm", "start"]
