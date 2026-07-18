"""add chat_reports table

Revision ID: 003
Revises: 002
Create Date: 2026-07-18
"""
from alembic import op
import sqlalchemy as sa

revision = "003"
down_revision = "002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "chat_reports",
        sa.Column("id", sa.dialects.postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("student_id", sa.dialects.postgresql.UUID(as_uuid=True), sa.ForeignKey("students.id", ondelete="CASCADE"), nullable=False),
        sa.Column("session_id", sa.String(255), nullable=False),
        sa.Column("risk_level", sa.String(20), nullable=False),
        sa.Column("risk_signals", sa.Text, nullable=True),
        sa.Column("messages_snapshot", sa.Text, nullable=True),
        sa.Column("summary", sa.Text, nullable=True),
        sa.Column("status", sa.String(20), nullable=False, server_default="pending"),
        sa.Column("psychologist_id", sa.dialects.postgresql.UUID(as_uuid=True), sa.ForeignKey("psychologist_profiles.id", ondelete="SET NULL"), nullable=True),
        sa.Column("reviewer_notes", sa.Text, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("reviewed_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_chat_reports_student_created", "chat_reports", ["student_id", "created_at"])
    op.create_index("ix_chat_reports_status_risk", "chat_reports", ["status", "risk_level"])


def downgrade() -> None:
    op.drop_index("ix_chat_reports_status_risk")
    op.drop_index("ix_chat_reports_student_created")
    op.drop_table("chat_reports")
