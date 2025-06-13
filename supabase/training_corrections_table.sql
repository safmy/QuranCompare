-- Create table for AI Debater training corrections
CREATE TABLE IF NOT EXISTS training_corrections (
    id SERIAL PRIMARY KEY,
    message_id TEXT NOT NULL,
    correction TEXT NOT NULL,
    user_email TEXT NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    applied BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add index for faster queries
CREATE INDEX idx_training_corrections_user_email ON training_corrections(user_email);
CREATE INDEX idx_training_corrections_applied ON training_corrections(applied);

-- Add RLS policies
ALTER TABLE training_corrections ENABLE ROW LEVEL SECURITY;

-- Policy to allow authorized trainers to insert corrections
CREATE POLICY "Authorized trainers can insert corrections" ON training_corrections
    FOR INSERT
    WITH CHECK (
        auth.email() IN (
            'syedahmadfahmybinsyedsalim@gmail.com'
            -- Add more authorized trainer emails here
        )
    );

-- Policy to allow trainers to view their own corrections
CREATE POLICY "Trainers can view their own corrections" ON training_corrections
    FOR SELECT
    USING (auth.email() = user_email);

-- Policy to allow system/admin to view all corrections
CREATE POLICY "System can view all corrections" ON training_corrections
    FOR SELECT
    USING (
        auth.email() IN (
            'syedahmadfahmybinsyedsalim@gmail.com'
        )
    );