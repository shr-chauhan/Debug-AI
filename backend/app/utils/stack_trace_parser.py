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
    - Python: 'File "/path/to/file.py", line 123, in function_name'
    - Python: '  File "/path/to/file.py", line 123'
    - Java: "at com.example.Class.method(Class.java:123)"
    """
    # Node.js format: "at functionName (/path/to/file.js:123:45)"
    node_pattern = r'at\s+(?:\w+\.?\w*)?\s*\(([^:]+):(\d+):(\d+)\)'
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
    node_pattern2 = r'at\s+([^:]+):(\d+):(\d+)'
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
    generic_pattern = r'([/\w\-_.]+\.(?:js|py|java|ts|tsx|jsx|go|rs|rb|php)):(\d+)'
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
    
    Args:
        stack_frames: List of parsed stack frames
        max_files: Maximum number of files to return
        
    Returns:
        List of StackFrame objects, limited to max_files
    """
    if not stack_frames:
        return []
    
    # Remove duplicates while preserving order
    seen_paths = set()
    unique_frames = []
    
    for frame in stack_frames:
        if frame.file_path not in seen_paths:
            seen_paths.add(frame.file_path)
            unique_frames.append(frame)
            
            if len(unique_frames) >= max_files:
                break
    
    return unique_frames

