from __future__ import annotations

import hashlib
import html
import urllib.error
import urllib.request

from ac_link.common.exceptions import Errors
from ac_link.config.config import settings


def ensure_tts_configured() -> None:
    if not settings.tts_api_key or not settings.tts_region:
      raise Errors.tts_not_configured()


def resolve_voice_for_language(language: str) -> str:
    normalized = language.lower()
    if normalized.startswith("zh"):
        return settings.tts_voice_zh
    return settings.tts_voice_en


def build_content_hash(*, text: str, language: str, voice_key: str) -> str:
    source = f"{language}\n{voice_key}\n{text}".encode("utf-8")
    return hashlib.sha256(source).hexdigest()


def synthesize_text(*, text: str, language: str, voice_key: str) -> bytes:
    ensure_tts_configured()
    escaped = html.escape(text)
    ssml = (
        f"<speak version='1.0' xml:lang='{language}'>"
        f"<voice xml:lang='{language}' name='{voice_key}'>{escaped}</voice>"
        "</speak>"
    ).encode("utf-8")
    url = f"https://{settings.tts_region}.tts.speech.microsoft.com/cognitiveservices/v1"
    req = urllib.request.Request(
        url,
        data=ssml,
        headers={
            "Ocp-Apim-Subscription-Key": settings.tts_api_key,
            "Content-Type": "application/ssml+xml",
            "X-Microsoft-OutputFormat": settings.tts_audio_format,
            "User-Agent": "academy-linker/tts",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as response:
            return response.read()
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="ignore")
        raise Errors.tts_generation_failed(f"Azure TTS 返回错误: {detail or exc.reason}") from exc
    except Exception as exc:  # noqa: BLE001
        raise Errors.tts_generation_failed(str(exc)) from exc
