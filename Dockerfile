# syntax=docker/dockerfile:1

# ---- Build: tests + static bundle of web/ ----
FROM node:22-alpine AS build
WORKDIR /app

# The site reads the generated model data from ../data (see web/scripts/sync-data.mjs).
COPY data ./data

COPY web/package.json web/package-lock.json ./web/
RUN cd web && npm ci --no-audit --no-fund

COPY web ./web
# The browser model must still equal the Python model; a failing test stops the deploy.
RUN cd web && npm test && npm run build \
 && chmod -R a+rX dist

# ---- Serve: nginx on port 8080 (Cloud Run) ----
FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/web/dist /usr/share/nginx/html
EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]
