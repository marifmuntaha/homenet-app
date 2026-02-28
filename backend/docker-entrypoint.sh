#!/bin/sh

set -e

# Run migrations
echo "Running database migrations..."
node build/bin/console.js migration:run --force

# Run seeders (idempotent)
echo "Running database seeders..."
node build/bin/console.js db:seed

# Start the application
echo "Starting application..."
exec node build/bin/server.js
