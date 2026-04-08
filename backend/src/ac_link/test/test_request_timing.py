from __future__ import annotations

import logging
import time

from fastapi import FastAPI
from starlette.testclient import TestClient

from ac_link.middleware.request_timing import RequestTimingMiddleware


def test_request_timing_logs_only_slow_requests(monkeypatch, caplog):
    app = FastAPI()
    app.add_middleware(RequestTimingMiddleware)

    @app.get("/slow")
    def slow_endpoint():
        time.sleep(0.02)
        return {"ok": True}

    monkeypatch.setattr("ac_link.middleware.request_timing.settings.request_timing_enabled", True)
    monkeypatch.setattr("ac_link.middleware.request_timing.settings.request_timing_log_all", False)
    monkeypatch.setattr("ac_link.middleware.request_timing.settings.slow_request_threshold_ms", 1)

    with caplog.at_level(logging.WARNING, logger="ac_link.performance"):
        with TestClient(app) as client:
            response = client.get("/slow", headers={"X-Request-ID": "req-123"})

    assert response.status_code == 200
    assert "slow_request" in caplog.text
    assert "request_id=req-123" in caplog.text
    assert "route=/slow" in caplog.text


def test_request_timing_skips_fast_requests(monkeypatch, caplog):
    app = FastAPI()
    app.add_middleware(RequestTimingMiddleware)

    @app.get("/fast")
    def fast_endpoint():
        return {"ok": True}

    monkeypatch.setattr("ac_link.middleware.request_timing.settings.request_timing_enabled", True)
    monkeypatch.setattr("ac_link.middleware.request_timing.settings.request_timing_log_all", False)
    monkeypatch.setattr("ac_link.middleware.request_timing.settings.slow_request_threshold_ms", 1000)

    with caplog.at_level(logging.WARNING, logger="ac_link.performance"):
        with TestClient(app) as client:
            response = client.get("/fast")

    assert response.status_code == 200
    assert "slow_request" not in caplog.text
