"""
应用入口：FastAPI 实例、中间件、路由注册、全局异常处理。

启动方式：
  uvicorn ac_link.run:app --reload --host 0.0.0.0 --port 8000

中间件执行顺序（从外到内）：
  1. CORSMiddleware   - 处理预检请求（OPTIONS）和跨域头
  2. OriginCheckMiddleware - 对写操作校验 Origin 白名单（防 CSRF）
  3. 路由处理

后续开发注意：
  - 新增写操作路由时，如果需要豁免 Origin 校验（如公开的 webhook），
    将路径加入 _ORIGIN_CHECK_BYPASS 集合
  - 如需在生产环境限制 CORS 允许的方法，在 CORSMiddleware 的 allow_methods 中收窄
  - 全局 exception_handler 的 RequestValidationError 会被 Pydantic v2 触发；
    如果将来升级了 FastAPI/pydantic 版本，注意这里的错误格式是否仍然有效
"""

from __future__ import annotations

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response

from ac_link.api.admin_api import router as admin_router
from ac_link.api.ai_api import router as ai_router
from ac_link.api.announcement_api import router as announcement_router
from ac_link.api.auth_api import router as auth_router
from ac_link.api.discussion_api import router as discussion_router
from ac_link.api.me_api import router as me_router
from ac_link.api.parent_api import router as parent_router
from ac_link.api.report_api import router as report_router
from ac_link.api.settings_api import router as settings_router
from ac_link.api.teacher_api import router as teacher_router
from ac_link.api.translation_api import router as translation_router
from ac_link.common.exceptions import AppError
from ac_link.config.config import settings

# ── FastAPI 实例 ──────────────────────────────────────────────────────────────

app = FastAPI(
    title="Academy Linker API",
    version="1.0.0",
    # 生产环境建议关闭 docs，防止接口信息泄露
    docs_url="/docs" if settings.debug else None,
    redoc_url="/redoc" if settings.debug else None,
)

# ── CORS 中间件 ────────────────────────────────────────────────────────────────
# allow_credentials=True 必须配合前端 credentials:'include' 使用
# allow_origins 不能为 ["*"] 同时 allow_credentials=True，必须明确列出域名
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Origin 校验中间件 ──────────────────────────────────────────────────────────

# 豁免 Origin 校验的路径集合：
#   - /api/auth/login：登录时客户端还没有有效 Cookie，不存在 CSRF 风险
#   - 后续如需添加公开 webhook 等，在此追加
_ORIGIN_CHECK_BYPASS: frozenset[str] = frozenset({
    "/api/auth/login",
})

# 需要 Origin 校验的 HTTP 方法（写操作）
_WRITE_METHODS: frozenset[str] = frozenset({"POST", "PATCH", "PUT", "DELETE"})


class OriginCheckMiddleware(BaseHTTPMiddleware):
    """
    对所有写操作校验 Origin 头是否在白名单中。

    为何不用 CORS 代替：CORS 只阻止浏览器读取响应，不能阻止请求发出。
    Cookie 会随请求自动携带，因此需要额外校验 Origin 防止 CSRF。

    注意：非浏览器客户端（如 Postman、curl）通常不发送 Origin 头。
    本中间件对无 Origin 头的请求直接放行，方便后端测试。
    如需严格模式（强制要求 Origin），将下方 not origin 的放行改为拒绝。
    """

    async def dispatch(self, request: Request, call_next: object) -> Response:
        if request.method in _WRITE_METHODS and request.url.path not in _ORIGIN_CHECK_BYPASS:
            origin = request.headers.get("origin")
            if origin and origin not in settings.allowed_origins:
                return JSONResponse(
                    status_code=403,
                    content={
                        "error": {
                            "code": "origin_not_allowed",
                            "message": f"Origin '{origin}' 不在白名单中",
                            "details": {},
                        }
                    },
                )
        return await call_next(request)  # type: ignore[operator]


app.add_middleware(OriginCheckMiddleware)

# ── 全局异常处理 ───────────────────────────────────────────────────────────────

@app.exception_handler(AppError)
async def app_error_handler(_request: Request, exc: AppError) -> JSONResponse:
    """将 AppError 转换为 API 文档规定的统一错误响应格式。"""
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": {
                "code": exc.code,
                "message": exc.message,
                "details": exc.details,
            }
        },
    )


@app.exception_handler(RequestValidationError)
async def validation_error_handler(
    _request: Request, exc: RequestValidationError
) -> JSONResponse:
    """
    Pydantic 请求校验失败时统一返回 422 validation_error。
    details 中包含具体的字段错误信息，方便前端展示。
    """
    return JSONResponse(
        status_code=422,
        content={
            "error": {
                "code": "validation_error",
                "message": "请求参数校验失败",
                "details": {"errors": exc.errors()},
            }
        },
    )


# ── 路由注册 ──────────────────────────────────────────────────────────────────

app.include_router(auth_router)
app.include_router(me_router)
app.include_router(admin_router)
app.include_router(parent_router)
app.include_router(settings_router)
app.include_router(report_router)
app.include_router(announcement_router)
app.include_router(teacher_router)
app.include_router(discussion_router)
app.include_router(translation_router)
app.include_router(ai_router)
