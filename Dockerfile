# ------------------------------------------------------------
# 1️⃣ Build stage — compile the React + Tailwind frontend
# ------------------------------------------------------------
FROM node:20-alpine AS build
WORKDIR /app

# Copy and install dependencies
COPY package*.json ./
# Use npm install to generate lockfile on first build
RUN npm install --legacy-peer-deps

RUN npm install axios

# Copy rest of source
COPY . .

# Build the Vite app
RUN npm run build

# Dockerfile (updated snippet - add before the nginx COPY)
# ------------------------------------------------------------
# 2️⃣ Runtime stage — serve via Nginx
# ------------------------------------------------------------
FROM nginx:1.25-alpine
WORKDIR /usr/share/nginx/html

# Copy compiled frontend
COPY --from=build /app/dist ./

# Template nginx config with envsubst for dynamic API_HOST
COPY nginx.conf.template /etc/nginx/conf.d/default.conf.template
RUN apk add --no-cache gettext && \
    envsubst '${API_HOST}' < /etc/nginx/conf.d/default.conf.template > /etc/nginx/conf.d/default.conf && \
    rm /etc/nginx/conf.d/default.conf.template

# Runtime environment (editable via docker-compose)
ENV API_HOST="https://trangaapi.tjcs.io"

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]

