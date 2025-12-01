FROM node:21-alpine

WORKDIR /app

# Copy only package files first (for better layer caching)
COPY frontend/package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY frontend/ ./

# Ensure scripts are executable
RUN chmod -R a+x node_modules/.bin

# Expose port
EXPOSE 3000

# Run dev server (same as npm run dev locally)
# This avoids the build step which is causing issues in Docker
CMD ["npm", "run", "dev", "--", "-H", "0.0.0.0"]
