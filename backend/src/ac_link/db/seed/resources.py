from __future__ import annotations

from sqlalchemy.orm import Session

from ac_link.db.orm import ResourceAudienceRole

from .helpers import create_resource, reset_demo_resources


def run(db: Session) -> dict[str, object]:
    reset_demo_resources(db)
    create_resource(
        db,
        title="[DEMO] Reading support at home",
        category_key="academic-support",
        category_label="Academic Support",
        audience_role=ResourceAudienceRole.PARENT,
        summary="Simple routines that help primary students build a stable home reading habit.",
        content="Set a short daily reading window, ask one prediction question, and celebrate consistency over speed.",
        published_days_ago=4,
        is_pinned=True,
    )
    create_resource(
        db,
        title="[DEMO] Wellbeing conversation starters",
        category_key="wellbeing",
        category_label="Wellbeing",
        audience_role=ResourceAudienceRole.ALL,
        summary="Prompts families can use after a difficult school day.",
        content="Try asking what felt easy, what felt hard, and who helped today before moving into problem solving.",
        published_days_ago=8,
    )
    create_resource(
        db,
        title="[DEMO] School attendance policy overview",
        category_key="school-policies",
        category_label="School Policies",
        audience_role=ResourceAudienceRole.PARENT,
        summary="A short summary of absence, leave, and late arrival expectations.",
        content="This article outlines when to submit leave requests, how the school records absences, and who to contact for support.",
        published_days_ago=12,
        external_url="https://example.com/demo-attendance-policy",
    )
    create_resource(
        db,
        title="[DEMO] Science inquiry toolkit",
        category_key="teaching-resources",
        category_label="Teaching Resources",
        audience_role=ResourceAudienceRole.TEACHER,
        summary="Question stems and reflection prompts for inquiry lessons.",
        content="Use prediction, observation, evidence, and reflection prompts to structure student thinking.",
        published_days_ago=2,
    )
    return {}
