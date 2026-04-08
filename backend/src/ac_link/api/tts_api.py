from __future__ import annotations

from pathlib import Path
from uuid import UUID

from fastapi import APIRouter, Depends, Request
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from ac_link.common.deps import get_current_user
from ac_link.common.exceptions import AppError, Errors
from ac_link.config.config import settings
from ac_link.crud import translation as translation_crud
from ac_link.db.db import get_db
from ac_link.db.orm.content import Announcement, Report, Resource
from ac_link.db.orm.communication import Post
from ac_link.db.orm.enums import TranslationResourceType, TranslationStatus, TtsProvider, TtsResourceType
from ac_link.db.orm.tts import TtsAudioCache
from ac_link.db.orm.user import User, UserSettings
from ac_link.dto.auth import ApiResponse
from ac_link.dto.tts import TtsAudioData, TtsResolveRequest, TtsVoiceItem
from ac_link.services.openai_service import translate_content
from ac_link.services.translation_helpers import get_target_language
from ac_link.services.tts_service import (
    build_content_hash,
    get_active_tts_provider,
    get_audio_output_spec,
    get_provider_label,
    list_available_voices,
    resolve_voice_for_language,
    synthesize_text,
)

router = APIRouter(prefix="/api/tts", tags=["tts"])


def _resolve_resource_text(
    db: Session,
    *,
    resource_type: TtsResourceType,
    resource_uuid: UUID,
    target_language: str,
    auto_translate_enabled: bool,
) -> tuple[int | None, str, str]:
    resource_id: int | None = None
    original_language: str
    original_text: str

    if resource_type == TtsResourceType.REPORT:
        item = db.query(Report).filter(Report.uuid == resource_uuid).first()
        if item is None:
            raise Errors.not_found("报告不存在")
        resource_id = item.id
        original_language = item.original_language
        original_text = item.original_content_markdown
        translation_type = TranslationResourceType.REPORT
    elif resource_type == TtsResourceType.ANNOUNCEMENT:
        item = db.query(Announcement).filter(Announcement.uuid == resource_uuid).first()
        if item is None:
            raise Errors.not_found("公告不存在")
        resource_id = item.id
        original_language = item.original_language
        original_text = item.original_content_markdown
        translation_type = TranslationResourceType.ANNOUNCEMENT
    elif resource_type == TtsResourceType.POST:
        item = db.query(Post).filter(Post.uuid == resource_uuid).first()
        if item is None or item.deleted_at is not None:
            raise Errors.not_found("帖子不存在")
        resource_id = item.id
        original_language = item.original_language or "en-AU"
        original_text = item.content_markdown
        translation_type = TranslationResourceType.POST
    else:
        item = db.query(Resource).filter(Resource.uuid == resource_uuid).first()
        if item is None:
            raise Errors.not_found("资源不存在")
        resource_id = item.id
        original_language = item.original_language
        original_text = item.original_content_markdown
        translation_type = TranslationResourceType.RESOURCE

    if target_language == original_language:
        return resource_id, original_text, original_language

    cached = translation_crud.get_translation(db, translation_type, resource_id, target_language)
    if cached is not None and cached.translation_status == TranslationStatus.COMPLETED:
        return resource_id, cached.translated_content_markdown, cached.language

    if not auto_translate_enabled:
        return resource_id, original_text, original_language

    translated = translate_content(original_text, target_language)
    translation_crud.upsert_translation(
        db,
        translation_type,
        resource_id,
        target_language,
        translated,
        TranslationStatus.COMPLETED,
    )
    db.commit()
    return resource_id, translated, target_language


@router.get("/voices", response_model=ApiResponse[list[TtsVoiceItem]])
def list_tts_voices(
    language: str | None = None,
    _current_user: User = Depends(get_current_user),
) -> ApiResponse[list[TtsVoiceItem]]:
    provider = get_active_tts_provider()
    voices = list_available_voices(language=language)
    return ApiResponse(data=[
        TtsVoiceItem(
            key=item["name"],
            language=(item.get("languageCodes") or ["und"])[0],
            provider=get_provider_label(provider),
        )
        for item in voices
        if item.get("name")
    ])


@router.post("/resolve", response_model=ApiResponse[TtsAudioData])
def resolve_tts_audio(
    body: TtsResolveRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ApiResponse[TtsAudioData]:
    try:
        resource_type = TtsResourceType(body.resource_type)
    except ValueError as exc:
        raise AppError(400, "invalid_resource_type", "resource_type 无效") from exc

    user_settings = db.query(UserSettings).filter(UserSettings.user_id == current_user.id).first()
    target_language = body.target_language or get_target_language(
        user_settings.language if user_settings else None,
        request.headers.get("accept-language"),
    )

    if resource_type == TtsResourceType.AD_HOC:
        if not body.text:
            raise AppError(422, "validation_error", "text 不能为空")
        source_text = body.text
        source_language = target_language
        resource_id: int | None = None
    else:
        if not body.resource_uuid:
            raise AppError(422, "validation_error", "resource_uuid 不能为空")
        try:
            resource_uuid = UUID(body.resource_uuid)
        except ValueError as exc:
            raise AppError(400, "invalid_uuid", "resource_uuid 格式无效") from exc
        resource_id, source_text, source_language = _resolve_resource_text(
            db,
            resource_type=resource_type,
            resource_uuid=resource_uuid,
            target_language=target_language,
            auto_translate_enabled=user_settings.ai_auto_translate_enabled if user_settings else True,
        )

    voice_key = resolve_voice_for_language(source_language)
    content_hash = build_content_hash(text=source_text, language=source_language, voice_key=voice_key)
    provider = get_active_tts_provider()
    cached = (
        db.query(TtsAudioCache)
        .filter(
            TtsAudioCache.content_hash == content_hash,
            TtsAudioCache.voice_key == voice_key,
            TtsAudioCache.provider == provider,
        )
        .first()
    )
    if cached is not None and Path(cached.storage_path).exists():
        return ApiResponse(data=TtsAudioData(
            audio_uuid=str(cached.uuid),
            audio_url=f"/api/tts/audio/{cached.uuid}",
            mime_type=cached.audio_mime_type,
            source_language=cached.source_language,
            voice_key=cached.voice_key,
            provider=get_provider_label(cached.provider),
            cached=True,
        ))

    audio_bytes = synthesize_text(text=source_text, language=source_language, voice_key=voice_key)
    settings.tts_storage_path.mkdir(parents=True, exist_ok=True)
    _, mime_type, extension = get_audio_output_spec()

    cache = cached or TtsAudioCache(
        resource_type=resource_type,
        resource_id=resource_id,
        content_hash=content_hash,
        source_text=source_text,
        source_language=source_language,
        voice_key=voice_key,
        provider=provider,
        audio_mime_type=mime_type,
        storage_path="",
    )
    if cached is None:
        db.add(cache)
        db.flush()

    file_path = settings.tts_storage_path / f"{cache.uuid}.{extension}"
    file_path.write_bytes(audio_bytes)
    cache.storage_path = str(file_path)
    db.commit()
    db.refresh(cache)

    return ApiResponse(data=TtsAudioData(
        audio_uuid=str(cache.uuid),
        audio_url=f"/api/tts/audio/{cache.uuid}",
        mime_type=cache.audio_mime_type,
        source_language=cache.source_language,
        voice_key=cache.voice_key,
        provider=get_provider_label(cache.provider),
        cached=False,
    ))


@router.get("/audio/{audio_uuid}")
def get_tts_audio(
    audio_uuid: UUID,
    _current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> FileResponse:
    audio = db.query(TtsAudioCache).filter(TtsAudioCache.uuid == audio_uuid).first()
    if audio is None:
        raise Errors.not_found("音频不存在")
    path = Path(audio.storage_path)
    if not path.exists():
        raise Errors.not_found("音频文件不存在")
    return FileResponse(path, media_type=audio.audio_mime_type, filename=path.name)
