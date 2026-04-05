from __future__ import annotations

from pydantic import PostgresDsn
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # ── 数据库 ─────────────────────────────────────────────────────────────
    postgres_host: str = "localhost"
    postgres_port: int = 5432
    postgres_user: str
    postgres_password: str
    postgres_db: str

    # ── 通用 ───────────────────────────────────────────────────────────────
    debug: bool = False

    # ── JWT ────────────────────────────────────────────────────────────────
    # 必须通过环境变量 JWT_SECRET_KEY 注入，不得硬编码
    # 生成命令：python -c "import secrets; print(secrets.token_hex(32))"
    jwt_secret_key: str
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 15

    # refresh_token 有效期：
    #   remember_me=False → 3 天（默认短期会话）
    #   remember_me=True  → 7 天（长期记住会话）
    refresh_token_expire_days: int = 3
    refresh_token_remember_me_expire_days: int = 7

    # ── CORS / Origin 校验 ─────────────────────────────────────────────────
    # 前端开发地址，生产环境通过环境变量覆盖（逗号分隔多个）
    # 注意：生产环境务必替换为真实域名，不要保留 localhost
    allowed_origins: list[str] = ["http://localhost:5173"]

    @property
    def database_url(self) -> str:
        return PostgresDsn.build(
            scheme="postgresql+psycopg",
            username=self.postgres_user,
            password=self.postgres_password,
            host=self.postgres_host,
            port=self.postgres_port,
            path=f"{self.postgres_db}",
        ).unicode_string()


settings = Settings()  # pyright: ignore[reportCallIssue]