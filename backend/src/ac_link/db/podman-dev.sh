#!/usr/bin/env bash

podman run -d \
  --name academy-linker-postgres \
  --network academy_linker_net \
  -e POSTGRES_DB="$POSTGRES_DB" \
  -e POSTGRES_USER="$POSTGRES_USER" \
  -e POSTGRES_PASSWORD="$POSTGRES_PASSWORD" \
  -p "${POSTGRES_PORT:-5432}:5432" \
  -v academy_linker_pgdata:/var/lib/postgresql/data:Z \
  -v "$(pwd)/init:/docker-entrypoint-initdb.d:ro,Z" \
  docker.io/library/postgres:16 >/dev/null
