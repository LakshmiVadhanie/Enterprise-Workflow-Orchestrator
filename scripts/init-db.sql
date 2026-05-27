-- Initialize workflow database with extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Create indexes for common query patterns
-- (JPA will create the tables, we add extra performance indexes here)

-- These run after JPA creates the schema:
DO $$
BEGIN
  -- Workflow status index (most common filter)
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_workflows_status') THEN
    CREATE INDEX idx_workflows_status ON workflows(status);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_workflows_owner') THEN
    CREATE INDEX idx_workflows_owner_id ON workflows(owner_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_workflows_created_at') THEN
    CREATE INDEX idx_workflows_created_at ON workflows(created_at DESC);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_events_workflow_id') THEN
    CREATE INDEX idx_events_workflow_id ON workflow_events(workflow_id);
  END IF;
EXCEPTION WHEN OTHERS THEN
  NULL; -- Tables don't exist yet, JPA will create them
END $$;

-- Seed message
SELECT 'Database initialized for Enterprise Workflow Orchestrator' AS status;
