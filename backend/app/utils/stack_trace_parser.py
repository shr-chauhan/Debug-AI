"""
Stack trace parser to extract file paths and line numbers from error stack traces.

Supports common stack trace formats:
- Node.js: "at functionName (/path/to/file.js:123:45)"
- Python: "File \"/path/to/file.py\", line 123, in function_name"
- Java: "at com.example.Class.method(Class.java:123)"
"""
import re
from typing import List, Dict, Optional
from dataclasses import dataclass


@dataclass
class StackFrame:
    """Represents a single stack frame with file path and line number."""
    file_path: str
    line_number: Optional[int] = None
    function_name: Optional[str] = None
    raw_line: str = ""


def parse_stack_trace(stack_trace: str) -> List[StackFrame]:
    """
    Parse a stack trace string and extract file paths and line numbers.
    
    Args:
        stack_trace: Raw stack trace string
        
    Returns:
        List of StackFrame objects, ordered from top (error origin) to bottom
    """
    if not stack_trace:
        return []
    
    frames = []
    lines = stack_trace.split('\n')
    
    for line in lines:
        line = line.strip()
        if not line:
            continue
            
        frame = _parse_line(line)
        if frame:
            frames.append(frame)
    
    return frames


def _parse_line(line: str) -> Optional[StackFrame]:
    """
    Parse a single stack trace line to extract file path and line number.
    
    Supports multiple formats:
    - Node.js: "at functionName (/path/to/file.js:123:45)"
    - Node.js: "at /path/to/file.js:123:45"
    - Node.js: "at C:\\path\\to\\file.js:123:45" (Windows absolute paths)
    - Python: 'File "/path/to/file.py", line 123, in function_name'
    - Python: '  File "/path/to/file.py", line 123'
    - Java: "at com.example.Class.method(Class.java:123)"
    """
    # Node.js format with function: "at functionName (/path/to/file.js:123:45)"
    # or "at Route.dispatch (C:\\path\\to\\file.js:119:3)"
    # Pattern: at [optional function] (path:line:col)
    # The path can contain spaces, backslashes, forward slashes, etc.
    # We need to capture the path before the ":digits:digits)" sequence
    node_pattern = r'at\s+(?:[\w.]+(?:\s+[\w.]+)?\s+)?\((.+?):(\d+):(\d+)\)'
    match = re.search(node_pattern, line)
    if match:
        file_path = match.group(1).strip()
        line_number = int(match.group(2))
        return StackFrame(
            file_path=file_path,
            line_number=line_number,
            raw_line=line
        )
    
    # Node.js format without function: "at /path/to/file.js:123:45"
    # or "at C:\\path\\to\\file.js:123:45" (Windows absolute paths)
    # Pattern: at path:line:col
    # Match: "at " followed by path (can have spaces, backslashes, forward slashes)
    # followed by ":digits:digits"
    # Use a pattern that captures everything between "at " and the first ":digits:digits"
    node_pattern2 = r'at\s+(.+?):(\d+):(\d+)(?:\s|$)'
    match = re.search(node_pattern2, line)
    if match:
        file_path = match.group(1).strip()
        line_number = int(match.group(2))
        return StackFrame(
            file_path=file_path,
            line_number=line_number,
            raw_line=line
        )
    
    # Python format: 'File "/path/to/file.py", line 123, in function_name'
    python_pattern = r'File\s+["\']([^"\']+)["\']\s*,\s*line\s+(\d+)'
    match = re.search(python_pattern, line)
    if match:
        file_path = match.group(1).strip()
        line_number = int(match.group(2))
        return StackFrame(
            file_path=file_path,
            line_number=line_number,
            raw_line=line
        )
    
    # Java format: "at com.example.Class.method(Class.java:123)"
    java_pattern = r'at\s+[\w.]+\(([^:]+):(\d+)\)'
    match = re.search(java_pattern, line)
    if match:
        file_path = match.group(1).strip()
        line_number = int(match.group(2))
        return StackFrame(
            file_path=file_path,
            line_number=line_number,
            raw_line=line
        )
    
    # Generic pattern: look for file paths with line numbers
    # Format: "/path/to/file.ext:123" or "file.ext:123"
    # This is a fallback and should be more permissive
    # Match any path-like string ending with a file extension followed by :digits
    generic_pattern = r'((?:[A-Za-z]:)?[^\s:]+\.(?:js|py|java|ts|tsx|jsx|go|rs|rb|php)):(\d+)'
    match = re.search(generic_pattern, line)
    if match:
        file_path = match.group(1).strip()
        line_number = int(match.group(2))
        return StackFrame(
            file_path=file_path,
            line_number=line_number,
            raw_line=line
        )
    
    return None


def get_relevant_files(
    stack_frames: List[StackFrame],
    max_files: int = 5
) -> List[StackFrame]:
    """
    Select the most relevant files from stack frames.
    
    Prioritizes:
    1. Top-most frame (error origin)
    2. Subsequent frames (call chain)
    
    Filters out:
    - node_modules paths (dependencies)
    - Internal library files
    
    Args:
        stack_frames: List of parsed stack frames
        max_files: Maximum number of files to return
        
    Returns:
        List of StackFrame objects, limited to max_files
    """
    if not stack_frames:
        return []
    
    # Filter out dependency directories and build artifacts
    # IMPORTANT: Check the ORIGINAL path before any normalization
    # Language-specific dependency directories:
    excluded_patterns = [
        # Node.js
        'node_modules',
        '.next',
        '.nuxt',
        # Python
        'venv',
        'env',
        '.venv',
        '__pycache__',
        'site-packages',  # Python packages in virtual environments
        '.pytest_cache',
        # Java
        'target',
        '.gradle',
        # Build artifacts (common across languages)
        'dist',
        'build',
        '.build',
        'out',
        'bin',
        'obj',
        # IDE and system files
        '.idea',
        '.vscode',
        '.git',
    ]
    
    # Remove duplicates while preserving order, and filter excluded paths
    import logging
    logger = logging.getLogger(__name__)
    
    seen_paths = set()
    unique_frames = []
    
    for frame in stack_frames:
        # Use the ORIGINAL file_path (before normalization) for filtering
        # This ensures we catch node_modules even if path normalization would remove it

        
        original_path_lower = frame.file_path.lower().replace('\\', '/')
        
        # CRITICAL: Always filter out anything from node_modules
        # This is the most important filter for Node.js projects
        if 'node_modules' in original_path_lower:
            logger.debug(f"Filtered out {frame.file_path} (contains node_modules)")
            continue
        
        # Skip if path contains other excluded patterns (case-insensitive)
        if any(pattern in original_path_lower for pattern in excluded_patterns):
            logger.debug(f"Filtered out {frame.file_path} (contains excluded pattern)")
            continue
        
        # Skip if already seen
        if frame.file_path not in seen_paths:
            seen_paths.add(frame.file_path)
            unique_frames.append(frame)
            
            if len(unique_frames) >= max_files:
                break
    
    return unique_frames

