# Build stage
FROM node:22-alpine AS build

WORKDIR /app

# Install dependencies based on the preferred package manager
COPY package*.json ./
RUN npm install

# Copy source
COPY . .

# Build the AdonisJS app
RUN node ace build

# Production stage
FROM node:22-alpine

# Install dependencies for operations
RUN apk add --no-cache tzdata supervisor
ENV TZ=Asia/Jakarta

WORKDIR /app

# Copy built assets and necessary files from build stage
COPY --from=build /app/build ./build
COPY --from=build /app/package*.json ./
COPY --from=build /app/node_modules ./node_modules
COPY docker-entrypoint.sh ./
COPY supervisord.conf ./
RUN chmod +x docker-entrypoint.sh

# Environment variables
ENV NODE_ENV=production
ENV PORT=3333
ENV HOST=0.0.0.0

# Expose port
EXPOSE 3333

# Start the server
CMD ["node", "build/bin/server.js"]
