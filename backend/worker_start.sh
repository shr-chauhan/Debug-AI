#!/bin/bash
# Start Celery worker for AI analysis queue

celery -A app.celery.celery_worker worker \
    --loglevel=info \
    --queues=ai_analysis \
    --concurrency=2 \
    --max-tasks-per-child=50

