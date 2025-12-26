# Quick Start: Celery AI Analysis Pipeline

## Quick Setup (3 Steps)

### 1. Install Dependencies
```bash
cd backend
pip install -r requirements.txt
```

### 2. Start Redis
**Windows (Docker):**
```powershell
docker run -d -p 6379:6379 redis
```

**macOS:**
```bash
brew install redis && brew services start redis
```

**Linux:**
```bash
sudo apt-get install redis-server && sudo systemctl start redis
```

### 3. Run Migration & Start Services

**Terminal 1 - FastAPI:**
```bash
cd backend
.\venv\Scripts\Activate.ps1  # Windows
# or: source venv/bin/activate  # macOS/Linux
alembic upgrade head
uvicorn app.main:app --reload
```

**Terminal 2 - Celery Worker:**
```bash
cd backend
.\venv\Scripts\Activate.ps1  # Windows
# Windows (requires --pool=solo):
celery -A app.celery_worker worker --loglevel=info --queues=ai_analysis --pool=solo
# macOS/Linux:
# celery -A app.celery_worker worker --loglevel=info --queues=ai_analysis --concurrency=2
```

## Test It

Send a 500 error:
```bash
curl -X POST http://localhost:8000/api/v1/events \
  -H "Content-Type: application/json" \
  -d '{
    "project_key": "test",
    "message": "Server error",
    "method": "GET",
    "path": "/api/test",
    "status_code": 500,
    "timestamp": "2024-01-15T12:00:00Z"
  }'
```

Check analysis in database:
```sql
SELECT e.id, e.status_code, a.analysis_text 
FROM error_events e 
LEFT JOIN error_analysis a ON e.id = a.error_event_id 
WHERE e.status_code >= 500;
```

## Files Created

- `app/celery_app.py` - Celery configuration
- `app/tasks.py` - AI analysis task
- `app/celery_worker.py` - Worker entry point
- `app/models.py` - Added ErrorAnalysis model
- `alembic/versions/add_error_analysis_table.py` - Migration

See `CELERY_SETUP.md` for detailed documentation.

