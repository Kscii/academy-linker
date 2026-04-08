from __future__ import annotations

import base64
import hashlib
import json
import urllib.error
import urllib.parse
import urllib.request
import wave
from io import BytesIO

from ac_link.common.exceptions import Errors
from ac_link.config.config import settings
from ac_link.db.orm.enums import TtsProvider

_GEMINI_VOICES: tuple[dict[str, str], ...] = (
    {"name": "Kore", "language": "en-US"},
    {"name": "Puck", "language": "en-US"},
    {"name": "Aoede", "language": "zh-CN"},
    {"name": "Charon", "language": "en-US"},
    {"name": "Fenrir", "language": "en-US"},
    {"name": "Leda", "language": "en-US"},
    {"name": "Orus", "language": "en-US"},
    {"name": "Zephyr", "language": "en-US"},
)


def _voice_map() -> dict[str, str]:
    return {voice["name"]: voice["language"] for voice in _GEMINI_VOICES}


def get_active_tts_provider() -> TtsProvider:
    normalized = settings.tts_provider.strip().lower()
    if normalized in {"gemini", "google-genai"}:
        return TtsProvider.GEMINI
    try:
        return TtsProvider(normalized)
    except ValueError as exc:
        raise Errors.tts_not_configured(f"不支持的 TTS provider: {settings.tts_provider}") from exc


def get_provider_label(provider: TtsProvider) -> str:
    if provider == TtsProvider.GEMINI:
        return "gemini"
    if provider == TtsProvider.GOOGLE:
        return "gcp"
    return provider.value


def ensure_tts_configured() -> None:
    provider = get_active_tts_provider()
    if provider != TtsProvider.GEMINI:
        raise Errors.tts_not_configured("当前仅支持 Gemini TTS")
    if not settings.tts_api_key:
        raise Errors.tts_not_configured("未配置 TTS_API_KEY")
    if not settings.tts_model:
        raise Errors.tts_not_configured("未配置 TTS_MODEL")
    _validate_configured_voice(settings.tts_voice_en, expected_language="en")
    _validate_configured_voice(settings.tts_voice_zh, expected_language="zh")


def resolve_voice_for_language(language: str) -> str:
    normalized = language.lower()
    if normalized.startswith(("zh", "cmn")):
        voice_key = settings.tts_voice_zh
        _validate_configured_voice(voice_key, expected_language="zh")
        return voice_key
    voice_key = settings.tts_voice_en
    _validate_configured_voice(voice_key, expected_language="en")
    return voice_key


def build_content_hash(*, text: str, language: str, voice_key: str, scope_key: str = "shared") -> str:
    provider = get_provider_label(get_active_tts_provider())
    source = f"{provider}\n{settings.tts_model}\n{language}\n{voice_key}\n{scope_key}\n{text}".encode("utf-8")
    return hashlib.sha256(source).hexdigest()


def get_audio_output_spec() -> tuple[str, str, str]:
    encoding = settings.tts_audio_encoding.upper()
    if encoding == "WAV":
        return "WAV", "audio/wav", "wav"
    raise Errors.tts_not_configured(f"不支持的 TTS_AUDIO_ENCODING: {settings.tts_audio_encoding}")


def _wav_from_pcm(pcm_data: bytes, *, sample_rate: int) -> bytes:
    buffer = BytesIO()
    with wave.open(buffer, "wb") as wav_file:
        wav_file.setnchannels(1)
        wav_file.setsampwidth(2)
        wav_file.setframerate(sample_rate)
        wav_file.writeframes(pcm_data)
    return buffer.getvalue()


def _language_matches(prefix: str, voice_language: str) -> bool:
    normalized_prefix = prefix.lower()
    normalized_voice = voice_language.lower()
    return normalized_voice.startswith(normalized_prefix) or normalized_prefix.startswith(normalized_voice.split("-")[0])


def _validate_configured_voice(voice_key: str, *, expected_language: str) -> None:
    voice_language = _voice_map().get(voice_key)
    if voice_language is None:
        raise Errors.tts_not_configured(f"不支持的 TTS voice: {voice_key}")
    if not _language_matches(expected_language, voice_language):
        raise Errors.tts_not_configured(
            f"TTS voice {voice_key} 与目标语言 {expected_language} 不匹配"
        )


def list_available_voices(language: str | None = None) -> list[dict[str, object]]:
    ensure_tts_configured()
    voices = list(_GEMINI_VOICES)
    if language:
        voices = [voice for voice in voices if _language_matches(language, voice["language"])]
    return [
        {"name": voice["name"], "languageCodes": [voice["language"]]}
        for voice in voices
    ]


def _build_prompt(text: str, *, language: str) -> str:
    normalized = language.lower()
    if normalized.startswith(("zh", "cmn")):
        return (
            "请自然、清晰地朗读以下文本，保持语气温和、专业，不要添加原文之外的内容：\n\n"
            f"{text}"
        )
    return (
        "Read the following text naturally and clearly with a warm, professional tone. "
        "Do not add any extra words beyond the provided text.\n\n"
        f"{text}"
    )


def synthesize_text(*, text: str, language: str, voice_key: str) -> bytes:
    ensure_tts_configured()
    payload = {
        "contents": [{"parts": [{"text": _build_prompt(text, language=language)}]}],
        "generationConfig": {
            "responseModalities": ["AUDIO"],
            "speechConfig": {
                "voiceConfig": {
                    "prebuiltVoiceConfig": {
                        "voiceName": voice_key,
                    }
                }
            },
        },
        "model": settings.tts_model,
    }
    url = (
        f"{settings.tts_api_base_url.rstrip('/')}/models/"
        f"{urllib.parse.quote(settings.tts_model, safe='')}:generateContent"
    )
    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "x-goog-api-key": settings.tts_api_key,
            "Content-Type": "application/json",
            "Accept": "application/json",
            "User-Agent": "academy-linker/tts",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=60) as response:
            result = json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="ignore")
        raise Errors.tts_generation_failed(f"Gemini TTS 返回错误: {detail or exc.reason}") from exc
    except Exception as exc:  # noqa: BLE001
        raise Errors.tts_generation_failed(str(exc)) from exc

    try:
        inline_data = result["candidates"][0]["content"]["parts"][0]["inlineData"]["data"]
    except Exception as exc:  # noqa: BLE001
        raise Errors.tts_generation_failed("Gemini TTS 未返回音频数据") from exc

    try:
        pcm_data = base64.b64decode(inline_data)
    except Exception as exc:  # noqa: BLE001
        raise Errors.tts_generation_failed("Gemini TTS 返回了无效音频内容") from exc

    _, _, extension = get_audio_output_spec()
    if extension == "wav":
        return _wav_from_pcm(pcm_data, sample_rate=settings.tts_audio_sample_rate_hertz)
    return pcm_data
