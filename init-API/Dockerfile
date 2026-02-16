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
RUN --mount=type=cache,target=/root/.npm npm ci --omit=dev

# Copy source code
COPY --chown=nodejs:nodejs . .

# Create uploads directory with correct permissions
RUN mkdir -p /app/uploads/photos && \
    chown -R nodejs:nodejs /app/uploads && \
    chmod -R 755 /app/uploads

USER nodejs

EXPOSE 3000

ENV NODE_ENV=production
ENV PORT=3000

CMD ["node", "server.js"]
