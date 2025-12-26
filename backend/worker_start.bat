@echo off
REM Start Celery worker for AI analysis queue (Windows)
REM Note: --pool=solo is required on Windows (prefork pool doesn't work on Windows)

celery -A app.celery.celery_worker worker --loglevel=info --queues=ai_analysis --pool=solo

