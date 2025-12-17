import logging
import os
from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from app.database import get_db, engine
from app import models, schemas, crud

# Configure logging
logger = logging.getLogger(__name__)

# Create tables only in development
if os.getenv("ENV", "development") == "development":
    models.Base.metadata.create_all(bind=engine)

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
        db_event = crud.create_error_event(db, event)
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

