import enum
from datetime import datetime, date
from typing import Optional, List
from uuid import UUID
from sqlalchemy import (
    String, Text, Integer, Float, Boolean, DateTime, Date,
    ForeignKey, Index, UniqueConstraint, func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base, TimestampMixin


# ─── Enums ────────────────────────────────────────────────────────────────────

class UserRole(str, enum.Enum):
    ADMIN = "admin"
    SCHOOL_ADMIN = "school_admin"
    PSYCHOLOGIST = "psychologist"
    STUDENT = "student"


class SurveyStatus(str, enum.Enum):
    DRAFT = "draft"
    ACTIVE = "active"
    PAUSED = "paused"
    COMPLETED = "completed"
    ARCHIVED = "archived"


class QuestionType(str, enum.Enum):
    EMOJI_SCALE = "emoji_scale"
    SLIDER = "slider"
    SINGLE_CHOICE = "single_choice"
    MULTIPLE_CHOICE = "multiple_choice"
    YES_NO = "yes_no"
    OPEN_TEXT = "open_text"


class RiskLevel(str, enum.Enum):
    LOW = "low"
    MODERATE = "moderate"
    HIGH = "high"
    CRITICAL = "critical"


class SupportRequestType(str, enum.Enum):
    I_WANT_TO_TALK = "i_want_to_talk"
    I_WANT_HELP = "i_want_help"
    I_WANT_TO_REPORT = "i_want_to_report"
    GENERAL_SUPPORT = "general_support"


class InterventionType(str, enum.Enum):
    CONVERSATION = "conversation"
    SESSION_SCHEDULED = "session_scheduled"
    EXTERNAL_REFERRAL = "external_referral"
    GROUP_ACTIVITY = "group_activity"
    FOLLOW_UP = "follow_up"
    PARENT_CONTACT = "parent_contact"
    OTHER = "other"


# ─── Models ───────────────────────────────────────────────────────────────────

class School(TimestampMixin, Base):
    __tablename__ = "schools"

    id: Mapped[UUID] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    code: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    address: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    phone: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    email: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    director_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    users: Mapped[List["User"]] = relationship(back_populates="school")
    students: Mapped[List["Student"]] = relationship(back_populates="school")
    classrooms: Mapped[List["Classroom"]] = relationship(back_populates="school")
    surveys: Mapped[List["Survey"]] = relationship(back_populates="school")
    psychologists: Mapped[List["PsychologistProfile"]] = relationship(
        secondary="school_psychologists", back_populates="schools"
    )


class User(TimestampMixin, Base):
    __tablename__ = "users"

    id: Mapped[UUID] = mapped_column(primary_key=True)
    school_id: Mapped[Optional[UUID]] = mapped_column(ForeignKey("schools.id", ondelete="SET NULL"), nullable=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[UserRole] = mapped_column(String(20), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    last_login: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    school: Mapped[Optional["School"]] = relationship(back_populates="users")
    psychologist_profile: Mapped[Optional["PsychologistProfile"]] = relationship(
        back_populates="user", uselist=False
    )
    student_profile: Mapped[Optional["Student"]] = relationship(
        back_populates="user", uselist=False
    )


class PsychologistProfile(TimestampMixin, Base):
    __tablename__ = "psychologist_profiles"

    id: Mapped[UUID] = mapped_column(primary_key=True)
    user_id: Mapped[UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    license_number: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    specialization: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    years_experience: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    user: Mapped["User"] = relationship(back_populates="psychologist_profile")
    classrooms: Mapped[List["Classroom"]] = relationship(back_populates="psychologist")
    interventions: Mapped[List["Intervention"]] = relationship(back_populates="psychologist")
    support_requests: Mapped[List["SupportRequest"]] = relationship(
        back_populates="assigned_psychologist"
    )
    schools: Mapped[List["School"]] = relationship(
        secondary="school_psychologists", back_populates="psychologists"
    )


class Classroom(TimestampMixin, Base):
    __tablename__ = "classrooms"

    id: Mapped[UUID] = mapped_column(primary_key=True)
    school_id: Mapped[UUID] = mapped_column(ForeignKey("schools.id", ondelete="CASCADE"), nullable=False)
    psychologist_id: Mapped[Optional[UUID]] = mapped_column(
        ForeignKey("psychologist_profiles.id", ondelete="SET NULL"), nullable=True
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    grade: Mapped[int] = mapped_column(Integer, nullable=False)
    section: Mapped[str] = mapped_column(String(10), nullable=False)
    academic_year: Mapped[str] = mapped_column(String(20), nullable=False)
    capacity: Mapped[int] = mapped_column(Integer, default=30, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    __table_args__ = (
        UniqueConstraint("school_id", "name", "academic_year", name="uq_classroom_school_name_year"),
    )

    school: Mapped["School"] = relationship(back_populates="classrooms")
    psychologist: Mapped[Optional["PsychologistProfile"]] = relationship(back_populates="classrooms")
    students: Mapped[List["Student"]] = relationship(back_populates="classroom")


class Student(TimestampMixin, Base):
    __tablename__ = "students"

    id: Mapped[UUID] = mapped_column(primary_key=True)
    user_id: Mapped[Optional[UUID]] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), unique=True, nullable=True
    )
    school_id: Mapped[UUID] = mapped_column(ForeignKey("schools.id", ondelete="CASCADE"), nullable=False)
    classroom_id: Mapped[UUID] = mapped_column(ForeignKey("classrooms.id", ondelete="CASCADE"), nullable=False)
    internal_id: Mapped[str] = mapped_column(String(50), nullable=False)
    birth_date: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    gender: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    enrollment_date: Mapped[datetime] = mapped_column(DateTime, default=func.now(), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    __table_args__ = (
        UniqueConstraint("school_id", "internal_id", name="uq_student_school_internal_id"),
    )

    user: Mapped[Optional["User"]] = relationship(back_populates="student_profile")
    school: Mapped["School"] = relationship(back_populates="students")
    classroom: Mapped["Classroom"] = relationship(back_populates="students")
    responses: Mapped[List["Response"]] = relationship(back_populates="student")
    wellbeing_scores: Mapped[List["WellbeingScore"]] = relationship(back_populates="student")
    risk_predictions: Mapped[List["RiskPrediction"]] = relationship(back_populates="student")
    support_requests: Mapped[List["SupportRequest"]] = relationship(back_populates="student")
    interventions: Mapped[List["Intervention"]] = relationship(back_populates="student")
    daily_checkins: Mapped[List["DailyCheckin"]] = relationship(back_populates="student")


class Survey(TimestampMixin, Base):
    __tablename__ = "surveys"

    id: Mapped[UUID] = mapped_column(primary_key=True)
    school_id: Mapped[UUID] = mapped_column(ForeignKey("schools.id", ondelete="CASCADE"), nullable=False)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    status: Mapped[SurveyStatus] = mapped_column(String(20), default=SurveyStatus.DRAFT, nullable=False)
    start_date: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    end_date: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    frequency_weeks: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    is_anonymous: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    school: Mapped["School"] = relationship(back_populates="surveys")
    questions: Mapped[List["Question"]] = relationship(back_populates="survey", order_by="Question.order")
    responses: Mapped[List["Response"]] = relationship(back_populates="survey")
    wellbeing_scores: Mapped[List["WellbeingScore"]] = relationship(back_populates="survey")
    risk_predictions: Mapped[List["RiskPrediction"]] = relationship(back_populates="survey")


class Question(TimestampMixin, Base):
    __tablename__ = "questions"

    id: Mapped[UUID] = mapped_column(primary_key=True)
    survey_id: Mapped[UUID] = mapped_column(ForeignKey("surveys.id", ondelete="CASCADE"), nullable=False)
    text: Mapped[str] = mapped_column(Text, nullable=False)
    question_type: Mapped[QuestionType] = mapped_column(String(20), nullable=False)
    order: Mapped[int] = mapped_column(Integer, nullable=False)
    category: Mapped[str] = mapped_column(String(50), nullable=False)
    options: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    min_value: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    max_value: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    is_required: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    survey: Mapped["Survey"] = relationship(back_populates="questions")
    responses: Mapped[List["Response"]] = relationship(back_populates="question")


class Response(Base):
    __tablename__ = "responses"

    id: Mapped[UUID] = mapped_column(primary_key=True)
    survey_id: Mapped[UUID] = mapped_column(ForeignKey("surveys.id", ondelete="CASCADE"), nullable=False)
    question_id: Mapped[UUID] = mapped_column(ForeignKey("questions.id", ondelete="CASCADE"), nullable=False)
    student_id: Mapped[UUID] = mapped_column(ForeignKey("students.id", ondelete="CASCADE"), nullable=False)
    value_numeric: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    value_text: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    value_json: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    responded_at: Mapped[datetime] = mapped_column(DateTime, default=func.now(), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=func.now(), nullable=False)

    __table_args__ = (
        UniqueConstraint("survey_id", "question_id", "student_id", name="uq_response_unique"),
        Index("ix_responses_student_survey", "student_id", "survey_id"),
    )

    survey: Mapped["Survey"] = relationship(back_populates="responses")
    question: Mapped["Question"] = relationship(back_populates="responses")
    student: Mapped["Student"] = relationship(back_populates="responses")


class WellbeingScore(Base):
    __tablename__ = "wellbeing_scores"

    id: Mapped[UUID] = mapped_column(primary_key=True)
    student_id: Mapped[UUID] = mapped_column(ForeignKey("students.id", ondelete="CASCADE"), nullable=False)
    survey_id: Mapped[UUID] = mapped_column(ForeignKey("surveys.id", ondelete="CASCADE"), nullable=False)
    emotional_score: Mapped[float] = mapped_column(Float, nullable=False)
    safety_score: Mapped[float] = mapped_column(Float, nullable=False)
    belonging_score: Mapped[float] = mapped_column(Float, nullable=False)
    trend_score: Mapped[float] = mapped_column(Float, nullable=False)
    overall_score: Mapped[float] = mapped_column(Float, nullable=False)
    risk_level: Mapped[RiskLevel] = mapped_column(String(20), nullable=False)
    calculated_at: Mapped[datetime] = mapped_column(DateTime, default=func.now(), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=func.now(), nullable=False)

    __table_args__ = (
        UniqueConstraint("student_id", "survey_id", name="uq_wellbeing_student_survey"),
        Index("ix_wellbeing_scores_student_calculated", "student_id", "calculated_at"),
    )

    student: Mapped["Student"] = relationship(back_populates="wellbeing_scores")
    survey: Mapped["Survey"] = relationship(back_populates="wellbeing_scores")


class RiskPrediction(Base):
    __tablename__ = "risk_predictions"

    id: Mapped[UUID] = mapped_column(primary_key=True)
    student_id: Mapped[UUID] = mapped_column(ForeignKey("students.id", ondelete="CASCADE"), nullable=False)
    survey_id: Mapped[UUID] = mapped_column(ForeignKey("surveys.id", ondelete="CASCADE"), nullable=False)
    model_name: Mapped[str] = mapped_column(String(100), nullable=False)
    model_version: Mapped[str] = mapped_column(String(50), nullable=False)
    risk_probability: Mapped[float] = mapped_column(Float, nullable=False)
    risk_level: Mapped[RiskLevel] = mapped_column(String(20), nullable=False)
    feature_importance: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    shap_values: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    recommended_action: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    predicted_at: Mapped[datetime] = mapped_column(DateTime, default=func.now(), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=func.now(), nullable=False)

    __table_args__ = (
        Index("ix_risk_predictions_student_predicted", "student_id", "predicted_at"),
    )

    student: Mapped["Student"] = relationship(back_populates="risk_predictions")
    survey: Mapped["Survey"] = relationship(back_populates="risk_predictions")


class SupportRequest(TimestampMixin, Base):
    __tablename__ = "support_requests"

    id: Mapped[UUID] = mapped_column(primary_key=True)
    student_id: Mapped[UUID] = mapped_column(ForeignKey("students.id", ondelete="CASCADE"), nullable=False)
    request_type: Mapped[SupportRequestType] = mapped_column(String(50), nullable=False)
    message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    is_anonymous: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    status: Mapped[str] = mapped_column(String(50), default="pending", nullable=False)
    assigned_psychologist_id: Mapped[Optional[UUID]] = mapped_column(
        ForeignKey("psychologist_profiles.id", ondelete="SET NULL"), nullable=True
    )
    resolved_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    student: Mapped["Student"] = relationship(back_populates="support_requests")
    assigned_psychologist: Mapped[Optional["PsychologistProfile"]] = relationship(
        back_populates="support_requests"
    )


class Intervention(TimestampMixin, Base):
    __tablename__ = "interventions"

    id: Mapped[UUID] = mapped_column(primary_key=True)
    student_id: Mapped[UUID] = mapped_column(ForeignKey("students.id", ondelete="CASCADE"), nullable=False)
    psychologist_id: Mapped[UUID] = mapped_column(
        ForeignKey("psychologist_profiles.id", ondelete="CASCADE"), nullable=False
    )
    intervention_type: Mapped[InterventionType] = mapped_column(String(50), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    outcome: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    follow_up_date: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    is_completed: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    __table_args__ = (
        Index("ix_interventions_student_created", "student_id", "created_at"),
    )

    student: Mapped["Student"] = relationship(back_populates="interventions")
    psychologist: Mapped["PsychologistProfile"] = relationship(back_populates="interventions")


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id: Mapped[UUID] = mapped_column(primary_key=True)
    user_id: Mapped[Optional[UUID]] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    action: Mapped[str] = mapped_column(String(100), nullable=False)
    resource_type: Mapped[str] = mapped_column(String(100), nullable=False)
    resource_id: Mapped[Optional[UUID]] = mapped_column(String(36), nullable=True)
    details: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    ip_address: Mapped[Optional[str]] = mapped_column(String(45), nullable=True)
    user_agent: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=func.now(), nullable=False)


class DailyCheckin(Base):
    __tablename__ = "daily_checkins"

    id: Mapped[UUID] = mapped_column(primary_key=True)
    student_id: Mapped[UUID] = mapped_column(ForeignKey("students.id", ondelete="CASCADE"), nullable=False)
    checkin_date: Mapped[date] = mapped_column(Date, nullable=False)
    mood: Mapped[int] = mapped_column(Integer, nullable=False)
    sleep: Mapped[int] = mapped_column(Integer, nullable=False)
    energy: Mapped[int] = mapped_column(Integer, nullable=False)
    message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    responded_at: Mapped[datetime] = mapped_column(DateTime, default=func.now(), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=func.now(), nullable=False)

    __table_args__ = (
        UniqueConstraint("student_id", "checkin_date", name="uq_daily_checkin_student_date"),
        Index("ix_daily_checkins_student_date", "student_id", "checkin_date"),
    )

    student: Mapped["Student"] = relationship(back_populates="daily_checkins")


class SchoolPsychologist(Base):
    __tablename__ = "school_psychologists"

    school_id: Mapped[UUID] = mapped_column(
        ForeignKey("schools.id", ondelete="CASCADE"), primary_key=True
    )
    psychologist_id: Mapped[UUID] = mapped_column(
        ForeignKey("psychologist_profiles.id", ondelete="CASCADE"), primary_key=True
    )
    assigned_at: Mapped[datetime] = mapped_column(DateTime, default=func.now(), nullable=False)
