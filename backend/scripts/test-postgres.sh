#!/usr/bin/env bash
# backend/scripts/test-postgres.sh
#
# Run the backend tests against PostgreSQL (the database production and CI use) instead of SQLite.
# SQLite accepts things PostgreSQL rejects, e.g. SELECT ... FOR UPDATE across an optional join,
# so run this before pushing anything that touches queries, locking or migrations.
#
#   ./scripts/test-postgres.sh                 # whole suite
#   ./scripts/test-postgres.sh apps.ops        # one app (any manage.py test arguments work)
#   KEEP_DB=1 ./scripts/test-postgres.sh       # leave the container running for the next run (faster)
#   ./scripts/test-postgres.sh --stop          # stop a kept container
#
# Needs Docker. Uses a throwaway postgres:15 container (same version as CI) on port 55432 with its
# data in memory, so nothing is written to disk and your normal database and .env are untouched.
set -euo pipefail

CONTAINER=logiflow-test-postgres
IMAGE=postgres:15-alpine
PORT=${TEST_PG_PORT:-55432}
BACKEND_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

if [[ "${1:-}" == "--stop" ]]; then
  docker rm -f "$CONTAINER" >/dev/null 2>&1 && echo "Stopped $CONTAINER." || echo "$CONTAINER isn't running."
  exit 0
fi

command -v docker >/dev/null || { echo "Docker is required (https://docs.docker.com/get-docker/)." >&2; exit 1; }

# A random password per container: nothing to leak, nothing for secret scanners to flag
if ! docker ps --format '{{.Names}}' | grep -qx "$CONTAINER"; then
  docker rm -f "$CONTAINER" >/dev/null 2>&1 || true
  PG_PASSWORD="$(head -c 24 /dev/urandom | od -An -tx1 | tr -d ' \n')"
  echo "Starting $IMAGE on port $PORT..."
  docker run -d --name "$CONTAINER" \
    -e POSTGRES_USER=logiflow -e POSTGRES_PASSWORD="$PG_PASSWORD" -e POSTGRES_DB=logiflow_test \
    -p "127.0.0.1:${PORT}:5432" --tmpfs /var/lib/postgresql/data \
    --label "logiflow.test-password=$PG_PASSWORD" \
    "$IMAGE" -c fsync=off -c synchronous_commit=off -c full_page_writes=off >/dev/null
else
  echo "Reusing running $CONTAINER."
fi
PG_PASSWORD="$(docker inspect -f '{{ index .Config.Labels "logiflow.test-password" }}' "$CONTAINER")"

cleanup() { [[ "${KEEP_DB:-}" == "1" ]] || docker rm -f "$CONTAINER" >/dev/null 2>&1 || true; }
trap cleanup EXIT

for _ in $(seq 1 60); do
  docker exec "$CONTAINER" pg_isready -U logiflow -d logiflow_test >/dev/null 2>&1 && break
  sleep 0.5
done
docker exec "$CONTAINER" pg_isready -U logiflow -d logiflow_test >/dev/null || { echo "PostgreSQL didn't start." >&2; exit 1; }

cd "$BACKEND_DIR"
DB_ENGINE=django.db.backends.postgresql \
DB_NAME=logiflow_test DB_USER=logiflow DB_PASSWORD="$PG_PASSWORD" \
DB_HOST=127.0.0.1 DB_PORT="$PORT" \
  uv run python manage.py test --noinput "$@"
