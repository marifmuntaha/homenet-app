#!/bin/sh

set -e

# Run migrations
echo "Running database migrations..."
node build/bin/console.js migration:run --force

# Run seeders (idempotent)
echo "Running database seeders..."
node build/bin/console.js db:seed

# Setup Crontab for Scheduler
echo "Setting up crontab..."
echo '0 1 * * * cd /app && node build/bin/console.js invoices:auto-generate >> /var/log/cron.log 2>&1' > /etc/crontabs/root
echo '30 1 * * * cd /app && node build/bin/console.js invoices:check-isolation >> /var/log/cron.log 2>&1' >> /etc/crontabs/root
touch /var/log/cron.log

# Start the application via supervisor
echo "Starting all services via supervisor..."
exec /usr/bin/supervisord -c /app/supervisord.conf
