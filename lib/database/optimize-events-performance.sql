-- Performance optimization indexes for Events Management
-- Run this migration to improve Event Management loading speed

-- Composite index for filtering cancelled events and ordering by date
-- This helps the WHERE status != 'cancelled' ORDER BY date query
CREATE INDEX IF NOT EXISTS idx_events_status_date 
ON events(status, date) 
WHERE LOWER(status) != 'cancelled';

-- Composite index for RSVP count queries (if not already optimized)
-- This helps the subquery that counts RSVPs per event
CREATE INDEX IF NOT EXISTS idx_rsvps_event_id_count 
ON rsvps(event_id) 
INCLUDE (id);

-- Analyze tables to update statistics for query planner
ANALYZE events;
ANALYZE rsvps;

