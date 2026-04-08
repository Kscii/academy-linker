from __future__ import annotations

import logging
from time import perf_counter

from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response

from ac_link.config.config import settings

logger = logging.getLogger("ac_link.performance")


class RequestTimingMiddleware(BaseHTTPMiddleware):
    """
    记录 HTTP 请求耗时，用于生产环境排查慢接口。

    默认仅记录超过阈值的请求，避免日志噪音过大。
    """

    async def dispatch(self, request: Request, call_next: object) -> Response:
        if not settings.request_timing_enabled:
            return await call_next(request)  # type: ignore[operator]

        start = perf_counter()
        status_code = 500
        response: Response | None = None

        try:
            response = await call_next(request)  # type: ignore[operator]
            status_code = response.status_code
        finally:
            duration_ms = (perf_counter() - start) * 1000
            should_log = settings.request_timing_log_all or (
                duration_ms >= settings.slow_request_threshold_ms
            )
            if not should_log:
                pass
            else:
                route = request.scope.get("route")
                route_path = getattr(route, "path", None) or request.url.path
                route_name = getattr(route, "name", None) or "<unknown>"
                client = request.client
                client_host = client[0] if client else "-"
                method = request.method
                path = request.url.path
                request_id = request.headers.get("x-request-id", "-")

                logger.warning(
                    "slow_request method=%s path=%s route=%s route_name=%s status=%s duration_ms=%.2f client=%s request_id=%s",
                    method,
                    path,
                    route_path,
                    route_name,
                    status_code,
                    duration_ms,
                    client_host,
                    request_id,
                    extra={
                        "event": "slow_request",
                        "method": method,
                        "path": path,
                        "route": route_path,
                        "route_name": route_name,
                        "status_code": status_code,
                        "duration_ms": round(duration_ms, 2),
                        "client_host": client_host,
                        "request_id": request_id,
                    },
                )

        if response is None:
            raise RuntimeError("RequestTimingMiddleware 未收到响应对象")
        return response
