from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from typing import Optional, List, Tuple
from datetime import datetime
from app.database import models
from app.schemas import schemas


def get_or_create_project(db: Session, project_key: str, project_name: str = None):
    """
    Get existing project by project_key.
    Note: Projects must be created via the API (with user ownership) before SDK can send errors.
    This function will only return existing projects, not create new ones.
    """
    project = db.query(models.Project).filter_by(project_key=project_key).first()
    
    if not project:
        raise ValueError(f"Project with key '{project_key}' does not exist. Please create the project first via the API.")
    
    return project


def create_error_event(db: Session, event: schemas.EventCreate):
    """Create a new error event"""
    # Get or create project
    project = get_or_create_project(db, event.project_key)
    
    # Create payload (status_code is now stored as a column, not in payload)
    payload = {
        "message": event.message,
        "stack": event.stack,
        "method": event.method,
        "path": event.path,
    }
    
    # Create error event
    # timestamp is already a datetime object from Pydantic validation
    # created_at will be set automatically by the database
    db_event = models.ErrorEvent(
        timestamp=event.timestamp,
        project_id=project.id,
        status_code=event.status_code,
        payload=payload
    )
    
    db.add(db_event)
    db.commit()
    db.refresh(db_event)
    
    return db_event


def get_error_event_by_id(db: Session, event_id: int) -> Optional[models.ErrorEvent]:
    """Get a single error event by ID"""
    return db.query(models.ErrorEvent).filter(models.ErrorEvent.id == event_id).first()


def get_error_events(
    db: Session,
    user_id: Optional[int] = None,
    project_key: Optional[str] = None,
    status_code: Optional[int] = None,
    min_status_code: Optional[int] = None,
    max_status_code: Optional[int] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    limit: int = 50,
    offset: int = 0
) -> Tuple[List[models.ErrorEvent], int]:
    """
    Get error events with filtering and pagination.
    
    Returns:
        Tuple of (list of error events, total count)
    """
    query = db.query(models.ErrorEvent).join(models.Project)
    
    # Filter by user_id if provided (ensures users only see their own projects' errors)
    if user_id is not None:
        query = query.filter(models.Project.user_id == user_id)
    
    # Apply filters
    if project_key:
        query = query.filter(models.Project.project_key == project_key)
    
    if status_code is not None:
        query = query.filter(models.ErrorEvent.status_code == status_code)
    else:
        if min_status_code is not None:
            query = query.filter(models.ErrorEvent.status_code >= min_status_code)
        if max_status_code is not None:
            query = query.filter(models.ErrorEvent.status_code <= max_status_code)
    
    if start_date:
        query = query.filter(models.ErrorEvent.timestamp >= start_date)
    
    if end_date:
        query = query.filter(models.ErrorEvent.timestamp <= end_date)
    
    # Get total count before pagination
    total = query.count()
    
    # Apply pagination and ordering
    events = query.order_by(models.ErrorEvent.timestamp.desc()).offset(offset).limit(limit).all()
    
    return events, total


def get_error_analysis_by_event_id(
    db: Session,
    error_event_id: int
) -> Optional[models.ErrorAnalysis]:
    """Get error analysis for a specific error event"""
    return db.query(models.ErrorAnalysis).filter(
        models.ErrorAnalysis.error_event_id == error_event_id
    ).first()


def get_error_analyses(
    db: Session,
    user_id: Optional[int] = None,
    project_key: Optional[str] = None,
    model: Optional[str] = None,
    confidence: Optional[str] = None,
    limit: int = 50,
    offset: int = 0
) -> Tuple[List[models.ErrorAnalysis], int]:
    """
    Get error analyses with filtering and pagination.
    
    Returns:
        Tuple of (list of error analyses, total count)
    """
    query = db.query(models.ErrorAnalysis).join(
        models.ErrorEvent
    ).join(models.Project)
    
    # Filter by user_id if provided (ensures users only see their own projects' analyses)
    if user_id is not None:
        query = query.filter(models.Project.user_id == user_id)
    
    # Apply filters
    if project_key:
        query = query.filter(models.Project.project_key == project_key)
    
    if model:
        query = query.filter(models.ErrorAnalysis.model == model)
    
    if confidence:
        query = query.filter(models.ErrorAnalysis.confidence == confidence)
    
    # Get total count before pagination
    total = query.count()
    
    # Apply pagination and ordering
    analyses = query.order_by(models.ErrorAnalysis.created_at.desc()).offset(offset).limit(limit).all()
    
    return analyses, total


def create_project(db: Session, project_data: schemas.ProjectCreate, user_id: int) -> models.Project:
    """Create a new project with optional repository configuration"""
    # Build repo_config only if both owner and repo are provided
    # If not provided, repo_config will be None and AI analysis will use stack trace only
    repo_config = None
    if project_data.repo_owner and project_data.repo_name:
        repo_config = {
            "provider": project_data.repo_provider or "github",
            "owner": project_data.repo_owner,
            "repo": project_data.repo_name,
            "branch": project_data.branch or "main"
        }
    
    project = models.Project(
        project_key=project_data.project_key,
        name=project_data.name,
        user_id=user_id,
        language=project_data.language,
        framework=project_data.framework,
        description=project_data.description,
        repo_config=repo_config
    )
    
    try:
        db.add(project)
        db.commit()
        db.refresh(project)
        return project
    except IntegrityError:
        db.rollback()
        raise ValueError(f"Project with key '{project_data.project_key}' already exists")


def get_project_by_id(db: Session, project_id: int) -> Optional[models.Project]:
    """Get a project by ID"""
    return db.query(models.Project).filter(models.Project.id == project_id).first()


def get_project_by_key(db: Session, project_key: str) -> Optional[models.Project]:
    """Get a project by project_key"""
    return db.query(models.Project).filter(models.Project.project_key == project_key).first()


def get_projects(
    db: Session,
    user_id: Optional[int] = None,
    limit: int = 100,
    offset: int = 0
) -> Tuple[List[models.Project], int]:
    """
    Get projects with pagination, optionally filtered by user_id.
    
    Returns:
        Tuple of (list of projects, total count)
    """
    query = db.query(models.Project)
    
    # Filter by user_id if provided
    if user_id is not None:
        query = query.filter(models.Project.user_id == user_id)
    
    # Get total count
    total = query.count()
    
    # Apply pagination and ordering
    projects = query.order_by(models.Project.created_at.desc()).offset(offset).limit(limit).all()
    
    return projects, total


def get_project_error_count(db: Session, project_id: int) -> int:
    """Get the count of error events for a project"""
    return db.query(models.ErrorEvent).filter(models.ErrorEvent.project_id == project_id).count()


def get_or_create_user(
    db: Session,
    github_id: str,
    username: str,
    email: Optional[str] = None,
    name: Optional[str] = None,
    avatar_url: Optional[str] = None
) -> models.User:
    """
    Get existing user by GitHub ID or create new one.
    Updates user info if user exists.
    """
    user = db.query(models.User).filter(models.User.github_id == github_id).first()
    
    if user:
        # Update user info
        user.username = username
        if email:
            user.email = email
        if name:
            user.name = name
        if avatar_url:
            user.avatar_url = avatar_url
        db.commit()
        db.refresh(user)
        return user
    
    # Create new user (no API token needed - JWT tokens are generated on demand)
    user = models.User(
        github_id=github_id,
        username=username,
        email=email,
        name=name,
        avatar_url=avatar_url
    )
    
    try:
        db.add(user)
        db.commit()
        db.refresh(user)
        return user
    except IntegrityError:
        db.rollback()
        # Retry in case of race condition
        return db.query(models.User).filter(models.User.github_id == github_id).first()


def get_user_by_id(db: Session, user_id: int) -> Optional[models.User]:
    """Get user by ID"""
    return db.query(models.User).filter(models.User.id == user_id).first()

