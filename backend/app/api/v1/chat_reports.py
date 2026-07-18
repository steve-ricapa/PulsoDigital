from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel

from app.core.database import get_db
from app.api.dependencies import get_current_active_user, require_roles
from app.models import (
    User, ChatReport, ChatReportStatus, RiskLevel,
    Student, PsychologistProfile,
)

router = APIRouter()


def _enum_value(val: object) -> str:
    return val.value if hasattr(val, "value") else str(val)


class ChatReportUpdate(BaseModel):
    status: Optional[str] = None
    reviewer_notes: Optional[str] = None


class ChatReportListItem(BaseModel):
    id: str
    student_id: str
    student_internal_id: str
    student_name: str
    classroom_name: str
    session_id: str
    risk_level: str
    risk_signals: list[str]
    summary: Optional[str] = None
    status: str
    created_at: str


class ChatReportDetail(BaseModel):
    id: str
    student_id: str
    student_internal_id: str
    student_name: str
    classroom_name: str
    session_id: str
    risk_level: str
    risk_signals: list[str]
    messages_snapshot: list[dict]
    summary: Optional[str] = None
    status: str
    reviewer_notes: Optional[str] = None
    created_at: str
    reviewed_at: Optional[str] = None


class ChatReportStats(BaseModel):
    total_pending: int
    by_risk_level: dict[str, int]


@router.get("/stats", response_model=ChatReportStats)
async def get_chat_report_stats(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_roles("psychologist")),
):
    psychologist = await db.execute(
        select(PsychologistProfile).where(PsychologistProfile.user_id == user.id)
    )
    psy = psychologist.scalar_one_or_none()
    if not psy:
        raise HTTPException(status_code=404, detail="Perfil de psicólogo no encontrado")

    total_q = select(func.count(ChatReport.id)).where(ChatReport.status == ChatReportStatus.PENDING)
    total_result = await db.execute(total_q)
    total_pending = total_result.scalar() or 0

    risk_q = (
        select(ChatReport.risk_level, func.count(ChatReport.id))
        .where(ChatReport.status == ChatReportStatus.PENDING)
        .group_by(ChatReport.risk_level)
    )
    risk_result = await db.execute(risk_q)
    by_risk = {_enum_value(row[0]): row[1] for row in risk_result.all()}

    return ChatReportStats(total_pending=total_pending, by_risk_level=by_risk)


@router.get("", response_model=list[ChatReportListItem])
async def list_chat_reports(
    status: Optional[str] = Query(None),
    risk_level: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_roles("psychologist")),
):
    from sqlalchemy.orm import selectinload
    from app.models import Classroom

    base = (
        select(ChatReport)
        .options(selectinload(ChatReport.student).selectinload(Student.user))
    )

    if status:
        try:
            base = base.where(ChatReport.status == ChatReportStatus(status))
        except ValueError:
            pass
    if risk_level:
        try:
            base = base.where(ChatReport.risk_level == RiskLevel(risk_level))
        except ValueError:
            pass
    base = base.order_by(ChatReport.created_at.desc())

    count_q = select(func.count()).select_from(base.subquery())
    total = (await db.execute(count_q)).scalar() or 0

    offset = (page - 1) * size
    base = base.offset(offset).limit(size)
    result = await db.execute(base)
    reports = result.scalars().unique().all()

    items = []
    for r in reports:
        student = r.student
        student_user = student.user if student else None
        classroom_name = ""
        if student and student.classroom_id:
            classroom = await db.get(Classroom, student.classroom_id)
            if classroom:
                classroom_name = classroom.name

        signals = json.loads(r.risk_signals) if r.risk_signals else []

        items.append(ChatReportListItem(
            id=str(r.id),
            student_id=str(r.student_id),
            student_internal_id=student.internal_id if student else "",
            student_name=student_user.full_name if student_user else "",
            classroom_name=classroom_name,
            session_id=r.session_id,
            risk_level=_enum_value(r.risk_level),
            risk_signals=signals,
            summary=r.summary,
            status=_enum_value(r.status),
            created_at=r.created_at.isoformat() if r.created_at else "",
        ))

    return items


@router.get("/{report_id}", response_model=ChatReportDetail)
async def get_chat_report(
    report_id: UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_roles("psychologist")),
):
    from sqlalchemy.orm import selectinload
    from app.models import Classroom

    result = await db.execute(
        select(ChatReport)
        .where(ChatReport.id == report_id)
        .options(selectinload(ChatReport.student).selectinload(Student.user))
    )
    report = result.scalar_one_or_none()
    if not report:
        raise HTTPException(status_code=404, detail="Reporte no encontrado")

    student = report.student
    student_user = student.user if student else None
    classroom_name = ""
    if student and student.classroom_id:
        classroom = await db.get(Classroom, student.classroom_id)
        if classroom:
            classroom_name = classroom.name

    signals = json.loads(report.risk_signals) if report.risk_signals else []
    snapshot = json.loads(report.messages_snapshot) if report.messages_snapshot else []

    return ChatReportDetail(
        id=str(report.id),
        student_id=str(report.student_id),
        student_internal_id=student.internal_id if student else "",
        student_name=student_user.full_name if student_user else "",
        classroom_name=classroom_name,
        session_id=report.session_id,
        risk_level=_enum_value(report.risk_level),
        risk_signals=signals,
        messages_snapshot=snapshot,
        summary=report.summary,
        status=_enum_value(report.status),
        reviewer_notes=report.reviewer_notes,
        created_at=report.created_at.isoformat() if report.created_at else "",
        reviewed_at=report.reviewed_at.isoformat() if report.reviewed_at else None,
    )


@router.patch("/{report_id}")
async def update_chat_report(
    report_id: UUID,
    data: ChatReportUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_roles("psychologist")),
):
    result = await db.execute(select(ChatReport).where(ChatReport.id == report_id))
    report = result.scalar_one_or_none()
    if not report:
        raise HTTPException(status_code=404, detail="Reporte no encontrado")

    if data.status:
        report.status = data.status
        if data.status == "reviewed":
            report.reviewed_at = datetime.now(timezone.utc)
    if data.reviewer_notes is not None:
        report.reviewer_notes = data.reviewer_notes

    await db.commit()
    return {"message": "Reporte actualizado"}
