#!/bin/bash

# Load environment variables from .env file
export $(grep -v '^#' .env | xargs)

# Start the database using Docker Compose
docker-compose up -d

# Wait for the database to be ready
echo "Waiting for the database to start..."
while ! nc -z localhost 5432; do
  sleep 1
done

echo "Database is up and running."

# Installing Dependencies
echo "Starting to installing dependencies"
npm i

# Start the NestJS application with nodemon for file watching
echo "Starting NestJS application with file watching..."
npm run start:dev

