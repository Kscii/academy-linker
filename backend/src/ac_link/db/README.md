
## 初始化命令
uv sync
uv pip install -e .
bash podman-dev.sh
python3 src/ac_link/db/db.py

## Demo Seed

生成前端联调用演示数据：

```bash
cd backend
uv run python -m ac_link.db.seed --scenario full-demo --reset --with-auth-tokens
```

详细说明见：

- `src/ac_link/db/seed/README.md`


## 手动只启动pgsql容器:
```bash
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
```