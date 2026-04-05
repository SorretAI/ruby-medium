FROM node:20-alpine

WORKDIR /app

# Install system dependencies
RUN apk add --no-cache \
    git \
    python3 \
    make \
    g++ \
    # Playwright dependencies
    chromium \
    playwright \
    # Timezone data
    tzdata

# Install Node dependencies
COPY package.json .
RUN npm install

# Copy application code
COPY . .

# Build TypeScript
RUN npm run build || true

# Install Playwright browsers
RUN npx playwright install --with-deps chromium

# Create workspace directory
RUN mkdir -p /workspace/artifacts

# Set environment
ENV NODE_ENV=production
ENV PLAYWRIGHT_BROWSERS_PATH=/workspace/browser-data

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD node -e "console.log('healthy')" || exit 1

# Default command
CMD ["node", "dist/index.js"]
