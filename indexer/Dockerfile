FROM node:18-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy Prisma schema
COPY prisma ./prisma/
RUN npx prisma generate

# Copy source code
COPY dist ./dist/

# Expose port
EXPOSE 4000

# Start the server
CMD ["node", "dist/index.js"]