"""Add daily_checkins table

Revision ID: 002
Revises: 001
Create Date: 2026-07-17 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID, DATE

revision = '002'
down_revision = '001'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'daily_checkins',
        sa.Column('id', UUID(as_uuid=True), primary_key=True, server_default=sa.text('uuid_generate_v4()')),
        sa.Column('student_id', UUID(as_uuid=True), sa.ForeignKey('students.id', ondelete='CASCADE'), nullable=False),
        sa.Column('checkin_date', sa.Date(), nullable=False),
        sa.Column('mood', sa.Integer(), nullable=False),
        sa.Column('sleep', sa.Integer(), nullable=False),
        sa.Column('energy', sa.Integer(), nullable=False),
        sa.Column('message', sa.Text(), nullable=True),
        sa.Column('responded_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.UniqueConstraint('student_id', 'checkin_date', name='uq_daily_checkin_student_date'),
    )
    op.create_index('ix_daily_checkins_student_date', 'daily_checkins', ['student_id', 'checkin_date'])


def downgrade() -> None:
    op.drop_index('ix_daily_checkins_student_date', table_name='daily_checkins')
    op.drop_table('daily_checkins')
