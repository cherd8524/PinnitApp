# PinnitApp - Expo dev server with tunnel for Expo Go (view from anywhere)
FROM node:20-alpine

WORKDIR /app

# Install dependencies first (better layer cache)
COPY package.json package-lock.json* ./
RUN npm ci

# Copy app source
COPY . .

# Metro bundler default port; tunnel creates public URL for Expo Go
EXPOSE 8081

# Non-interactive for CI/Docker; tunnel gives public URL for Expo Go
ENV CI=1
ENV EXPO_DEVTOOLS_LISTEN_ADDRESS=0.0.0.0

# Run Expo with tunnel so anyone can open in Expo Go via QR/URL
CMD ["npx", "expo", "start", "--tunnel"]
