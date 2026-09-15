FROM node:20-alpine

# Set working directory
WORKDIR /usr/src/app

# Install dependencies first for better caching
COPY package*.json ./
RUN npm install --omit=dev

# Copy application source
COPY . .

# Set environment
ENV NODE_ENV=production
ENV PORT=3000

# Use non-root user for security
USER node

# Expose API port
EXPOSE 3000

# Start server
CMD ["node", "src/server.js"]
