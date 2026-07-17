CREATE TABLE IF NOT EXISTS daily_checkins (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    checkin_date DATE NOT NULL,
    mood INTEGER NOT NULL,
    sleep INTEGER NOT NULL,
    energy INTEGER NOT NULL,
    message TEXT,
    responded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_daily_checkin_student_date UNIQUE (student_id, checkin_date)
);
CREATE INDEX IF NOT EXISTS ix_daily_checkins_student_date ON daily_checkins (student_id, checkin_date);
