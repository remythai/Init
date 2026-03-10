-- User session tracking for connection time analytics
CREATE TABLE IF NOT EXISTS user_sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    connected_at TIMESTAMP NOT NULL DEFAULT NOW(),
    disconnected_at TIMESTAMP,
    last_activity_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_connected_at ON user_sessions(connected_at);

-- Daily aggregated stats (never deleted)
CREATE TABLE IF NOT EXISTS daily_stats (
    day DATE PRIMARY KEY,
    active_users INTEGER NOT NULL DEFAULT 0,
    avg_duration_seconds NUMERIC(10, 2) NOT NULL DEFAULT 0,
    total_sessions INTEGER NOT NULL DEFAULT 0
);
