from __future__ import annotations

from sqlalchemy import MetaData
from sqlalchemy.orm import DeclarativeBase

NAMING_CONVENTION = {
    'ix': 'ix_%(column_0_label)s',
    'uq': 'uq_%(table_name)s_%(column_0_name)s',
    'ck': 'ck_%(table_name)s_%(constraint_name)s',
    'fk': 'fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s',
    'pk': 'pk_%(table_name)s',
}

# 表名缩写映射，用于显式 name= 的约束命名，避免超过 PostgreSQL 63 字符限制。
# 新增表时须在此字典添加对应条目，并同步更新 src/ac_link/db/README.md。
TABLE_ALIASES: dict[str, str] = {
    'users':                         'usr',
    'user_settings':                 'uset',
    'user_sessions':                 'uses',
    'students':                      'stu',
    'subjects':                      'sbj',
    'classes':                       'cls',
    'teaching_assignments':          'ta',
    'parent_student_bindings':       'psb',
    'student_exam_scores':           'ses',
    'student_period_metrics':        'spm',
    'discussion_threads':            'dt',
    'thread_user_states':            'tus',
    'posts':                         'pst',
    'tags':                          'tag',
    'post_tags':                     'ptg',
    'reports':                       'rpt',
    'report_user_states':            'rus',
    'announcements':                 'ann',
    'announcement_user_states':      'aus',
    'resource_translations':         'rtl',
    'resources':                     'res',
    'ai_conversations':              'aic',
    'ai_messages':                   'aim',
    'class_timetable_entries':       'cte',
    'tts_audio_cache':               'tts',
}


def uq(table: str, *cols: str) -> str:
    """生成 UniqueConstraint 的 name，格式：uq_<表缩写>_<列名...>"""
    return f"uq_{TABLE_ALIASES[table]}_{'_'.join(cols)}"


def ck(table: str, label: str) -> str:
    """生成 CheckConstraint 的 name，格式：ck_<表缩写>_<标签>"""
    return f"ck_{TABLE_ALIASES[table]}_{label}"


class Base(DeclarativeBase):
    metadata = MetaData(naming_convention=NAMING_CONVENTION)
