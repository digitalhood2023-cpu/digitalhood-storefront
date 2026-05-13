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
COPY --from=build /app/dist ./dist

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

CMD ["npm", "run", "start"]
