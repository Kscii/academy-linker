"""
统一异常定义模块。

所有业务错误均通过 AppError 抛出，配合 run.py 中注册的 exception_handler
统一转换为 API 文档规定的错误响应格式：
    {"error": {"code": "...", "message": "...", "details": {}}}

新增错误码时：
  1. 在本文件 ErrorCode 中添加常量
  2. 在 API 文档 §4 统一错误码表中同步更新
"""

from __future__ import annotations


class AppError(Exception):
    """业务异常基类，由 FastAPI exception_handler 捕获并转换为标准错误响应。"""

    def __init__(
        self,
        status_code: int,
        code: str,
        message: str,
        details: dict | None = None,
    ) -> None:
        self.status_code = status_code
        self.code = code
        self.message = message
        self.details = details or {}
        super().__init__(message)


# ── 常用预设错误（直接调用即可）──────────────────────────────────────────────

class Errors:
    """预设的常见错误工厂方法，避免在业务代码里硬编码 HTTP 状态码和 code 字符串。"""

    @staticmethod
    def unauthenticated(message: str = "未登录或凭证缺失") -> AppError:
        return AppError(401, "unauthenticated", message)

    @staticmethod
    def access_token_expired() -> AppError:
        return AppError(401, "access_token_expired", "Access token 已过期，请刷新")

    @staticmethod
    def refresh_token_expired() -> AppError:
        return AppError(401, "refresh_token_expired", "Refresh token 已过期，请重新登录")

    @staticmethod
    def invalid_token(message: str = "Token 无效") -> AppError:
        return AppError(401, "invalid_token", message)

    @staticmethod
    def forbidden(message: str = "无权限执行此操作") -> AppError:
        return AppError(403, "forbidden", message)

    @staticmethod
    def origin_not_allowed() -> AppError:
        return AppError(403, "origin_not_allowed", "Origin 不在白名单，请求被拒绝")

    @staticmethod
    def not_found(message: str = "资源不存在") -> AppError:
        return AppError(404, "not_found", message)

    @staticmethod
    def conflict(message: str = "资源冲突") -> AppError:
        return AppError(409, "conflict", message)

    @staticmethod
    def already_read() -> AppError:
        return AppError(409, "already_read", "该内容已标记为已读")

    @staticmethod
    def already_archived() -> AppError:
        return AppError(409, "already_archived", "该内容已归档")

    @staticmethod
    def duplicate_tag_name(name: str) -> AppError:
        return AppError(409, "duplicate_tag_name", f"Tag 名称 '{name}' 已存在")

    @staticmethod
    def conversation_archived() -> AppError:
        return AppError(409, "conversation_archived", "AI 会话已归档，不允许继续发送消息")

    @staticmethod
    def auto_translation_disabled() -> AppError:
        return AppError(403, "auto_translation_disabled", "已关闭自动翻译，且当前请求不允许自动创建译文")

    @staticmethod
    def ai_generation_failed(message: str = "AI 报告生成失败") -> AppError:
        return AppError(500, "ai_generation_failed", message)

    @staticmethod
    def ai_translation_failed(message: str = "AI 翻译失败") -> AppError:
        return AppError(500, "ai_translation_failed", message)

    @staticmethod
    def ai_chat_failed(message: str = "AI 对话生成失败") -> AppError:
        return AppError(500, "ai_chat_failed", message)

    @staticmethod
    def internal_error(message: str = "服务端内部错误") -> AppError:
        return AppError(500, "internal_error", message)
