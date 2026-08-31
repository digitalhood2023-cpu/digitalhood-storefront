FROM node:22.12-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

FROM node:22.12-alpine AS production

WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev

COPY server.js ./server.js
COPY server ./server
COPY --from=build /app/dist ./dist

ENV NODE_ENV=production
ENV PORT=3000

# Route every first-level seller hostname to this shared storefront container.
# The proxy owns the wildcard certificate; application middleware still resolves
# the exact seller identity and fails closed for unknown or suspended hosts.
LABEL traefik.enable="true" \
  traefik.http.routers.digitalhood-seller-http.entryPoints="http" \
  traefik.http.routers.digitalhood-seller-http.middlewares="redirect-to-https" \
  traefik.http.routers.digitalhood-seller-http.rule="HostRegexp(`^[a-z0-9-]+\\.store\\.digitalhood\\.info$`)" \
  traefik.http.routers.digitalhood-seller-http.service="digitalhood-seller-storefront" \
  traefik.http.routers.digitalhood-seller-https.entryPoints="https" \
  traefik.http.routers.digitalhood-seller-https.middlewares="gzip" \
  traefik.http.routers.digitalhood-seller-https.rule="HostRegexp(`^[a-z0-9-]+\\.store\\.digitalhood\\.info$`)" \
  traefik.http.routers.digitalhood-seller-https.service="digitalhood-seller-storefront" \
  traefik.http.routers.digitalhood-seller-https.tls.certresolver="letsencrypt" \
  traefik.http.routers.digitalhood-seller-https.tls="true" \
  traefik.http.services.digitalhood-seller-storefront.loadbalancer.server.port="3000"

EXPOSE 3000

CMD ["npm", "run", "start"]
