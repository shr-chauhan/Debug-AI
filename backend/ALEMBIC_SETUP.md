# Alembic Setup Instructions

## Initial Setup

### 1. Install Alembic

```bash
pip install alembic
```

Or if using requirements.txt:
```bash
pip install -r requirements.txt
```

### 2. Initialize Alembic (Already Done)

Alembic has been initialized with the following structure:
```
backend/
├── alembic/
│   ├── env.py          # Configured to use your existing database setup
│   ├── script.py.mako  # Migration template
│   └── versions/       # Migration files will be stored here
└── alembic.ini         # Alembic configuration
```

### 3. Generate Initial Migration

Generate the initial migration for your existing models:

```bash
cd backend
alembic revision --autogenerate -m "Initial migration"
```

This will create a migration file in `alembic/versions/` that includes:
- `projects` table
- `error_events` table
- All indexes and constraints

### 4. Review the Migration

**IMPORTANT**: Always review the generated migration file before applying it!

```bash
# Open the generated migration file in alembic/versions/
# Check that it matches your expected schema
```

### 5. Apply the Migration

Apply the migration to your database:

```bash
alembic upgrade head
```

This will create all tables in your database.

## Going Forward

### Creating New Migrations

When you modify your models (`app/models.py`), create a new migration:

```bash
# 1. Make changes to your models in app/models.py

# 2. Generate migration
alembic revision --autogenerate -m "Description of changes"

# 3. Review the generated migration file

# 4. Apply the migration
alembic upgrade head
```

### Common Commands

```bash
# Show current database revision
alembic current

# Show migration history
alembic history

# Upgrade to latest
alembic upgrade head

# Upgrade one step
alembic upgrade +1

# Downgrade one step
alembic downgrade -1

# Downgrade to specific revision
alembic downgrade <revision_id>

# Show SQL for a migration (without applying)
alembic upgrade head --sql
```

### Manual Migrations

For complex changes that autogenerate can't handle:

```bash
# Create empty migration
alembic revision -m "Manual migration description"

# Edit the generated file in alembic/versions/
# Add your custom upgrade() and downgrade() logic
```

## Production Deployment

1. **Never use `Base.metadata.create_all()` in production** - it's already disabled when `ENV != "development"`

2. **Run migrations before starting the app**:
   ```bash
   alembic upgrade head
   ```

3. **In Docker/CI/CD**, add migration step:
   ```dockerfile
   RUN alembic upgrade head
   ```

## Troubleshooting

### "Target database is not up to date" Error (First Migration)

If you get this error when creating your first migration, it usually means:
- The database has an `alembic_version` table pointing to a non-existent revision
- Or tables exist but Alembic isn't tracking them

**Solution:**

1. **Check current state:**
   ```bash
   alembic current
   ```

2. **If you see a revision that doesn't exist, or if tables already exist from `create_all()`:**

   **Option A: Clear alembic_version table (if tables don't exist yet)**
   ```sql
   -- Connect to your database and run:
   DROP TABLE IF EXISTS alembic_version;
   ```
   Then generate the migration:
   ```bash
   alembic revision --autogenerate -m "Initial migration"
   ```

   **Option B: If tables already exist, stamp the database as "base" first:**
   ```bash
   # Mark database as being at the base (no migrations applied yet)
   alembic stamp base
   
   # Now generate the migration
   alembic revision --autogenerate -m "Initial migration"
   
   # Review the migration - it should be empty or only have differences
   # Then stamp it as the current version
   alembic stamp head
   ```

   **Option C: Start fresh (development only - deletes all data!):**
   ```sql
   -- Drop all tables
   DROP TABLE IF EXISTS error_events CASCADE;
   DROP TABLE IF EXISTS projects CASCADE;
   DROP TABLE IF EXISTS alembic_version;
   ```
   Then generate migration:
   ```bash
   alembic revision --autogenerate -m "Initial migration"
   alembic upgrade head
   ```

### Migration conflicts
If you have conflicts between migrations:
```bash
# Show current state
alembic current

# Check what's pending
alembic heads
```

### Reset database (development only!)
```bash
# WARNING: This deletes all data!
alembic downgrade base
alembic upgrade head
```

### Manual revision stamping
If you need to mark the database as being at a specific revision:
```bash
alembic stamp <revision_id>
```

## Configuration

The Alembic configuration (`alembic/env.py`) is set up to:
- Use the same database URL as your app (from environment variables)
- Import your existing `Base.metadata` from `app.database`
- Automatically detect all models from `app.models`

No changes needed to `alembic.ini` - the database URL is set dynamically in `env.py`.

