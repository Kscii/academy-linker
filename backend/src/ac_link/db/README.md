
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
