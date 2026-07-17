from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.security import get_current_active_user, require_roles
from app.models import Student, User, Classroom, School
from app.schemas.student import (
    StudentCreate,
    StudentUpdate,
    StudentResponse,
    StudentListResponse,
    StudentDetailResponse,
)


router = APIRouter()


@router.post("", response_model=StudentResponse, status_code=status.HTTP_201_CREATED)
async def create_student(
    request: Request,
    student_data: StudentCreate,
    current_user: User = Depends(require_roles("admin", "school_admin", "psychologist")),
    db: AsyncSession = Depends(get_db),
):
    classroom = await db.get(Classroom, student_data.classroom_id)
    if not classroom:
        raise HTTPException(status_code=404, detail="Classroom not found")
    
    if current_user.role != "admin" and classroom.school_id != current_user.school_id:
        raise HTTPException(status_code=403, detail="Not authorized for this school")
    
    existing = await db.execute(
        select(Student).where(
            and_(
                Student.school_id == classroom.school_id,
                Student.internal_id == student_data.internal_id
            )
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Student with this internal ID already exists in this school")
    
    student = Student(
        school_id=classroom.school_id,
        classroom_id=student_data.classroom_id,
        internal_id=student_data.internal_id,
        birth_date=student_data.birth_date,
        gender=student_data.gender,
    )
    
    db.add(student)
    await db.commit()
    await db.refresh(student)
    
    return StudentResponse.model_validate(student)


@router.get("", response_model=StudentListResponse)
async def list_students(
    classroom_id: Optional[UUID] = Query(None),
    school_id: Optional[UUID] = Query(None),
    is_active: Optional[bool] = Query(True),
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    query = select(Student).options(selectinload(Student.classroom))
    
    if current_user.role == "psychologist":
        psychologist_classrooms = await db.execute(
            select(Classroom.id).where(Classroom.psychologist_id == current_user.psychologist_profile.id)
        )
        classroom_ids = [row[0] for row in psychologist_classrooms.all()]
        query = query.where(Student.classroom_id.in_(classroom_ids))
    elif current_user.role == "school_admin":
        query = query.where(Student.school_id == current_user.school_id)
    elif current_user.role != "admin":
        if school_id:
            query = query.where(Student.school_id == school_id)
        if classroom_id:
            query = query.where(Student.classroom_id == classroom_id)
    
    if classroom_id:
        query = query.where(Student.classroom_id == classroom_id)
    if school_id:
        query = query.where(Student.school_id == school_id)
    if is_active is not None:
        query = query.where(Student.is_active == is_active)
    
    total_query = select(func.count()).select_from(query.subquery())
    total = await db.scalar(total_query) or 0
    
    query = query.order_by(Student.created_at.desc())
    query = query.offset((page - 1) * size).limit(size)
    
    result = await db.execute(query)
    students = result.scalars().all()
    
    return StudentListResponse(
        students=[StudentResponse.model_validate(s) for s in students],
        total=total,
        page=page,
        size=size,
        pages=(total + size - 1) // size,
    )


@router.get("/{student_id}", response_model=StudentDetailResponse)
async def get_student(
    student_id: UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    query = select(Student).options(
        selectinload(Student.classroom),
        selectinload(Student.school),
    ).where(Student.id == student_id)
    
    result = await db.execute(query)
    student = result.scalar_one_or_none()
    
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    
    if current_user.role == "psychologist":
        psychologist_classrooms = await db.execute(
            select(Classroom.id).where(Classroom.psychologist_id == current_user.psychologist_profile.id)
        )
        classroom_ids = [row[0] for row in psychologist_classrooms.all()]
        if student.classroom_id not in classroom_ids:
            raise HTTPException(status_code=403, detail="Not authorized to view this student")
    elif current_user.role == "school_admin" and student.school_id != current_user.school_id:
        raise HTTPException(status_code=403, detail="Not authorized to view this student")
    
    return StudentDetailResponse.model_validate(student)


@router.patch("/{student_id}", response_model=StudentResponse)
async def update_student(
    student_id: UUID,
    student_data: StudentUpdate,
    request: Request,
    current_user: User = Depends(require_roles("admin", "school_admin", "psychologist")),
    db: AsyncSession = Depends(get_db),
):
    student = await db.get(Student, student_id)
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    
    if current_user.role == "psychologist":
        psychologist_classrooms = await db.execute(
            select(Classroom.id).where(Classroom.psychologist_id == current_user.psychologist_profile.id)
        )
        classroom_ids = [row[0] for row in psychologist_classrooms.all()]
        if student.classroom_id not in classroom_ids:
            raise HTTPException(status_code=403, detail="Not authorized")
    elif current_user.role == "school_admin" and student.school_id != current_user.school_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    update_data = student_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(student, field, value)
    
    await db.commit()
    await db.refresh(student)
    
    return StudentResponse.model_validate(student)


@router.delete("/{student_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_student(
    student_id: UUID,
    request: Request,
    current_user: User = Depends(require_roles("admin", "school_admin")),
    db: AsyncSession = Depends(get_db),
):
    student = await db.get(Student, student_id)
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    
    if current_user.role == "school_admin" and student.school_id != current_user.school_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    student.is_active = False
    await db.commit()