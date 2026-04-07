#!/bin/sh
set -e

echo ">>> 初始化数据库表..."
python -m ac_link.db.db

if [ -n "$ADMIN_EMAIL" ]; then
    echo ">>> 创建/更新管理员账户..."
    python -m ac_link.db.init_admin
else
    echo ">>> 未设置 ADMIN_EMAIL，跳过管理员初始化"
fi

echo ">>> 启动 API 服务..."
exec uvicorn ac_link.run:app --host 0.0.0.0 --port 8000
