from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from app import models, schemas


def get_or_create_project(db: Session, project_key: str, project_name: str = None):
    """Get existing project or create new one (thread-safe)"""
    project = db.query(models.Project).filter_by(project_key=project_key).first()
    
    if project:
        return project
    
    try:
        project = models.Project(
            project_key=project_key,
            name=project_name or project_key
        )
        db.add(project)
        db.commit()
        db.refresh(project)
        return project
    except IntegrityError:
        # Race condition: another request created the project between our check and insert
        db.rollback()
        return db.query(models.Project).filter_by(project_key=project_key).one()


def create_error_event(db: Session, event: schemas.EventCreate):
    """Create a new error event"""
    # Get or create project
    project = get_or_create_project(db, event.project_key)
    
    # Create payload
    payload = {
        "message": event.message,
        "stack": event.stack,
        "method": event.method,
        "path": event.path,
        "status_code": event.status_code,
    }
    
    # Create error event
    # timestamp is already a datetime object from Pydantic validation
    # created_at will be set automatically by the database
    db_event = models.ErrorEvent(
        timestamp=event.timestamp,
        project_id=project.id,
        payload=payload
    )
    
    db.add(db_event)
    db.commit()
    db.refresh(db_event)
    
    return db_event

