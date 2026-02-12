# PinnitApp - Expo dev server for Expo Go (LAN/public IP access)
FROM node:20-alpine

WORKDIR /app

# Install dependencies first (better layer cache)
COPY package.json package-lock.json* ./
RUN npm ci

# Copy app source
COPY . .

# Metro / Expo ports (LAN/public IP access)
EXPOSE 8081 19000 19001

# Non-interactive for CI/Docker
ENV CI=1
ENV EXPO_DEVTOOLS_LISTEN_ADDRESS=0.0.0.0

# Run Expo in LAN mode; use server IP in Expo Go
CMD ["npx", "expo", "start", "--lan"]
