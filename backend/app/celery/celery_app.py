"""
Celery application configuration for AI analysis pipeline
"""
import os
from celery import Celery
from dotenv import load_dotenv

load_dotenv()

# Redis configuration
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")

# Create Celery app
celery_app = Celery(
    "error_ingestion",
    broker=REDIS_URL,
    backend=REDIS_URL,
    include=["app.celery.tasks"]
)

# Celery configuration
celery_app.conf.update(
    # Task routing
    task_routes={
        "app.celery.tasks.analyze_error_event": {"queue": "ai_analysis"},
    },
    
    # Task settings
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    
    # Retry configuration (suitable for LLM calls)
    task_acks_late=True,
    task_reject_on_worker_lost=True,
    task_time_limit=300,  # 5 minutes hard limit
    task_soft_time_limit=240,  # 4 minutes soft limit
    
    # Retry settings
    task_autoretry_for=(Exception,),
    task_retry_backoff=True,
    task_retry_backoff_max=600,  # Max 10 minutes
    task_max_retries=3,
    
    # Worker settings
    worker_prefetch_multiplier=1,
    worker_max_tasks_per_child=50,
)

