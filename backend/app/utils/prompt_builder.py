"""
Prompt builder for LLM error debugging.

Constructs structured prompts that clearly separate error details, stack trace,
and source code context.
"""
from typing import List, Dict, Optional
from app.utils.stack_trace_parser import StackFrame


def build_debugging_prompt(
    error_message: str,
    stack_trace: str,
    source_code_context: List[Dict[str, any]],
    max_total_lines: int = 500
) -> str:
    """
    Build a structured debugging prompt for the LLM.
    
    Args:
        error_message: The error message
        stack_trace: Full stack trace string
        source_code_context: List of dicts with 'file_path', 'content', 'start_line', 'end_line'
        max_total_lines: Maximum total lines of code to include
        
    Returns:
        Formatted prompt string
    """
    # Limit total code lines
    limited_context = _limit_code_context(source_code_context, max_total_lines)
    
    prompt_parts = []
    
    # System instruction
    prompt_parts.append("""You are an expert debugging assistant. Analyze this error and provide actionable insights.

CRITICAL CONSTRAINTS:
- Base your analysis ONLY on the provided error message, stack trace, and source code context
- DO NOT hallucinate logs, runtime values, or information not provided
- DO NOT make assumptions about code that isn't shown
- Focus on what you can see in the stack trace and source code

""")
    
    # Error message section
    prompt_parts.append("=" * 80)
    prompt_parts.append("ERROR MESSAGE")
    prompt_parts.append("=" * 80)
    prompt_parts.append(error_message)
    prompt_parts.append("")
    
    # Stack trace section
    prompt_parts.append("=" * 80)
    prompt_parts.append("STACK TRACE")
    prompt_parts.append("=" * 80)
    prompt_parts.append(stack_trace)
    prompt_parts.append("")
    
    # Source code context section
    if limited_context:
        prompt_parts.append("=" * 80)
        prompt_parts.append("SOURCE CODE CONTEXT")
        prompt_parts.append("=" * 80)
        prompt_parts.append("")
        
        for idx, code_block in enumerate(limited_context, 1):
            file_path = code_block["file_path"]
            content = code_block["content"]
            start_line = code_block.get("start_line", 1)
            end_line = code_block.get("end_line", len(content.splitlines()))
            target_line = code_block.get("target_line")
            
            prompt_parts.append(f"--- File {idx}: {file_path} ---")
            if target_line:
                prompt_parts.append(f"Lines {start_line}-{end_line} (error at line {target_line}):")
            else:
                prompt_parts.append(f"Lines {start_line}-{end_line}:")
            prompt_parts.append("")
            prompt_parts.append(content)
            prompt_parts.append("")
    else:
        prompt_parts.append("=" * 80)
        prompt_parts.append("SOURCE CODE CONTEXT")
        prompt_parts.append("=" * 80)
        prompt_parts.append("(No source code context available)")
        prompt_parts.append("")
    
    # Analysis request
    prompt_parts.append("=" * 80)
    prompt_parts.append("ANALYSIS REQUEST")
    prompt_parts.append("=" * 80)
    prompt_parts.append("""
Please provide:

1. ROOT CAUSE ANALYSIS
   - What is the likely root cause of this error?
   - What evidence from the stack trace and source code supports this?

2. SUGGESTED FIX
   - What specific code changes would fix this error?
   - Include the exact file path and line number(s) where changes are needed

3. PREVENTION STRATEGY
   - How could this error be prevented in the future?
   - What code patterns or practices would help avoid this?

Remember: Base your analysis ONLY on the provided context. Do not invent details.
""")
    
    return "\n".join(prompt_parts)


def _limit_code_context(
    source_code_context: List[Dict[str, any]],
    max_total_lines: int
) -> List[Dict[str, any]]:
    """
    Limit the total number of code lines across all files.
    
    Args:
        source_code_context: List of code blocks
        max_total_lines: Maximum total lines
        
    Returns:
        Limited list of code blocks
    """
    if not source_code_context:
        return []
    
    total_lines = 0
    limited = []
    
    for block in source_code_context:
        content = block.get("content", "")
        block_lines = len(content.splitlines())
        
        if total_lines + block_lines <= max_total_lines:
            limited.append(block)
            total_lines += block_lines
        else:
            # Try to include partial content if we have space
            remaining_lines = max_total_lines - total_lines
            if remaining_lines > 10:  # Only include if meaningful amount
                # Truncate content to remaining lines
                lines = content.splitlines()
                truncated_content = "\n".join(lines[:remaining_lines])
                truncated_block = block.copy()
                truncated_block["content"] = truncated_content
                truncated_block["end_line"] = block.get("start_line", 1) + remaining_lines - 1
                limited.append(truncated_block)
            break
    
    return limited

