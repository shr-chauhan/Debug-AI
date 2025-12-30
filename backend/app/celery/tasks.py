"""
Celery tasks for AI analysis pipeline
"""
import os
import time
import logging
from typing import Optional, Dict, List
from sqlalchemy.orm import Session
from app.celery.celery_app import celery_app
from app.database.database import SessionLocal
from app.database import models
from app.utils.stack_trace_parser import parse_stack_trace, get_relevant_files, StackFrame
from app.utils.git_fetcher import GitFetcher, RepoConfig
from app.utils.prompt_builder import build_debugging_prompt

logger = logging.getLogger(__name__)

# Configuration constants
GIT_FETCH_TIMEOUT_PER_FILE = 5  # seconds per file
GIT_FETCH_TOTAL_TIMEOUT = 15  # seconds total for all fetches
MIN_FILES_FOR_CONTEXT = 2  # Minimum files to consider "enough" context


@celery_app.task(bind=True, name="app.celery.tasks.analyze_error_event")
def analyze_error_event(self, error_event_id: int):
    """
    Analyze an error event using AI/LLM.
    
    Args:
        error_event_id: ID of the error event to analyze
        
    Returns:
        dict: Analysis result with id and status
    """
    db: Session = SessionLocal()
    
    try:
        # Fetch error event
        error_event = db.query(models.ErrorEvent).filter(
            models.ErrorEvent.id == error_event_id
        ).first()
        if not error_event:
            logger.warning(f"Error event {error_event_id} not found")
            return {"status": "skipped", "reason": "error_event_not_found"}
        
        # Skip if status_code < 500 (only analyze server errors)
        if error_event.status_code is None or error_event.status_code < 500:
            logger.info(f"Skipping analysis for error_event {error_event_id}: status_code < 500")
            return {"status": "skipped", "reason": "status_code_too_low"}
        
        # Check if analysis already exists
        existing_analysis = db.query(models.ErrorAnalysis).filter(
            models.ErrorAnalysis.error_event_id == error_event_id
        ).first()
        
        if existing_analysis:
            logger.info(f"Analysis already exists for error_event {error_event_id}")
            return {"status": "skipped", "reason": "analysis_exists", "analysis_id": existing_analysis.id}
        
        # Get repo config from project (if available)
        repo_config_dict = error_event.project.repo_config if error_event.project.repo_config else None
        
        # Perform AI analysis
        analysis_result = perform_ai_analysis(error_event, repo_config_dict)
        
        # Store analysis result
        analysis = models.ErrorAnalysis(
            error_event_id=error_event_id,
            analysis_text=analysis_result["analysis"],
            model=analysis_result["model"],
            confidence=analysis_result.get("confidence"),
        )
        
        db.add(analysis)
        db.commit()
        db.refresh(analysis)
        
        logger.info(f"Analysis completed for error_event {error_event_id}, analysis_id: {analysis.id}")
        
        return {
            "status": "success",
            "analysis_id": analysis.id,
            "error_event_id": error_event_id
        }
        
    except Exception as exc:
        logger.exception(f"Failed to analyze error_event {error_event_id}")
        # Retry the task
        raise self.retry(exc=exc)
        
    finally:
        db.close()


def perform_ai_analysis(
    error_event: models.ErrorEvent,
    repo_config_dict: Optional[Dict] = None
) -> dict:
    """
    Perform AI analysis on an error event using LLM with stack trace and source code context.
    
    Args:
        error_event: ErrorEvent model instance
        repo_config_dict: Repository configuration dict (from Project.repo_config)
                          Format: {owner, repo, branch, provider, access_token}
        
    Returns:
        dict: Analysis result with analysis, model, and confidence
    """
    # Extract error details from payload
    payload = error_event.payload
    error_message = payload.get("message", "Unknown error")
    error_stack = payload.get("stack", "")
    
    # Step 1: Parse stack trace to extract file paths and line numbers
    stack_frames = parse_stack_trace(error_stack)
    relevant_frames = get_relevant_files(stack_frames, max_files=5)
    
    logger.info(f"Parsed {len(stack_frames)} stack frames, selected {len(relevant_frames)} relevant files")
    
    # Step 2: Fetch source code from Git (if repo config available)
    # Note: If repo_config_dict is None or empty, analysis will proceed using only stack trace
    # With timeout protection and early exit
    source_code_context = []
    if repo_config_dict and relevant_frames:
        try:
            # Get project key for token lookup
            project_key = error_event.project.project_key
            repo_config = _create_repo_config(repo_config_dict, project_key)
            fetcher = GitFetcher(repo_config, timeout=GIT_FETCH_TIMEOUT_PER_FILE)
            
            fetch_start_time = time.time()
            
            for idx, frame in enumerate(relevant_frames):
                # Check total timeout
                elapsed_time = time.time() - fetch_start_time
                if elapsed_time >= GIT_FETCH_TOTAL_TIMEOUT:
                    logger.warning(f"Git fetch timeout reached ({GIT_FETCH_TOTAL_TIMEOUT}s). Stopping early.")
                    break
                
                # Early exit if we have enough context from top frames
                if idx >= MIN_FILES_FOR_CONTEXT and len(source_code_context) >= MIN_FILES_FOR_CONTEXT:
                    logger.info(f"Gathered enough context from {len(source_code_context)} files. Stopping early.")
                    break
                
                try:
                    # Normalize file path from stack trace to repository-relative path
                    normalized_path = GitFetcher.normalize_path(
                        frame.file_path,
                        repo_config_dict
                    )
                    
                    logger.info(f"Normalized path: {frame.file_path} -> {normalized_path}")
                    
                    # Fetch file with context around the error line
                    code_data = fetcher.fetch_file_with_context(
                        file_path=normalized_path,
                        line_number=frame.line_number,
                        context_lines=15  # ±15 lines around error
                    )
                    
                    if code_data:
                        source_code_context.append(code_data)
                        logger.info(f"Fetched code from {normalized_path} (lines {code_data.get('start_line')}-{code_data.get('end_line')})")
                    else:
                        logger.warning(f"Could not fetch code from {normalized_path} (original: {frame.file_path})")
                        
                except Exception as e:
                    # Continue to next file if this one fails
                    logger.warning(f"Failed to fetch {normalized_path} (original: {frame.file_path}): {e}")
                    continue
                    
            total_fetch_time = time.time() - fetch_start_time
            logger.info(f"Git fetch completed in {total_fetch_time:.2f}s. Fetched {len(source_code_context)} files.")
            
        except Exception as e:
            logger.warning(f"Failed to initialize Git fetcher: {e}")
            # Continue without source code context
    
    # Step 3: Build structured prompt
    prompt = build_debugging_prompt(
        error_message=error_message,
        stack_trace=error_stack,
        source_code_context=source_code_context,
        max_total_lines=500
    )
    
    # Step 4: Call LLM
    try:
        analysis_result = _call_llm(prompt)
        return analysis_result
    except Exception as e:
        logger.error(f"LLM call failed: {e}", exc_info=True)
        # Fallback to basic analysis if LLM fails
        return {
            "analysis": f"Error Analysis:\n\nMessage: {error_message}\n\nStack Trace:\n{error_stack}\n\nNote: LLM analysis failed ({str(e)}). Please review the stack trace manually.",
            "model": "fallback",
            "confidence": "low"
        }


def _create_repo_config(repo_config_dict: Dict, project_key: str) -> RepoConfig:
    """
    Create RepoConfig from dictionary with project-key-based token lookup.
    
    Token lookup order:
    1. access_token from repo_config_dict (if explicitly provided)
    2. {PROJECT_KEY}_TOKEN environment variable (project-specific)
    3. GITHUB_TOKEN environment variable (fallback)
    
    Args:
        repo_config_dict: Repository configuration dictionary
        project_key: Project key for token lookup (e.g., "debug-ai" -> "DEBUG_AI_TOKEN")
        
    Returns:
        RepoConfig instance
    """
    # Token lookup: project-specific token first, then fallback
    access_token = None
    
    # 1. Check if token is explicitly provided in repo_config
    if repo_config_dict.get("access_token"):
        access_token = repo_config_dict.get("access_token")
    else:
        # 2. Look up project-specific token: {PROJECT_KEY}_TOKEN
        # Convert project_key to env var format: "debug-ai" -> "DEBUG_AI_TOKEN"
        env_var_name = f"{project_key.upper().replace('-', '_')}_TOKEN"
        access_token = os.getenv(env_var_name)
        
        # 3. Fallback to default GITHUB_TOKEN if project-specific not found
        if not access_token:
            access_token = os.getenv("GITHUB_TOKEN")
    
    return RepoConfig(
        owner=repo_config_dict["owner"],
        repo=repo_config_dict["repo"],
        branch=repo_config_dict.get("branch"),
        commit_sha=repo_config_dict.get("commit_sha"),
        provider=repo_config_dict.get("provider", "github"),
        access_token=access_token
    )


def _call_llm(prompt: str) -> dict:
    """
    Call LLM (OpenAI) to perform error analysis.
    
    Args:
        prompt: Formatted debugging prompt
        
    Returns:
        dict with analysis, model, and confidence
    """
    try:
        import openai
    except ImportError:
        logger.error("openai package not installed. Install with: pip install openai")
        raise ImportError("openai package required for LLM analysis")
    
    # Get OpenAI API key from environment
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise ValueError("OPENAI_API_KEY environment variable not set")
    
    # Initialize OpenAI client - using pattern that works with OpenAI SDK
    # If api_key is provided, pass it explicitly; otherwise OpenAI picks from env
    client = openai.OpenAI(api_key=api_key) if api_key else openai.OpenAI()
    
    # Get model from environment (default to gpt-4o-mini)
    model = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
    
    # Call OpenAI API
    response = client.chat.completions.create(
        model=model,
        messages=[
            {
                "role": "system",
                "content": "You are an expert debugging assistant. Provide clear, actionable analysis based only on the provided context."
            },
            {
                "role": "user",
                "content": prompt
            }
        ],
        temperature=0.1,  # Very low temperature for precise, deterministic analysis without corrections
        max_tokens=2000  # Limit response length
    )
    
    analysis_text = response.choices[0].message.content.strip()
    model_name = response.model
    
    # Determine confidence based on whether we have source code context
    # This is a simple heuristic - could be improved
    confidence = "high" if "SOURCE CODE CONTEXT" in prompt and "(No source code context available)" not in prompt else "medium"
    
    return {
        "analysis": analysis_text,
        "model": model_name,
        "confidence": confidence
    }

