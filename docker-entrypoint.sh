#!/bin/sh
set -e

node prisma/migrate.mjs

echo "Starting application..."
exec node server.js
