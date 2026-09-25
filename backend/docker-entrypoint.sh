#!/bin/sh

echo "Running Prisma migrations..."
npx prisma migrate deploy || { echo "WARNING: migration failed or skipped, continuing anyway"; }

echo "Seeding required default access data..."
# The seed is idempotent: it creates the initial administrator only when it
# does not exist and keeps existing accounts/passwords intact.
npx prisma db seed || { echo "WARNING: database seed failed, continuing anyway"; }

echo "Starting backend..."
exec node dist/src/main
