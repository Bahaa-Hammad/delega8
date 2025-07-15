#!/bin/sh
set -e

python -m chromadb start \
  --db postgresql \
  --db-host "$DB_HOST" \
  --db-port "$DB_PORT" \
  --db-username "$DB_USER" \
  --db-password "$DB_PASSWORD" \
  --db-database "$DB_NAME" \
  --bind 0.0.0.0 \
  --port 8000
