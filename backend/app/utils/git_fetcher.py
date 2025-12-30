"""
Git file fetcher using Git provider APIs (GitHub, GitLab, etc.).

Fetches individual files from Git repositories without cloning the entire repo.
Supports private repositories using authentication tokens.

Also includes path normalization to convert stack trace paths (absolute/local)
to repository-relative paths.
"""
import os
import re
import logging
import requests
from requests.exceptions import Timeout, RequestException
from typing import Optional, Dict, List
from dataclasses import dataclass
from urllib.parse import quote

logger = logging.getLogger(__name__)


@dataclass
class RepoConfig:
    """Repository configuration for fetching code."""
    owner: str  # Repository owner/org
    repo: str  # Repository name
    branch: Optional[str] = None  # Branch name (e.g., "main", "master")
    commit_sha: Optional[str] = None  # Specific commit SHA (takes precedence over branch)
    provider: str = "github"  # "github" or "gitlab"
    access_token: Optional[str] = None  # For private repositories
    
    def __post_init__(self):
        """Validate configuration."""
        # Default to "main" branch if neither branch nor commit_sha is provided
        if not self.branch and not self.commit_sha:
            self.branch = "main"


class GitFetcher:
    """Fetches files from Git repositories using provider APIs."""
    
    def __init__(self, repo_config: RepoConfig, timeout: int = 5):
        """
        Initialize Git fetcher.
        
        Args:
            repo_config: Repository configuration
            timeout: Request timeout in seconds (default: 5)
        """
        self.config = repo_config
        self.timeout = timeout
        self.session = requests.Session()
        
        # Set up authentication if token provided
        if repo_config.access_token:
            if repo_config.provider == "github":
                self.session.headers.update({
                    "Authorization": f"token {repo_config.access_token}",
                    "Accept": "application/vnd.github.v3+json"  # JSON response for Contents API
                })
            elif repo_config.provider == "gitlab":
                self.session.headers.update({
                    "PRIVATE-TOKEN": repo_config.access_token
                })
    
    def fetch_file(self, file_path: str, context_lines: int = 10) -> Optional[Dict[str, any]]:
        """
        Fetch a single file from the repository.
        
        Args:
            file_path: Path to the file relative to repo root (e.g., "src/app.js")
            context_lines: Number of lines to include around the target line (if line_number provided)
            
        Returns:
            Dict with 'content' (full file content) and 'lines' (line range if context_lines used),
            or None if file not found or fetch fails
        """
        try:
            if self.config.provider == "github":
                return self._fetch_from_github(file_path, context_lines)
            elif self.config.provider == "gitlab":
                return self._fetch_from_gitlab(file_path, context_lines)
            else:
                raise ValueError(f"Unsupported Git provider: {self.config.provider}")
        except Timeout:
            logger.warning(f"Timeout fetching file {file_path} (timeout: {self.timeout}s)")
            return None
        except RequestException as e:
            logger.warning(f"Request failed for file {file_path}: {e}")
            return None
        except Exception as e:
            logger.warning(f"Failed to fetch file {file_path}: {e}")
            return None
    
    def _fetch_from_github(self, file_path: str, context_lines: int) -> Optional[Dict[str, any]]:
        """Fetch file from GitHub using GitHub API."""
        # Determine ref (commit SHA takes precedence over branch)
        ref = self.config.commit_sha or self.config.branch
        
        # GitHub API: Get file content
        # https://docs.github.com/en/rest/repos/contents#get-repository-content
        # URL encode the file path to handle special characters and spaces
        encoded_path = quote(file_path, safe='/')
        url = f"https://api.github.com/repos/{self.config.owner}/{self.config.repo}/contents/{encoded_path}"
        params = {"ref": ref}
        
        response = self.session.get(url, params=params, timeout=self.timeout)
        if response.status_code == 404:
            logger.warning(f"File not found: {file_path}")
            return None
        
        response.raise_for_status()
        
        # Check if response has content
        if not response.text or not response.text.strip():
            logger.warning(f"Empty response from GitHub API for {file_path}")
            return None
        
        # Check content type
        content_type = response.headers.get('Content-Type', '').lower()
        if 'application/json' not in content_type:
            logger.warning(
                f"Unexpected content type from GitHub API for {file_path}: {content_type}. "
                f"Response preview: {response.text[:200]}"
            )
            return None
        
        # GitHub returns base64-encoded content
        try:
            data = response.json()
        except ValueError as e:
            logger.warning(
                f"Failed to parse JSON response from GitHub for {file_path}: {e}. "
                f"Response preview: {response.text[:200]}"
            )
            return None
        
       
        if "content" not in data:
            logger.warning(f"No content in GitHub response for {file_path}")
            return None
        
        import base64
        content = base64.b64decode(data["content"]).decode("utf-8")
        return {
            "content": content,
            "file_path": file_path,
            "sha": data.get("sha"),
            "size": data.get("size", len(content))
        }
    
    def _fetch_from_gitlab(self, file_path: str, context_lines: int) -> Optional[Dict[str, any]]:
        """Fetch file from GitLab using GitLab API."""
        # Determine ref
        ref = self.config.commit_sha or self.config.branch
        
        # GitLab API: Get file content
        # https://docs.gitlab.com/ee/api/repository_files.html#get-file-from-repository
        url = f"https://gitlab.com/api/v4/projects/{self.config.owner}%2F{self.config.repo}/repository/files/{file_path.replace('/', '%2F')}/raw"
        params = {"ref": ref}
        
        response = self.session.get(url, params=params, timeout=self.timeout)
        
        if response.status_code == 404:
            logger.warning(f"File not found: {file_path}")
            return None
        
        response.raise_for_status()
        
        content = response.text
        
        return {
            "content": content,
            "file_path": file_path,
            "size": len(content)
        }
    
    def fetch_file_with_context(
        self,
        file_path: str,
        line_number: Optional[int] = None,
        context_lines: int = 10
    ) -> Optional[Dict[str, any]]:
        """
        Fetch a file and optionally extract lines around a specific line number.
        
        Args:
            file_path: Path to the file
            line_number: Line number to center context around
            context_lines: Number of lines before/after to include
            
        Returns:
            Dict with 'content' (extracted lines), 'start_line', 'end_line', 'file_path'
        """
        file_data = self.fetch_file(file_path, context_lines)
        if not file_data:
            return None
        
        content = file_data["content"]
        
        # If no line number specified, return full file
        if line_number is None:
            return {
                "content": content,
                "file_path": file_path,
                "start_line": 1,
                "end_line": len(content.splitlines())
            }
        
        # Extract lines around the target line
        lines = content.splitlines()
        total_lines = len(lines)
        
        # Calculate line range (1-indexed)
        start_line = max(1, line_number - context_lines)
        end_line = min(total_lines, line_number + context_lines)
        
        # Extract relevant lines (convert to 0-indexed for slicing)
        relevant_lines = lines[start_line - 1:end_line]
        relevant_content = "\n".join(relevant_lines)
        return {
            "content": relevant_content,
            "file_path": file_path,
            "start_line": start_line,
            "end_line": end_line,
            "target_line": line_number
        }
    
    @staticmethod
    def normalize_path(
        file_path: str,
        repo_config: Optional[Dict] = None
    ) -> str:
        """
        Normalize a stack trace file path to repository-relative path.
        
        Handles:
        - Absolute paths (Windows: C:\..., Unix: /...)
        - Local project paths
        - Build artifacts (dist/, build/, node_modules/)
        - Path prefix removal
        - Repo name-based path mapping (if repo name is in config)
        
        Args:
            file_path: File path from stack trace (may be absolute or relative)
            repo_config: Optional repository configuration dict that may contain:
                        - "repo": Repository name (used to find repo root in path)
                        - "root_dir": Explicit root directory (e.g., "src")
                        - "root_hints": Array of possible root directory names
            
        Returns:
            Normalized repository-relative path
        """
        if not file_path:
            return file_path
        
        # Remove leading/trailing whitespace
        file_path = file_path.strip()
        
        # Step 0: Use repo name to find repo root in absolute paths
        # This is more accurate than guessing based on common patterns
        if repo_config:
            repo_name = repo_config.get("repo")
            if repo_name:
                # Try to find the repo name in the path and normalize from there
                # Example: "C:\Projects\MyRepo\src\file.js" -> "src/file.js" (if repo="MyRepo")
                normalized = GitFetcher._normalize_using_repo_name(file_path, repo_name)
                if normalized != file_path:  # If we successfully normalized using repo name
                    # Clean up the result
                    normalized = normalized.replace('\\', '/').lstrip('/')
                    # Remove excluded dirs
                    normalized = GitFetcher._remove_excluded_dirs(normalized)
                    return normalized
        
        # Extract repo root hints from config if available
        repo_root_hints = None
        if repo_config:
            root_dir = repo_config.get("root_dir")
            if root_dir:
                repo_root_hints = [root_dir]
            else:
                repo_root_hints = repo_config.get("root_hints", None)
        
        # Step 1: Remove absolute path prefixes
        normalized = GitFetcher._remove_absolute_prefix(file_path)
        
        # Step 2: Remove common build/artifact directories
        normalized = GitFetcher._remove_build_artifacts(normalized)
        
        # Step 3: Remove common project root prefixes
        normalized = GitFetcher._remove_project_prefixes(normalized, repo_root_hints)
        
        # Step 4: Clean up path separators (normalize to forward slashes)
        normalized = normalized.replace('\\', '/')
        
        # Step 5: Remove leading slashes
        normalized = normalized.lstrip('/')
        
        # Step 6: Remove node_modules and other excluded directories
        normalized = GitFetcher._remove_excluded_dirs(normalized)
        
        return normalized
    
    @staticmethod
    def _normalize_using_repo_name(file_path: str, repo_name: str) -> str:
        """
        Normalize path by finding the repo name in the path and extracting everything after it.
        
        Example:
            Input: "C:\\Projects\\Debug-AI\\example\\index.js", repo_name="Debug-AI"
            Output: "example\\index.js"
        
        Args:
            file_path: Original file path (may be absolute)
            repo_name: Repository name to search for in the path
            
        Returns:
            Normalized path relative to repo root, or original path if repo name not found
        """
        if not repo_name or not file_path:
            return file_path
        
        # Normalize path separators for easier matching
        path_normalized = file_path.replace('\\', '/')
        repo_name_normalized = repo_name.replace('\\', '/')
        
        # Case-insensitive search for repo name
        path_lower = path_normalized.lower()
        repo_lower = repo_name_normalized.lower()
        
        # Find repo name in path
        idx = path_lower.find(repo_lower)
        if idx == -1:
            # Repo name not found, return original
            return file_path
        
        # Extract everything after the repo name
        # Add length of repo name to get past it
        after_repo = path_normalized[idx + len(repo_name_normalized):]
        
        # Remove leading slashes and path separators
        after_repo = after_repo.lstrip('/').lstrip('\\')
        
        # If we got something, return it; otherwise return original
        return after_repo if after_repo else file_path
    
    @staticmethod
    def _remove_absolute_prefix(file_path: str) -> str:
        """Remove absolute path prefixes (Windows and Unix)."""
        # Windows absolute path: C:\..., D:\..., etc.
        windows_pattern = r'^[A-Za-z]:[/\\]'
        if re.match(windows_pattern, file_path):
            match = re.match(r'^[A-Za-z]:[/\\](.+)', file_path)
            if match:
                return match.group(1)
        
        # Unix absolute path: /home/..., /usr/..., etc.
        if file_path.startswith('/'):
            parts = file_path.split('/')
            
            # Common project root indicators
            project_indicators = ['src', 'lib', 'app', 'backend', 'frontend', 'server', 'client', 
                                 'packages', 'services', 'example', 'examples', 'test', 'tests']
            
            # Find the first project indicator and return everything from there
            for i, part in enumerate(parts):
                if part in project_indicators:
                    return '/'.join(parts[i:])
            
            # If no indicator found, keep the last few segments
            if len(parts) > 4:
                return '/'.join(parts[-4:])
            return file_path.lstrip('/')
        
        return file_path
    
    @staticmethod
    def _remove_build_artifacts(file_path: str) -> str:
        """Remove common build artifact directory prefixes."""
        build_patterns = [
            r'^dist[/\\]',
            r'^build[/\\]',
            r'^\.next[/\\]',
            r'^\.nuxt[/\\]',
            r'^out[/\\]',
            r'^target[/\\]',
            r'^bin[/\\]',
            r'^obj[/\\]',
        ]
        
        normalized = file_path
        for pattern in build_patterns:
            normalized = re.sub(pattern, '', normalized, flags=re.IGNORECASE)
        
        return normalized
    
    @staticmethod
    def _remove_project_prefixes(file_path: str, repo_root_hints: Optional[List[str]] = None) -> str:
        """Remove common project root directory prefixes."""
        if not repo_root_hints:
            repo_root_hints = ['src', 'lib', 'app', 'backend', 'frontend', 'server', 'client',
                              'packages', 'services', 'example', 'examples']
        
        normalized = file_path.replace('\\', '/')
        parts = normalized.split('/')
        
        # If the path starts with a known project root hint, keep from there
        for i, part in enumerate(parts):
            if part.lower() in [h.lower() for h in repo_root_hints]:
                return '/'.join(parts[i:])
        
        # If path has many segments, try to find a reasonable starting point
        if len(parts) > 5:
            for hint in repo_root_hints:
                try:
                    idx = next(i for i, p in enumerate(parts) if p.lower() == hint.lower())
                    return '/'.join(parts[idx:])
                except StopIteration:
                    continue
        
        return normalized
    
    @staticmethod
    def _remove_excluded_dirs(file_path: str) -> str:
        """Remove node_modules and other excluded directories from path."""
        # Remove node_modules from path
        node_modules_pattern = r'.*[/\\]node_modules[/\\](.+)'
        match = re.match(node_modules_pattern, file_path, re.IGNORECASE)
        if match:
            return match.group(1)
        
        # Remove other common excluded directories
        excluded_patterns = [
            r'^\.git[/\\]',
            r'^\.vscode[/\\]',
            r'^\.idea[/\\]',
            r'^venv[/\\]',
            r'^env[/\\]',
            r'^\.env[/\\]',
        ]
        
        normalized = file_path
        for pattern in excluded_patterns:
            normalized = re.sub(pattern, '', normalized, flags=re.IGNORECASE)
        
        return normalized

