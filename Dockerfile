FROM node:22-bookworm-slim AS frontend

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY index.html index.css index.js vite.config.js ./
COPY public ./public

RUN npm run build

FROM eclipse-temurin:21-jdk-jammy

WORKDIR /app

COPY json.jar .
COPY Server.java .
COPY --from=frontend /app/dist ./dist

RUN javac -cp json.jar Server.java

EXPOSE 10000

CMD ["java", "-cp", ".:json.jar", "Server"]
