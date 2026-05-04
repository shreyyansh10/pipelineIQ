FROM node:20-alpine

# Install OpenSSL for Prisma
RUN apk add --no-cache openssl

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install ALL dependencies (prisma CLI is needed for db push)
RUN npm ci

# Copy prisma schema
COPY prisma ./prisma/

# Generate Prisma Client
RUN npx prisma generate

# Copy application code
COPY . .

# Expose port
EXPOSE 8005

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=5 \
  CMD node -e "require('http').get('http://127.0.0.1:8005/health', (r) => { process.exit(r.statusCode === 200 ? 0 : 1); })"

# Run migrations then start
CMD npx prisma db push && node server.js
