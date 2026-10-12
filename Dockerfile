FROM node:22-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
RUN npm run build

FROM node:22-slim
WORKDIR /app
ENV NODE_ENV=production PREFORTE_DATA_DIR=/dados PORT=3000
COPY --from=build /app /app
VOLUME /dados
EXPOSE 3000
CMD ["npx", "vinext", "start", "--port", "3000"]
