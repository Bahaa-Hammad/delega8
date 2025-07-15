# -----------------------------
# 1) Build Stage
# -----------------------------
    FROM node:18-alpine AS builder

    # Create and set the working directory
    WORKDIR /app
    
    # Copy package.json and package-lock.json (or yarn.lock if you use yarn)
    COPY package*.json ./
    
    # Install dependencies for development (including devDependencies needed to build)
    RUN npm install
    
    # Copy the rest of your application's source code
    COPY . .
    
    # Build the NestJS application
    RUN npm run build
    
    # -----------------------------
    # 2) Production Stage
    # -----------------------------
    FROM node:18-alpine AS production
    
    # Set the working directory
    WORKDIR /app
    
    # Copy only the package.json and lock files to install production dependencies
    COPY package*.json ./
    
    # Install only the production dependencies
    RUN npm ci --omit=dev
    
    # Copy the build output from the 'builder' stage
    COPY --from=builder /app/dist ./dist
    
    # Optional: if you have additional files (like migrations, public assets, etc.) 
    #           to be included in production, copy them as well:
    # COPY --from=builder /app/some-other-folder ./some-other-folder
    
    # Expose the application's port (NestJS typically uses port 3000)
    EXPOSE 8080
    
    # Start the application
    CMD ["node", "dist/src/main"]
    