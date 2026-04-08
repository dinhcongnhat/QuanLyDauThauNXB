#!/bin/sh
set -e

echo "Running Prisma migrations..."
npx prisma migrate deploy 2>/dev/null || npx prisma db push --accept-data-loss

echo "Seeding database..."
node dist/prisma/seed.js 2>/dev/null || echo "Seed skipped (already done or error)"

echo "Starting backend..."
exec node dist/src/main
