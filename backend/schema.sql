-- PostgreSQL schema for error ingestion system

-- Projects table
CREATE TABLE IF NOT EXISTS projects (
    id SERIAL PRIMARY KEY,
    project_key VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Error events table
CREATE TABLE IF NOT EXISTS error_events (
    id SERIAL PRIMARY KEY,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    status_code INTEGER,
    payload JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Error analysis table
CREATE TABLE IF NOT EXISTS error_analysis (
    id SERIAL PRIMARY KEY,
    error_event_id INTEGER NOT NULL UNIQUE REFERENCES error_events(id) ON DELETE CASCADE,
    analysis_text TEXT NOT NULL,
    model VARCHAR(255) NOT NULL,
    confidence VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_error_events_timestamp ON error_events(timestamp);
CREATE INDEX IF NOT EXISTS idx_error_events_project_id ON error_events(project_id);
CREATE INDEX IF NOT EXISTS idx_error_events_status_code ON error_events(status_code);
CREATE INDEX IF NOT EXISTS idx_projects_project_key ON projects(project_key);
CREATE INDEX IF NOT EXISTS idx_error_analysis_error_event_id ON error_analysis(error_event_id);

-- Example: Query error events for a project
-- SELECT e.*, p.name as project_name 
-- FROM error_events e
-- JOIN projects p ON e.project_id = p.id
-- WHERE p.project_key = 'your-project-key'
-- ORDER BY e.timestamp DESC;

