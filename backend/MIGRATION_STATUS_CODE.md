# Migration Guide: Adding status_code Column

This guide explains how to add the `status_code` column to your existing `error_events` table.

## What Changed

- Added `status_code` as a direct column in `error_events` table
- Status code is now stored as an indexed integer column (instead of only in JSONB payload)
- Existing data will be backfilled from the payload

## Steps to Apply Migration

### Option 1: Using Alembic Autogenerate (Recommended)

1. **Make sure you're in the backend directory with venv activated:**
   ```bash
   cd backend
   # Activate venv if not already activated
   .\venv\Scripts\Activate.ps1  # Windows PowerShell
   ```

2. **Generate the migration automatically:**
   ```bash
   alembic revision --autogenerate -m "Add status_code column to error_events"
   ```

3. **Review the generated migration file** in `alembic/versions/`:
   - It should add the `status_code` column
   - It should create an index
   - You may want to add backfill logic (see manual SQL below)

4. **Apply the migration:**
   ```bash
   alembic upgrade head
   ```

5. **Backfill existing data** (if migration doesn't include it):
   ```sql
   UPDATE error_events 
   SET status_code = (payload->>'status_code')::integer
   WHERE payload->>'status_code' IS NOT NULL;
   ```

6. **Verify the migration:**
   ```bash
   alembic current
   ```

### Option 2: Manual SQL (If not using Alembic)

If you prefer to run SQL directly:

```sql
-- 1. Add the column
ALTER TABLE error_events 
ADD COLUMN status_code INTEGER;

-- 2. Backfill existing data from payload
UPDATE error_events 
SET status_code = (payload->>'status_code')::integer
WHERE payload->>'status_code' IS NOT NULL;

-- 3. Create index for better query performance
CREATE INDEX idx_error_events_status_code ON error_events(status_code);
```

## Verify the Migration

After applying the migration, verify it worked:

```sql
-- Check column exists
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'error_events' AND column_name = 'status_code';

-- Check index exists
SELECT indexname 
FROM pg_indexes 
WHERE tablename = 'error_events' AND indexname = 'idx_error_events_status_code';

-- Check some records have status_code
SELECT id, status_code, payload->>'status_code' as payload_status_code
FROM error_events 
LIMIT 5;
```

## Benefits After Migration

You can now query by status code efficiently:

```sql
-- Find all 500 errors
SELECT * FROM error_events WHERE status_code = 500;

-- Count errors by status code
SELECT status_code, COUNT(*) 
FROM error_events 
GROUP BY status_code 
ORDER BY status_code;

-- Find all 4xx errors
SELECT * FROM error_events 
WHERE status_code >= 400 AND status_code < 500;
```

## Rollback (If Needed)

If you need to rollback:

```bash
# Using Alembic
alembic downgrade -1
```

Or manually:
```sql
DROP INDEX IF EXISTS idx_error_events_status_code;
ALTER TABLE error_events DROP COLUMN status_code;
```

## Notes

- The `status_code` column is nullable (existing records without status_code will be NULL)
- New records will have `status_code` populated automatically
- The payload still contains other fields (message, stack, method, path) but no longer includes status_code
- This migration is backward compatible - old code will still work

