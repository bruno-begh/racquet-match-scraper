# Use official Node.js image with Playwright support
FROM mcr.microsoft.com/playwright:v1.40.1-jammy

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install ALL dependencies (including devDependencies for build)
RUN npm install

# Install Playwright browsers
RUN npx playwright install chromium

# Copy TypeScript config and source code
COPY tsconfig.json ./
COPY src ./src

# Build TypeScript
RUN npm run build

# Remove devDependencies and source files after build
RUN npm prune --production
RUN rm -rf src tsconfig.json

# Expose port (Railway will assign this dynamically)
EXPOSE 3001

# Set environment to production
ENV NODE_ENV=production

# Start the service
CMD ["node", "dist/index.js"]
