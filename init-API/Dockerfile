FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json tsconfig.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine

WORKDIR /app

# Install wget for healthcheck
RUN apk add --no-cache wget

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Copy only package files first (layer cache)
COPY --chown=nodejs:nodejs package*.json ./

# Install production dependencies only
RUN npm ci --omit=dev

# Copy compiled output from builder
COPY --chown=nodejs:nodejs --from=builder /app/dist ./dist

# Copy migration files
COPY --chown=nodejs:nodejs migrations ./migrations

# Create uploads directory with correct permissions
RUN mkdir -p /app/uploads/photos && \
    chown -R nodejs:nodejs /app/uploads && \
    chmod -R 755 /app/uploads

USER nodejs

EXPOSE 3000

ENV NODE_ENV=production
ENV PORT=3000
ENV UPLOAD_DIR=/app/uploads

CMD ["node", "dist/server.js"]
