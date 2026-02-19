# ==========================================
# STAGE 1: Builder
# We use a larger image with full dev tools to build the app
# ==========================================
# Use Node.js 20 on Alpine Linux as the base image for building (small, secure)
FROM node:20-alpine AS builder

# Set the working directory inside the container to /app
WORKDIR /app

# Copy package.json and package-lock.json first to leverage Docker layer caching
COPY package*.json ./

# Install ALL dependencies (including devDependencies needed for 'tsc')
# 'npm ci' is faster and more reliable than 'npm install' for CI/CD/Docker
RUN npm ci

# Copy the rest of the application source code
COPY . .

# Build the TypeScript code (result goes to /dist)
RUN npm run build

# ==========================================
# STAGE 2: Runner
# We use a clean, minimal image for production
# ==========================================
# Start fresh with the same Alpine Node image
FROM node:20-alpine AS runner

# Set the working directory
WORKDIR /app

# Set NODE_ENV to production to optimize Express/Node performance
ENV NODE_ENV=production

# Copy package.json and package-lock.json again to install ONLY production deps
COPY package*.json ./

# Install only production dependencies (this significantly reduces image size)
# --only=production skips devDependencies
RUN npm ci --only=production && npm cache clean --force

# Copy the built artifacts from the 'builder' stage
# This keeps the final image devoid of TypeScript source code and dev tools
COPY --from=builder /app/dist ./dist

# Create uploads directory and ensure correct permissions for the 'node' user
RUN mkdir -p uploads && chown -R node:node uploads

# Create a non-root user 'node' (provided by the image) for security
# Running as root is a security risk if the container is compromised
USER node

# Expose port 8000 (standard for this app based on common conventions, adjust if needed)
EXPOSE 8000

# Define the command to run the application using the built JS files
CMD ["node", "dist/app.js"]
