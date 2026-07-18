"""Initial migration

Revision ID: 001
Revises: 
Create Date: 2024-01-15 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

revision = '001'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Enable UUID extension
    op.execute('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"')

    # schools table
    op.create_table(
        'schools',
        sa.Column('id', UUID(as_uuid=True), primary_key=True, server_default=sa.text('uuid_generate_v4()')),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('code', sa.String(50), unique=True, nullable=False),
        sa.Column('address', sa.Text, nullable=True),
        sa.Column('phone', sa.String(50), nullable=True),
        sa.Column('email', sa.String(255), nullable=True),
        sa.Column('director_name', sa.String(255), nullable=True),
        sa.Column('is_active', sa.Boolean, default=True, nullable=False),
        sa.Column('created_at', sa.DateTime, default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime, default=sa.func.now(), onupdate=sa.func.now(), nullable=False),
    )
    op.create_index('ix_schools_code', 'schools', ['code'])

    # users table
    op.create_table(
        'users',
        sa.Column('id', UUID(as_uuid=True), primary_key=True, server_default=sa.text('uuid_generate_v4()')),
        sa.Column('school_id', UUID(as_uuid=True), sa.ForeignKey('schools.id', ondelete='SET NULL'), nullable=True),
        sa.Column('email', sa.String(255), unique=True, nullable=False),
        sa.Column('hashed_password', sa.String(255), nullable=False),
        sa.Column('full_name', sa.String(255), nullable=False),
        sa.Column('role', sa.String(20), nullable=False),
        sa.Column('is_active', sa.Boolean, default=True, nullable=False),
        sa.Column('is_verified', sa.Boolean, default=False, nullable=False),
        sa.Column('last_login', sa.DateTime, nullable=True),
        sa.Column('created_at', sa.DateTime, default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime, default=sa.func.now(), onupdate=sa.func.now(), nullable=False),
    )
    op.create_index('ix_users_email', 'users', ['email'])
    op.create_index('ix_users_school_id', 'users', ['school_id'])

    # psychologist_profiles table
    op.create_table(
        'psychologist_profiles',
        sa.Column('id', UUID(as_uuid=True), primary_key=True, server_default=sa.text('uuid_generate_v4()')),
        sa.Column('user_id', UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), unique=True, nullable=False),
        sa.Column('license_number', sa.String(100), unique=True, nullable=False),
        sa.Column('specialization', sa.String(255), nullable=True),
        sa.Column('years_experience', sa.Integer, nullable=True),
        sa.Column('is_active', sa.Boolean, default=True, nullable=False),
        sa.Column('created_at', sa.DateTime, default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime, default=sa.func.now(), onupdate=sa.func.now(), nullable=False),
    )
    op.create_index('ix_psychologist_profiles_user_id', 'psychologist_profiles', ['user_id'])

    # classrooms table
    op.create_table(
        'classrooms',
        sa.Column('id', UUID(as_uuid=True), primary_key=True, server_default=sa.text('uuid_generate_v4()')),
        sa.Column('school_id', UUID(as_uuid=True), sa.ForeignKey('schools.id', ondelete='CASCADE'), nullable=False),
        sa.Column('psychologist_id', UUID(as_uuid=True), sa.ForeignKey('psychologist_profiles.id', ondelete='SET NULL'), nullable=True),
        sa.Column('name', sa.String(100), nullable=False),
        sa.Column('grade', sa.Integer, nullable=False),
        sa.Column('section', sa.String(10), nullable=False),
        sa.Column('academic_year', sa.String(20), nullable=False),
        sa.Column('capacity', sa.Integer, default=30, nullable=False),
        sa.Column('is_active', sa.Boolean, default=True, nullable=False),
        sa.Column('created_at', sa.DateTime, default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime, default=sa.func.now(), onupdate=sa.func.now(), nullable=False),
    )
    op.create_index('ix_classrooms_school_id', 'classrooms', ['school_id'])
    op.create_index('ix_classrooms_psychologist_id', 'classrooms', ['psychologist_id'])
    op.create_unique_constraint('uq_classroom_school_name_year', 'classrooms', ['school_id', 'name', 'academic_year'])

    # students table
    op.create_table(
        'students',
        sa.Column('id', UUID(as_uuid=True), primary_key=True, server_default=sa.text('uuid_generate_v4()')),
        sa.Column('user_id', UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='SET NULL'), unique=True, nullable=True),
        sa.Column('school_id', UUID(as_uuid=True), sa.ForeignKey('schools.id', ondelete='CASCADE'), nullable=False),
        sa.Column('classroom_id', UUID(as_uuid=True), sa.ForeignKey('classrooms.id', ondelete='CASCADE'), nullable=False),
        sa.Column('internal_id', sa.String(50), nullable=False),
        sa.Column('birth_date', sa.DateTime, nullable=True),
        sa.Column('gender', sa.String(20), nullable=True),
        sa.Column('enrollment_date', sa.DateTime, default=sa.func.now(), nullable=False),
        sa.Column('is_active', sa.Boolean, default=True, nullable=False),
        sa.Column('created_at', sa.DateTime, default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime, default=sa.func.now(), onupdate=sa.func.now(), nullable=False),
    )
    op.create_index('ix_students_school_id', 'students', ['school_id'])
    op.create_index('ix_students_classroom_id', 'students', ['classroom_id'])
    op.create_index('ix_students_user_id', 'students', ['user_id'])
    op.create_unique_constraint('uq_student_school_internal_id', 'students', ['school_id', 'internal_id'])

    # surveys table
    op.create_table(
        'surveys',
        sa.Column('id', UUID(as_uuid=True), primary_key=True, server_default=sa.text('uuid_generate_v4()')),
        sa.Column('school_id', UUID(as_uuid=True), sa.ForeignKey('schools.id', ondelete='CASCADE'), nullable=False),
        sa.Column('name', sa.String(200), nullable=False),
        sa.Column('description', sa.Text, nullable=True),
        sa.Column('status', sa.String(20), default='draft', nullable=False),
        sa.Column('start_date', sa.DateTime, nullable=False),
        sa.Column('end_date', sa.DateTime, nullable=False),
        sa.Column('frequency_weeks', sa.Integer, default=1, nullable=False),
        sa.Column('is_anonymous', sa.Boolean, default=False, nullable=False),
        sa.Column('created_at', sa.DateTime, default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime, default=sa.func.now(), onupdate=sa.func.now(), nullable=False),
    )
    op.create_index('ix_surveys_school_id', 'surveys', ['school_id'])

    # questions table
    op.create_table(
        'questions',
        sa.Column('id', UUID(as_uuid=True), primary_key=True, server_default=sa.text('uuid_generate_v4()')),
        sa.Column('survey_id', UUID(as_uuid=True), sa.ForeignKey('surveys.id', ondelete='CASCADE'), nullable=False),
        sa.Column('text', sa.Text, nullable=False),
        sa.Column('question_type', sa.String(20), nullable=False),
        sa.Column('order', sa.Integer, nullable=False),
        sa.Column('category', sa.String(50), nullable=False),
        sa.Column('options', sa.Text, nullable=True),
        sa.Column('min_value', sa.Integer, nullable=True),
        sa.Column('max_value', sa.Integer, nullable=True),
        sa.Column('is_required', sa.Boolean, default=True, nullable=False),
        sa.Column('is_active', sa.Boolean, default=True, nullable=False),
        sa.Column('created_at', sa.DateTime, default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime, default=sa.func.now(), onupdate=sa.func.now(), nullable=False),
    )
    op.create_index('ix_questions_survey_id', 'questions', ['survey_id'])

    # responses table
    op.create_table(
        'responses',
        sa.Column('id', UUID(as_uuid=True), primary_key=True, server_default=sa.text('uuid_generate_v4()')),
        sa.Column('survey_id', UUID(as_uuid=True), sa.ForeignKey('surveys.id', ondelete='CASCADE'), nullable=False),
        sa.Column('question_id', UUID(as_uuid=True), sa.ForeignKey('questions.id', ondelete='CASCADE'), nullable=False),
        sa.Column('student_id', UUID(as_uuid=True), sa.ForeignKey('students.id', ondelete='CASCADE'), nullable=False),
        sa.Column('value_numeric', sa.Float, nullable=True),
        sa.Column('value_text', sa.Text, nullable=True),
        sa.Column('value_json', sa.Text, nullable=True),
        sa.Column('responded_at', sa.DateTime, default=sa.func.now(), nullable=False),
        sa.Column('created_at', sa.DateTime, default=sa.func.now(), nullable=False),
    )
    op.create_index('ix_responses_survey_id', 'responses', ['survey_id'])
    op.create_index('ix_responses_question_id', 'responses', ['question_id'])
    op.create_index('ix_responses_student_id', 'responses', ['student_id'])
    op.create_index('ix_responses_student_survey', 'responses', ['student_id', 'survey_id'])
    op.create_unique_constraint('uq_response_unique', 'responses', ['survey_id', 'question_id', 'student_id'])

    # wellbeing_scores table
    op.create_table(
        'wellbeing_scores',
        sa.Column('id', UUID(as_uuid=True), primary_key=True, server_default=sa.text('uuid_generate_v4()')),
        sa.Column('student_id', UUID(as_uuid=True), sa.ForeignKey('students.id', ondelete='CASCADE'), nullable=False),
        sa.Column('survey_id', UUID(as_uuid=True), sa.ForeignKey('surveys.id', ondelete='CASCADE'), nullable=False),
        sa.Column('emotional_score', sa.Float, nullable=False),
        sa.Column('safety_score', sa.Float, nullable=False),
        sa.Column('belonging_score', sa.Float, nullable=False),
        sa.Column('trend_score', sa.Float, nullable=False),
        sa.Column('overall_score', sa.Float, nullable=False),
        sa.Column('risk_level', sa.String(20), nullable=False),
        sa.Column('calculated_at', sa.DateTime, default=sa.func.now(), nullable=False),
        sa.Column('created_at', sa.DateTime, default=sa.func.now(), nullable=False),
    )
    op.create_index('ix_wellbeing_scores_student_id', 'wellbeing_scores', ['student_id'])
    op.create_index('ix_wellbeing_scores_survey_id', 'wellbeing_scores', ['survey_id'])
    op.create_index('ix_wellbeing_scores_student_calculated', 'wellbeing_scores', ['student_id', 'calculated_at'])
    op.create_unique_constraint('uq_wellbeing_student_survey', 'wellbeing_scores', ['student_id', 'survey_id'])

    # risk_predictions table
    op.create_table(
        'risk_predictions',
        sa.Column('id', UUID(as_uuid=True), primary_key=True, server_default=sa.text('uuid_generate_v4()')),
        sa.Column('student_id', UUID(as_uuid=True), sa.ForeignKey('students.id', ondelete='CASCADE'), nullable=False),
        sa.Column('survey_id', UUID(as_uuid=True), sa.ForeignKey('surveys.id', ondelete='CASCADE'), nullable=False),
        sa.Column('model_name', sa.String(100), nullable=False),
        sa.Column('model_version', sa.String(50), nullable=False),
        sa.Column('risk_probability', sa.Float, nullable=False),
        sa.Column('risk_level', sa.String(20), nullable=False),
        sa.Column('feature_importance', sa.Text, nullable=True),
        sa.Column('shap_values', sa.Text, nullable=True),
        sa.Column('recommended_action', sa.Text, nullable=True),
        sa.Column('predicted_at', sa.DateTime, default=sa.func.now(), nullable=False),
        sa.Column('created_at', sa.DateTime, default=sa.func.now(), nullable=False),
    )
    op.create_index('ix_risk_predictions_student_id', 'risk_predictions', ['student_id'])
    op.create_index('ix_risk_predictions_survey_id', 'risk_predictions', ['survey_id'])
    op.create_index('ix_risk_predictions_student_predicted', 'risk_predictions', ['student_id', 'predicted_at'])

    # support_requests table
    op.create_table(
        'support_requests',
        sa.Column('id', UUID(as_uuid=True), primary_key=True, server_default=sa.text('uuid_generate_v4()')),
        sa.Column('student_id', UUID(as_uuid=True), sa.ForeignKey('students.id', ondelete='CASCADE'), nullable=False),
        sa.Column('request_type', sa.String(50), nullable=False),
        sa.Column('message', sa.Text, nullable=True),
        sa.Column('is_anonymous', sa.Boolean, default=True, nullable=False),
        sa.Column('status', sa.String(50), default='pending', nullable=False),
        sa.Column('assigned_psychologist_id', UUID(as_uuid=True), sa.ForeignKey('psychologist_profiles.id', ondelete='SET NULL'), nullable=True),
        sa.Column('created_at', sa.DateTime, default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime, default=sa.func.now(), onupdate=sa.func.now(), nullable=False),
        sa.Column('resolved_at', sa.DateTime, nullable=True),
    )
    op.create_index('ix_support_requests_student_id', 'support_requests', ['student_id'])
    op.create_index('ix_support_requests_assigned_psychologist', 'support_requests', ['assigned_psychologist_id'])

    # interventions table
    op.create_table(
        'interventions',
        sa.Column('id', UUID(as_uuid=True), primary_key=True, server_default=sa.text('uuid_generate_v4()')),
        sa.Column('student_id', UUID(as_uuid=True), sa.ForeignKey('students.id', ondelete='CASCADE'), nullable=False),
        sa.Column('psychologist_id', UUID(as_uuid=True), sa.ForeignKey('psychologist_profiles.id', ondelete='CASCADE'), nullable=False),
        sa.Column('intervention_type', sa.String(50), nullable=False),
        sa.Column('description', sa.Text, nullable=False),
        sa.Column('outcome', sa.Text, nullable=True),
        sa.Column('follow_up_date', sa.DateTime, nullable=True),
        sa.Column('is_completed', sa.Boolean, default=False, nullable=False),
        sa.Column('completed_at', sa.DateTime, nullable=True),
        sa.Column('created_at', sa.DateTime, default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime, default=sa.func.now(), onupdate=sa.func.now(), nullable=False),
    )
    op.create_index('ix_interventions_student_id', 'interventions', ['student_id'])
    op.create_index('ix_interventions_psychologist_id', 'interventions', ['psychologist_id'])
    op.create_index('ix_interventions_student_created', 'interventions', ['student_id', 'created_at'])

    # audit_logs table
    op.create_table(
        'audit_logs',
        sa.Column('id', UUID(as_uuid=True), primary_key=True, server_default=sa.text('uuid_generate_v4()')),
        sa.Column('user_id', UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
        sa.Column('action', sa.String(100), nullable=False),
        sa.Column('resource_type', sa.String(100), nullable=False),
        sa.Column('resource_id', UUID(as_uuid=True), nullable=True),
        sa.Column('details', sa.Text, nullable=True),
        sa.Column('ip_address', sa.String(45), nullable=True),
        sa.Column('user_agent', sa.Text, nullable=True),
        sa.Column('created_at', sa.DateTime, default=sa.func.now(), nullable=False),
    )
    op.create_index('ix_audit_logs_user_id', 'audit_logs', ['user_id'])
    op.create_index('ix_audit_logs_resource', 'audit_logs', ['resource_type', 'resource_id'])
    op.create_index('ix_audit_logs_created_at', 'audit_logs', ['created_at'])

    # school_psychologists association table
    op.create_table(
        'school_psychologists',
        sa.Column('school_id', UUID(as_uuid=True), sa.ForeignKey('schools.id', ondelete='CASCADE'), primary_key=True),
        sa.Column('psychologist_id', UUID(as_uuid=True), sa.ForeignKey('psychologist_profiles.id', ondelete='CASCADE'), primary_key=True),
        sa.Column('assigned_at', sa.DateTime, default=sa.func.now(), nullable=False),
    )


def downgrade() -> None:
    op.drop_table('school_psychologists')
    op.drop_table('audit_logs')
    op.drop_table('interventions')
    op.drop_table('support_requests')
    op.drop_table('risk_predictions')
    op.drop_table('wellbeing_scores')
    op.drop_table('responses')
    op.drop_table('questions')
    op.drop_table('surveys')
    op.drop_table('students')
    op.drop_table('classrooms')
    op.drop_table('psychologist_profiles')
    op.drop_table('users')
    op.drop_table('schools')
    op.execute('DROP EXTENSION IF EXISTS "uuid-ossp"')