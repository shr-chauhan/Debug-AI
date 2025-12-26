"""
Celery worker entry point for AI analysis pipeline

Run with: celery -A app.celery.celery_worker worker --loglevel=info -Q ai_analysis
"""
from app.celery.celery_app import celery_app

if __name__ == "__main__":
    celery_app.start()

