#!/bin/sh

echo "Running Prisma migrations..."
npx prisma migrate deploy || { echo "WARNING: migration failed or skipped, continuing anyway"; }

echo "Starting backend..."
exec node dist/src/main
