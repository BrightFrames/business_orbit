-- Create event_proposals table to store user event proposals
CREATE TABLE IF NOT EXISTS event_proposals (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    event_title VARCHAR(255) NOT NULL,
    event_date TIMESTAMP NOT NULL,
    mode VARCHAR(50) NOT NULL CHECK (mode IN ('Online', 'Physical')),
    description TEXT,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add index on status for filtering
CREATE INDEX IF NOT EXISTS idx_event_proposals_status ON event_proposals(status);

-- Add trigger to update updated_at
DROP TRIGGER IF EXISTS update_event_proposals_updated_at ON event_proposals;
CREATE TRIGGER update_event_proposals_updated_at 
    BEFORE UPDATE ON event_proposals 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

