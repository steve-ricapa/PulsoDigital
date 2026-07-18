from datetime import datetime
from uuid import UUID
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, desc
from sqlalchemy.orm import selectinload
from pydantic import BaseModel, Field

from app.core.database import get_db
from app.core.security import get_current_active_user, require_roles
from app.models import (
    Intervention, Student, PsychologistProfile, User,
    UserRole, InterventionType, SupportRequest, SupportRequestType
)

router = APIRouter()


def _enum_value(val: object) -> str:
    return val.value if hasattr(val, "value") else str(val)


class InterventionCreate(BaseModel):
    student_id: UUID
    intervention_type: InterventionType
    description: str
    follow_up_date: Optional[datetime] = None


class InterventionUpdate(BaseModel):
    intervention_type: Optional[InterventionType] = None
    description: Optional[str] = None
    outcome: Optional[str] = None
    follow_up_date: Optional[datetime] = None
    is_completed: Optional[bool] = None


class InterventionResponse(BaseModel):
    id: UUID
    student_id: UUID
    psychologist_id: UUID
    intervention_type: InterventionType
    description: str
    outcome: Optional[str] = None
    follow_up_date: Optional[datetime] = None
    is_completed: bool
    completed_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    student_internal_id: Optional[str] = None
    psychologist_name: Optional[str] = None
    
    class Config:
        from_attributes = True


class InterventionListResponse(BaseModel):
    interventions: List[InterventionResponse]
    total: int
    page: int
    size: int
    pages: int


@router.post("", response_model=InterventionResponse, status_code=status.HTTP_201_CREATED)
async def create_intervention(
    intervention_data: InterventionCreate,
    current_user: User = Depends(require_roles("admin", "school_admin", "psychologist")),
    db: AsyncSession = Depends(get_db),
):
    if current_user.role == UserRole.PSYCHOLOGIST:
        psychologist_id = current_user.psychologist_profile.id
    elif current_user.role == UserRole.SCHOOL_ADMIN:
        psychologist = await db.execute(
            select(PsychologistProfile).where(
                PsychologistProfile.user_id == current_user.id
            )
        )
        psych = psychologist.scalar_one_or_none()
        if not psych:
            raise HTTPException(status_code=400, detail="No psychologist profile")
        psychologist_id = psych.id
    else:
        raise HTTPException(status_code=403, detail="Only psychologists can create interventions")
    
    student = await db.get(Student, intervention_data.student_id)
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    
    if current_user.role == UserRole.PSYCHOLOGIST:
        psych_classrooms = await db.execute(
            select(Student.id).join(Classroom).where(
                and_(
                    Classroom.psychologist_id == current_user.psychologist_profile.id,
                    Student.id == intervention_data.student_id
                )
            )
        )
        if not psych_classrooms.scalar_one_or_none():
            raise HTTPException(status_code=403, detail="Student not assigned to your classroom")
    
    intervention = Intervention(
        student_id=intervention_data.student_id,
        psychologist_id=psychologist_id,
        intervention_type=intervention_data.intervention_type,
        description=intervention_data.description,
        follow_up_date=intervention_data.follow_up_date,
    )
    
    db.add(intervention)
    await db.commit()
    await db.refresh(intervention)
    
    return InterventionResponse(
        **intervention.__dict__,
        student_internal_id=student.internal_id,
        psychologist_name=current_user.full_name,
    )


@router.get("", response_model=InterventionListResponse)
async def list_interventions(
    student_id: Optional[UUID] = Query(None),
    intervention_type: Optional[InterventionType] = Query(None),
    is_completed: Optional[bool] = Query(None),
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    query = select(Intervention).options(
        selectinload(Intervention.student),
        selectinload(Intervention.psychologist).selectinload(PsychologistProfile.user),
    )
    
    if current_user.role == UserRole.PSYCHOLOGIST:
        query = query.where(Intervention.psychologist_id == current_user.psychologist_profile.id)
    elif current_user.role == UserRole.SCHOOL_ADMIN:
        school_psychologists = await db.execute(
            select(PsychologistProfile.id).join(User).where(User.school_id == current_user.school_id)
        )
        psych_ids = [row[0] for row in school_psychologists.all()]
        query = query.where(Intervention.psychologist_id.in_(psych_ids))
    elif student_id:
        query = query.where(Intervention.student_id == student_id)
    
    if intervention_type:
        query = query.where(Intervention.intervention_type == intervention_type)
    if is_completed is not None:
        query = query.where(Intervention.is_completed == is_completed)
    
    total_query = select(func.count()).select_from(query.subquery())
    total = await db.scalar(total_query) or 0
    
    query = query.order_by(desc(Intervention.created_at))
    query = query.offset((page - 1) * size).limit(size)
    
    result = await db.execute(query)
    interventions = result.scalars().all()
    
    return InterventionListResponse(
        interventions=[
            InterventionResponse(
                **i.__dict__,
                student_internal_id=i.student.internal_id,
                psychologist_name=i.psychologist.user.full_name,
            ) for i in interventions
        ],
        total=total,
        page=page,
        size=size,
        pages=(total + size - 1) // size,
    )


class StudentInterventionResponse(BaseModel):
    id: UUID
    intervention_type: str
    description: str
    follow_up_date: Optional[datetime] = None
    psychologist_name: str
    created_at: datetime


@router.get("/mine", response_model=list[StudentInterventionResponse])
async def get_my_pending_interventions(
    current_user: User = Depends(require_roles("student")),
    db: AsyncSession = Depends(get_db),
):
    student = await db.execute(
        select(Student).where(Student.user_id == current_user.id)
    )
    student_obj = student.scalar_one_or_none()
    if not student_obj:
        raise HTTPException(status_code=404, detail="Perfil de estudiante no encontrado")

    result = await db.execute(
        select(Intervention)
        .where(Intervention.student_id == student_obj.id, Intervention.is_completed == False)
        .options(
            selectinload(Intervention.psychologist).selectinload(PsychologistProfile.user)
        )
        .order_by(desc(Intervention.follow_up_date))
    )
    interventions = result.scalars().all()

    return [
        StudentInterventionResponse(
            id=i.id,
            intervention_type=_enum_value(i.intervention_type),
            description=i.description,
            follow_up_date=i.follow_up_date,
            psychologist_name=i.psychologist.user.full_name,
            created_at=i.created_at,
        ) for i in interventions
    ]


@router.get("/{intervention_id}", response_model=InterventionResponse)
async def get_intervention(
    intervention_id: UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    intervention = await db.get(
        Intervention, intervention_id,
        options=[
            selectinload(Intervention.student),
            selectinload(Intervention.psychologist).selectinload(PsychologistProfile.user),
        ]
    )
    if not intervention:
        raise HTTPException(status_code=404, detail="Intervention not found")
    
    if current_user.role == UserRole.PSYCHOLOGIST:
        if intervention.psychologist_id != current_user.psychologist_profile.id:
            raise HTTPException(status_code=403, detail="Not authorized")
    
    return InterventionResponse(
        **intervention.__dict__,
        student_internal_id=intervention.student.internal_id,
        psychologist_name=intervention.psychologist.user.full_name,
    )


@router.patch("/{intervention_id}", response_model=InterventionResponse)
async def update_intervention(
    intervention_id: UUID,
    update_data: InterventionUpdate,
    current_user: User = Depends(require_roles("admin", "school_admin", "psychologist")),
    db: AsyncSession = Depends(get_db),
):
    intervention = await db.get(Intervention, intervention_id)
    if not intervention:
        raise HTTPException(status_code=404, detail="Intervention not found")
    
    if current_user.role == UserRole.PSYCHOLOGIST:
        if intervention.psychologist_id != current_user.psychologist_profile.id:
            raise HTTPException(status_code=403, detail="Not authorized")
    
    data = update_data.model_dump(exclude_unset=True)
    
    if data.get("is_completed") and not intervention.is_completed:
        data["completed_at"] = datetime.utcnow()
    elif data.get("is_completed") is False:
        data["completed_at"] = None
    
    for field, value in data.items():
        setattr(intervention, field, value)
    
    await db.commit()
    await db.refresh(intervention)
    
    return InterventionResponse(
        **intervention.__dict__,
        student_internal_id=intervention.student.internal_id,
        psychologist_name=intervention.psychologist.user.full_name,
    )


@router.get("/student/{student_id}/history", response_model=List[InterventionResponse])
async def get_student_intervention_history(
    student_id: UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    student = await db.get(Student, student_id)
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    
    if current_user.role == UserRole.PSYCHOLOGIST:
        psych_students = await db.execute(
            select(Student.id).join(Classroom).where(
                and_(
                    Classroom.psychologist_id == current_user.psychologist_profile.id,
                    Student.id == student_id
                )
            )
        )
        if not psych_students.scalar_one_or_none():
            raise HTTPException(status_code=403, detail="Not authorized")
    
    interventions = await db.execute(
        select(Intervention)
        .where(Intervention.student_id == student_id)
        .options(
            selectinload(Intervention.psychologist).selectinload(PsychologistProfile.user)
        )
        .order_by(desc(Intervention.created_at))
    )
    interventions = interventions.scalars().all()
    
    return [
        InterventionResponse(
            **i.__dict__,
            student_internal_id=student.internal_id,
            psychologist_name=i.psychologist.user.full_name,
        ) for i in interventions
    ]


