#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd -- "${SCRIPT_DIR}/../../.." && pwd)"

set -a
source "${PROJECT_ROOT}/.env"
set +a

podman rm -f academy-linker-postgres 2>/dev/null || true

podman run -d \
  --name academy-linker-postgres \
  --network academy_linker_net \
  -e POSTGRES_DB="$POSTGRES_DB" \
  -e POSTGRES_USER="$POSTGRES_USER" \
  -e POSTGRES_PASSWORD="$POSTGRES_PASSWORD" \
  -p "${POSTGRES_PORT}:5432" \
  -v academy_linker_pgdata:/var/lib/postgresql/data:Z \
  docker.io/library/postgres:16 >/dev/null