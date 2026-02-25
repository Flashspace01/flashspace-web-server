# Use a specific Node version
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Use npm install instead of npm ci to avoid lockfile issues
RUN npm install

# Copy source code
COPY . .

# Build the TypeScript code (if you're using TypeScript)
RUN npm run build

# Expose port
EXPOSE 5000

# Start command
CMD ["node", "dist/app.js"]