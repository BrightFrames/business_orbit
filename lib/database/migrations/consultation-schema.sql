-- Consultation Profiles (Experts)
CREATE TABLE IF NOT EXISTS consultation_profiles (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    hourly_rate DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    currency VARCHAR(10) DEFAULT 'USD',
    expertise VARCHAR(255)[],
    bio TEXT,
    is_available BOOLEAN DEFAULT TRUE,
    availability_days INTEGER[] DEFAULT '{1,2,3,4,5}', -- 0=Sun, 1=Mon, etc.
    start_time TIME DEFAULT '09:00',
    end_time TIME DEFAULT '17:00',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id)
);

-- Consultations (Bookings)
CREATE TABLE IF NOT EXISTS consultations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    expert_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    client_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
    duration_minutes INTEGER DEFAULT 60,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled', 'rejected')),
    meeting_link VARCHAR(500),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_consultation_profiles_user_id ON consultation_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_consultations_expert_id ON consultations(expert_id);
CREATE INDEX IF NOT EXISTS idx_consultations_client_id ON consultations(client_id);
CREATE INDEX IF NOT EXISTS idx_consultations_scheduled_at ON consultations(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_consultations_status ON consultations(status);

-- Trigger to update updated_at
DROP TRIGGER IF EXISTS update_consultation_profiles_updated_at ON consultation_profiles;
CREATE TRIGGER update_consultation_profiles_updated_at 
    BEFORE UPDATE ON consultation_profiles 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_consultations_updated_at ON consultations;
CREATE TRIGGER update_consultations_updated_at 
    BEFORE UPDATE ON consultations 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();
