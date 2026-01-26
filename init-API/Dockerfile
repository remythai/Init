FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./

RUN npm ci

# Copy source code AFTER installing dependencies
COPY . .

# Production stage
FROM node:20-alpine

WORKDIR /app

# Install wget for healthcheck
RUN apk add --no-cache wget

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Copy only package files
COPY --chown=nodejs:nodejs package*.json ./

# Install production dependencies in the final stage
RUN npm ci --only=production

COPY --chown=nodejs:nodejs . .

USER nodejs

EXPOSE 3000

ENV NODE_ENV=production
ENV PORT=3000

CMD ["node", "server.js"]

