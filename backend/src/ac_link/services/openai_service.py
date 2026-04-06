"""
LLM 调用封装层（OpenAI 兼容接口）。

支持任何兼容 OpenAI API 风格的模型提供商，通过 LLM_BASE_URL 切换。

提供以下功能：
  translate_content   — 教育场景翻译
  generate_ai_report  — AI 报告生成
  ai_chat             — AI 对话
"""

from __future__ import annotations

import logging

from openai import OpenAI

from ac_link.config.config import settings

logger = logging.getLogger(__name__)

_client: OpenAI | None = None


def _get_client() -> OpenAI:
    global _client
    if _client is None:
        _client = OpenAI(
            api_key=settings.llm_api_key,
            base_url=settings.llm_base_url,
        )
    return _client


# ── 翻译 ──────────────────────────────────────────────────────────────────────

_TRANSLATE_SYSTEM_PROMPT = """\
你是一名专业的教育领域翻译助手。你的任务是将教育相关内容（如学生报告、公告、讨论帖）翻译为指定的目标语言。

翻译要求：
1. 采用教育场景下家长容易理解的表达方式，避免过于学术化的术语
2. 保持原文的 Markdown 格式不变（标题、列表、加粗、链接等）
3. 保留原文中的专有名词（如人名、学校名等）不做翻译
4. 翻译应当自然流畅，易于阅读，像是一位有经验的老师在向家长解释
5. 不要添加任何额外的说明、注释或前缀文字，只输出翻译后的内容
"""


def translate_content(
    original_text: str,
    source_language: str,
    target_language: str,
) -> str:
    """
    将原文翻译为目标语言。

    Raises:
        Exception: OpenAI API 调用失败
    """
    client = _get_client()
    resp = client.chat.completions.create(
        model=settings.llm_model,
        temperature=settings.llm_temperature,
        max_tokens=settings.llm_max_tokens,
        messages=[
            {"role": "system", "content": _TRANSLATE_SYSTEM_PROMPT},
            {
                "role": "user",
                "content": (
                    f"请将以下内容从 {source_language} 翻译为 {target_language}：\n\n"
                    f"{original_text}"
                ),
            },
        ],
    )
    return resp.choices[0].message.content or ""


# ── AI 报告生成 ───────────────────────────────────────────────────────────────

_REPORT_SYSTEM_PROMPT = """\
你是一名经验丰富的教育专家和报告撰写助手。你的任务是根据提供的学生数据，生成一份专业、全面且有建设性的学生报告。

报告撰写要求：
1. 使用 English 撰写，语气专业但温暖，适合教育场景
2. 使用 Markdown 格式组织内容，包含清晰的标题层级
3. 报告应包含以下方面（如有相关数据）：
   - 学习表现概况
   - 各学科具体评价（含成绩趋势分析）
   - 行为与课堂参与度评价
   - 作业完成情况
   - 出勤记录
   - 优势与亮点
   - 需要改进的方面
   - 具体、可操作的建议
4. 基于数据说话，不要编造数据中没有的信息
5. 保持客观公正，同时关注学生的进步和潜力
6. 如果提供了老师的额外说明，请将其融入报告中
"""


def generate_ai_report(
    student_name: str,
    report_type: str,
    period_start: str,
    period_end: str,
    subject_name: str | None,
    exam_scores_text: str,
    period_metrics_text: str,
    teacher_reports_text: str,
    extra_instruction: str | None = None,
) -> str:
    """
    根据聚合的学生数据生成 AI 报告。

    Raises:
        Exception: OpenAI API 调用失败
    """
    context_parts: list[str] = [
        f"学生姓名: {student_name}",
        f"报告类型: {report_type}",
        f"报告周期: {period_start} 至 {period_end}",
    ]
    if subject_name:
        context_parts.append(f"学科: {subject_name}")

    context_parts.append(f"\n考试成绩记录:\n{exam_scores_text or '暂无数据'}")
    context_parts.append(f"\n周期指标记录:\n{period_metrics_text or '暂无数据'}")
    context_parts.append(f"\n近期教师报告:\n{teacher_reports_text or '暂无数据'}")

    if extra_instruction:
        context_parts.append(f"\n老师额外说明:\n{extra_instruction}")

    user_message = "\n".join(context_parts)

    client = _get_client()
    resp = client.chat.completions.create(
        model=settings.llm_model,
        temperature=settings.llm_temperature,
        max_tokens=settings.llm_max_tokens,
        messages=[
            {"role": "system", "content": _REPORT_SYSTEM_PROMPT},
            {"role": "user", "content": f"请根据以下学生数据生成报告：\n\n{user_message}"},
        ],
    )
    return resp.choices[0].message.content or ""


# ── AI 对话 ───────────────────────────────────────────────────────────────────

_CHAT_SYSTEM_PROMPT_PARENT = """\
你是一名智能教育助手，正在与一位学生家长对话。

对话要求：
1. 以友好、专业、易于理解的方式回应家长的问题
2. 如果提供了学生/学科的上下文信息，请结合这些信息回答
3. 给出的建议应当具体、可操作、适合家庭教育场景
4. 避免使用过于专业的教育术语，用家长能理解的语言解释
5. 如果不确定某些信息，坦诚说明，不要编造
6. 回答使用 {language} 语言
"""

_CHAT_SYSTEM_PROMPT_TEACHER = """\
你是一名智能教育助手，正在与一位老师对话。

对话要求：
1. 以专业、高效的方式回应老师的问题
2. 如果提供了学生/学科的上下文信息，请结合这些信息分析
3. 可以使用教育领域的专业术语
4. 给出的建议应当具有专业深度和可操作性
5. 帮助老师更好地理解学生表现、优化教学策略
6. 如果不确定某些信息，坦诚说明，不要编造
7. 回答使用 {language} 语言
"""

_PRESET_INSTRUCTIONS = {
    "default": "",
    "summary": "请以简洁的摘要形式回答，突出要点。",
    "parent_friendly": "请用特别通俗易懂、家长友好的方式回答，避免任何专业术语。",
}


def ai_chat(
    messages: list[dict[str, str]],
    *,
    role: str,
    language: str,
    preset: str = "default",
    context_info: str | None = None,
    ai_chat_style: str | None = None,
) -> str:
    """
    AI 对话，返回 assistant 的回复内容。

    Args:
        messages: 对话历史 [{"role": "user"/"assistant", "content": "..."}]
        role: 用户角色 ("parent" / "teacher")
        language: 输出语言
        preset: 风格预设
        context_info: 学生/学科上下文摘要
        ai_chat_style: 用户自定义的对话风格偏好

    Raises:
        Exception: OpenAI API 调用失败
    """
    if role == "teacher":
        system_prompt = _CHAT_SYSTEM_PROMPT_TEACHER.format(language=language)
    else:
        system_prompt = _CHAT_SYSTEM_PROMPT_PARENT.format(language=language)

    if context_info:
        system_prompt += f"\n\n当前对话上下文信息：\n{context_info}"

    preset_instruction = _PRESET_INSTRUCTIONS.get(preset, "")
    if preset_instruction:
        system_prompt += f"\n\n风格要求：{preset_instruction}"

    if ai_chat_style:
        system_prompt += f"\n\n用户偏好的对话风格：{ai_chat_style}"

    api_messages: list[dict[str, str]] = [
        {"role": "system", "content": system_prompt},
    ]
    api_messages.extend(messages)

    client = _get_client()
    resp = client.chat.completions.create(
        model=settings.llm_model,
        temperature=settings.llm_temperature,
        max_tokens=settings.llm_max_tokens,
        messages=api_messages,  # type: ignore[arg-type]
    )
    return resp.choices[0].message.content or ""
