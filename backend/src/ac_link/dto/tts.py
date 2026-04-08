from __future__ import annotations

from pydantic import BaseModel


class TtsResolveRequest(BaseModel):
    resource_type: str
    resource_uuid: str | None = None
    text: str | None = None
    target_language: str | None = None


class TtsAudioData(BaseModel):
    audio_uuid: str
    audio_url: str
    mime_type: str
    source_language: str
    voice_key: str
    provider: str
    cached: bool


class TtsVoiceItem(BaseModel):
    key: str
    language: str
    provider: str
