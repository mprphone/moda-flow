FROM node:22-alpine AS base
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .

# Desenvolvimento local (docker-compose usa este target)
FROM base AS dev
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]

# Build de produção — o VITE_API_URL é embebido no build (Railway passa-o como build arg)
FROM base AS build
ARG VITE_API_URL=http://localhost:8000/api
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

# Produção: serve os ficheiros estáticos na porta fixa 5173 — no Railway, o domínio deve apontar para a 5173
FROM node:22-alpine AS production
WORKDIR /app
RUN npm install -g serve
COPY --from=build /app/dist ./dist
CMD ["serve", "-s", "dist", "-l", "5173"]
