# ==============================================================================
# ⛵ Paperboat Education ERP & ExamForge Engine - Backend Dockerfile
# Multi-Stage Node.js 20 Alpine Production Container
# ==============================================================================

# STAGE 1: Build & Dependencies
FROM node:20-alpine AS builder

WORKDIR /app

# Install build tools for native packages (bcrypt, etc.)
RUN apk add --no-cache python3 make g++

# Copy package manifests
COPY package*.json ./
COPY tsconfig*.json ./
COPY prisma ./prisma/

# Install all dependencies including devDependencies for build
RUN npm ci

# Generate Prisma client
RUN npx prisma generate

# Copy source code
COPY src ./src

# Build TypeScript to dist/
RUN npm run build

# STAGE 2: Production Runtime
FROM node:20-alpine AS runner

WORKDIR /app

# Set production environment
ENV NODE_ENV=production
ENV PORT=5001

# Add non-root system user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 paperboat

# Copy package manifests & install production dependencies only
COPY package*.json ./
COPY prisma ./prisma/

RUN apk add --no-cache python3 make g++ && \
    npm ci --only=production && \
    npx prisma generate && \
    apk del python3 make g++

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist

# Set file ownership to non-root user
RUN chown -R paperboat:nodejs /app

USER paperboat

EXPOSE 5001

# Healthcheck to verify backend status
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:5001/api/health || exit 1

# Start the application
CMD ["node", "dist/index.js"]
