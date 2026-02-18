FROM node:20-alpine

WORKDIR /app

# Package files copy karo
COPY package*.json ./

# Dependencies install karo
RUN npm install

# Source code copy karo
COPY . .

# TypeScript build karo
RUN npm run build

# Port expose karo
EXPOSE 5000

# Server start karo
CMD ["node", "dist/app.js"]
