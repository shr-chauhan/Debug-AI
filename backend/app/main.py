import logging
import os
from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from app.database import get_db, engine, models
from app.schemas import schemas
from app.utils.crud import create_error_event
from app.celery import analyze_error_event

# Configure logging
logger = logging.getLogger(__name__)

# Create tables only in development
if os.getenv("ENV", "development") == "development":
    from app.database.database import Base
    Base.metadata.create_all(bind=engine)

app = FastAPI(title="Error Ingestion API", version="1.0.0")

# CORS middleware for development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.post("/api/v1/events", response_model=schemas.EventResponse)
async def create_event(
    event: schemas.EventCreate,
    db: Session = Depends(get_db)
):
    """
    Create a new error event.
    """
    try:
        db_event = create_error_event(db, event)
        
        # Enqueue AI analysis task if status_code >= 500 (non-blocking)
        if db_event.status_code and db_event.status_code >= 400:
            try:
                print(f"Enqueuing AI analysis task for error_event {db_event.id}")
                analyze_error_event.delay(db_event.id)
                logger.info(f"Enqueued AI analysis task for error_event {db_event.id}")
            except Exception as e:
                # Log but don't fail the request if task enqueueing fails
                logger.warning(f"Failed to enqueue AI analysis task: {e}")
        
        return schemas.EventResponse(
            id=db_event.id,
            timestamp=db_event.timestamp,
            message=event.message
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.exception("Failed to ingest error event")
        raise HTTPException(status_code=500, detail="Internal server error")


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "ok"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

