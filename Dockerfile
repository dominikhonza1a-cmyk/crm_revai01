# Jeden image → dva procesy (web `npm run start`, worker `npm run worker`). Viz docker-compose.yml.
FROM node:20-slim AS base
WORKDIR /app
ENV NODE_ENV=production

FROM base AS deps
COPY package.json ./
RUN npm install --omit=dev

FROM base AS build
COPY package.json ./
RUN npm install
COPY . .
RUN npm run build

FROM base AS runtime
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/.next ./.next
COPY . .
EXPOSE 3000
CMD ["npm", "run", "start"]
