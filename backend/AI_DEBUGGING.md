# AI-Assisted Error Debugging

This system performs intelligent error analysis using LLMs with stack trace parsing and source code context from Git repositories.

## Architecture

```
Error Event → Parse Stack Trace → Extract File Paths → Fetch Code from Git → Build Prompt → LLM Analysis → Store Result
```

## Features

1. **Stack Trace Parsing**: Automatically extracts file paths and line numbers from error stack traces
2. **Git-Based Code Fetching**: Fetches relevant source code from Git repositories (GitHub/GitLab) without cloning
3. **Context Limiting**: Strictly limits code context to control costs and prevent noise
4. **Structured Prompts**: Builds clear, structured prompts that separate error details, stack trace, and source code
5. **LLM Integration**: Uses OpenAI GPT models for intelligent error analysis

## Setup

### 1. Install Dependencies

```bash
pip install -r requirements.txt
```

New dependencies:
- `openai` - OpenAI API client
- `requests` - HTTP client for Git API calls

### 2. Configure OpenAI

Add to your `.env` file:

```env
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL=gpt-4o-mini  # or gpt-4, gpt-3.5-turbo, etc.
```

### 3. Configure Repository Access (Optional)

For fetching source code from private repositories, configure tokens:

**Default token (fallback):**
```env
GITHUB_TOKEN=your_github_personal_access_token_here
```

**Project-specific tokens (recommended for multiple projects):**
```env
# Pattern: {PROJECT_KEY}_TOKEN
# Example: If project_key is "debug-ai", use DEBUG_AI_TOKEN
DEBUG_AI_TOKEN=ghp_token_for_debug_ai_project
MY_APP_TOKEN=ghp_token_for_my_app_project
PRODUCTION_API_TOKEN=ghp_token_for_production_api
```

**Token lookup order:**
1. Token explicitly set in `repo_config.access_token` (if provided)
2. `{PROJECT_KEY}_TOKEN` environment variable (project-specific)
3. `GITHUB_TOKEN` environment variable (fallback)

### 4. Run Database Migration

```bash
alembic upgrade head
```

This adds the `repo_config` column to the `projects` table.

## Configuration

### Project-Level Repository Configuration

Each project can have its own repository configuration stored in the `projects.repo_config` JSON column.

**Format:**
```json
{
  "owner": "github-username",
  "repo": "repository-name",
  "branch": "main",
  "provider": "github",
  "access_token": "optional-token-for-private-repos",
  "root_dir": "src",
  "root_hints": ["src", "lib", "app"]
}
```

**Optional fields:**
- `root_dir`: Explicit repository root directory (e.g., "src", "lib")
- `root_hints`: Array of possible root directory names for path normalization

**Example:**
```json
{
  "owner": "mycompany",
  "repo": "my-api",
  "branch": "main",
  "provider": "github",
  "access_token": "ghp_xxxxxxxxxxxx"
}
```

**Setting repo_config via SQL:**
```sql
UPDATE projects 
SET repo_config = '{
  "owner": "mycompany",
  "repo": "my-api",
  "branch": "main",
  "provider": "github"
}'::jsonb
WHERE project_key = 'my-project';
```

**Token Configuration:**

The system uses the following token lookup order:
1. **Explicit token** in `repo_config.access_token` (if provided)
2. **Project-specific token**: `{PROJECT_KEY}_TOKEN` environment variable
   - Example: For project_key `"debug-ai"`, looks for `DEBUG_AI_TOKEN`
   - Converts project key to uppercase and replaces hyphens with underscores
3. **Fallback token**: `GITHUB_TOKEN` environment variable

**Example:**
- Project key: `"my-web-app"`
- System looks for: `MY_WEB_APP_TOKEN` environment variable
- If not found, falls back to: `GITHUB_TOKEN`

## How It Works

### 1. Stack Trace Parsing

When an error event is analyzed:

1. The stack trace is parsed to extract:
   - File paths
   - Line numbers
   - Function names (if available)

2. Supported formats:
   - Node.js: `at functionName (/path/to/file.js:123:45)`
   - Python: `File "/path/to/file.py", line 123`
   - Java: `at com.example.Class.method(Class.java:123)`

3. **Path Normalization**: Stack trace paths are normalized to repository-relative paths:
   - Absolute paths (e.g., `C:\project\src\file.js`) → `src/file.js`
   - Windows paths → Unix-style paths
   - Build artifacts removed (e.g., `dist/`, `build/`)
   - Project root prefixes detected and removed

4. The top 5 most relevant files are selected (prioritizing error origin)

### 2. Code Fetching

For each relevant file:

1. Code is fetched from Git using the provider API (GitHub/GitLab)
2. Only the file is fetched (not the entire repository)
3. Code context is limited to ±15 lines around the error line
4. Maximum 500 total lines across all files

**Timeout Protection:**
- **Per-file timeout**: 5 seconds per file fetch
- **Total timeout**: 15 seconds for all fetches combined
- **Early exit**: Stops after gathering code from top 2-3 frames (usually sufficient)
- **Graceful degradation**: Continues with partial context if some fetches fail

This ensures the task doesn't stall due to slow Git APIs, network issues, or invalid tokens.

### 3. Prompt Construction

A structured prompt is built with:

- **Error Message**: The original error message
- **Stack Trace**: Full stack trace
- **Source Code Context**: Relevant code snippets with line numbers
- **Analysis Request**: Instructions for root cause, fix, and prevention

### 4. LLM Analysis

The prompt is sent to OpenAI with:
- Model: `gpt-4o-mini` (configurable via `OPENAI_MODEL`)
- Temperature: 0.3 (focused, deterministic)
- Max tokens: 2000

### 5. Result Storage

Analysis results are stored in the `error_analysis` table with:
- `analysis_text`: Full LLM response
- `model`: Model name used
- `confidence`: "low", "medium", or "high" (based on available context)

## Usage

### Automatic Analysis

Analysis is automatically triggered when:
1. An error event is created with `status_code >= 500`
2. The error event is stored successfully
3. A Celery worker is running

### Manual Testing

1. **Start Celery Worker:**
```bash
celery -A app.celery_worker worker --loglevel=info --queues=ai_analysis --pool=solo
```

2. **Send a Test Error:**
```bash
curl -X POST http://localhost:8000/api/v1/events \
  -H "Content-Type: application/json" \
  -d '{
    "project_key": "test-project",
    "message": "TypeError: Cannot read property \"id\" of undefined",
    "stack": "at getUser (/app/src/users.js:45:12)\n    at handleRequest (/app/src/api.js:123:8)",
    "method": "GET",
    "path": "/api/users/123",
    "status_code": 500,
    "timestamp": "2024-01-15T12:00:00Z"
  }'
```

3. **Check Analysis:**
```sql
SELECT 
    e.id,
    e.payload->>'message' as error_message,
    a.analysis_text,
    a.model,
    a.confidence,
    a.created_at
FROM error_events e
LEFT JOIN error_analysis a ON e.id = a.error_event_id
WHERE e.status_code >= 500
ORDER BY e.created_at DESC
LIMIT 1;
```

## Limitations & Constraints

### Code Context Limits

- **Max files**: 5 files per analysis
- **Max total lines**: 500 lines across all files
- **Context per file**: ±15 lines around error line

### Timeout Limits

- **Per-file timeout**: 5 seconds per Git API request
- **Total fetch timeout**: 15 seconds for all Git fetches combined
- **Early exit**: Stops after gathering code from top 2-3 frames (if successful)
- **Graceful handling**: Continues with partial context if some fetches timeout or fail

### Supported Git Providers

- ✅ GitHub (via GitHub API)
- ✅ GitLab (via GitLab API)
- ❌ Bitbucket (not yet implemented)
- ❌ Self-hosted Git (not yet supported)

### Stack Trace Formats

Currently supports:
- ✅ Node.js/JavaScript
- ✅ Python
- ✅ Java
- ⚠️ Other formats may work but are not explicitly tested

## Troubleshooting

### Analysis Not Running

1. **Check Celery Worker:**
   ```bash
   celery -A app.celery_worker inspect active
   ```

2. **Check Redis Connection:**
   ```bash
   redis-cli ping
   ```

3. **Check Logs:**
   Look for errors in Celery worker logs

### Code Not Being Fetched

1. **Check repo_config:**
   ```sql
   SELECT project_key, repo_config FROM projects WHERE project_key = 'your-project';
   ```

2. **Verify Git Access:**
   - For private repos, ensure `access_token` is set
   - Check token permissions (needs `repo` scope for GitHub)

3. **Check File Paths:**
   - Stack trace paths are automatically normalized to repository-relative paths
   - Absolute paths (e.g., `C:\project\src\file.js`) are converted to `src/file.js`
   - If normalization fails, check worker logs for the original vs normalized path
   - You can configure `root_dir` in `repo_config` to help with path normalization

4. **Timeout Issues:**
   - If Git API is slow, the system will timeout after 5s per file
   - Total fetch time is capped at 15 seconds
   - System will continue with partial context if some files timeout
   - Check worker logs for timeout warnings

### LLM Analysis Failing

1. **Check OpenAI API Key:**
   ```bash
   echo $OPENAI_API_KEY
   ```

2. **Check API Quota:**
   - Verify OpenAI account has available credits
   - Check rate limits

3. **Review Error Logs:**
   - Check Celery worker logs for detailed error messages

## Cost Considerations

### OpenAI API Costs

- **gpt-4o-mini**: ~$0.15 per 1M input tokens, ~$0.60 per 1M output tokens
- **gpt-4**: ~$30 per 1M input tokens, ~$60 per 1M output tokens

**Estimated cost per analysis:**
- With code context: ~$0.01-0.05 (gpt-4o-mini)
- Without code context: ~$0.005-0.01 (gpt-4o-mini)

### Optimization Tips

1. Use `gpt-4o-mini` for cost efficiency (default)
2. Limit code context (already enforced: max 500 lines)
3. Only analyze errors with `status_code >= 500`
4. Skip duplicate analyses (already implemented)

## Future Enhancements

- [ ] Support for Bitbucket
- [ ] Support for self-hosted Git servers
- [ ] Caching of fetched code
- [ ] Support for multiple LLM providers (Anthropic, etc.)
- [ ] Confidence scoring based on code context quality
- [ ] Analysis result formatting/structuring

