# Error Ingestion Backend

FastAPI backend for receiving and storing error events from SDK clients.

## Features

- ✅ RESTful API for error event ingestion
- ✅ PostgreSQL storage with JSONB payloads
- ✅ Automatic project creation
- ✅ Database migrations with Alembic
- ✅ Environment-based configuration
- ✅ Request validation with Pydantic
- ✅ Comprehensive error logging

## Tech Stack

- **Framework**: FastAPI 0.115.0
- **ORM**: SQLAlchemy 2.0.36
- **Database**: PostgreSQL (with psycopg2-binary)
- **Migrations**: Alembic 1.13.1
- **Validation**: Pydantic 2.10.0

## Quick Start

### Prerequisites

- Python 3.11+
- PostgreSQL 12+
- Virtual environment (recommended)

### Installation

1. **Create and activate virtual environment:**
   ```bash
   python -m venv venv
   # Windows
   venv\Scripts\activate
   # macOS/Linux
   source venv/bin/activate
   ```

2. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

3. **Set up PostgreSQL database:**
   ```bash
   # Create database
   createdb error_ingestion
   # Or using psql:
   psql -U postgres -c "CREATE DATABASE error_ingestion;"
   ```

4. **Configure environment variables:**
   ```bash
   cp env.example .env
   # Edit .env with your database credentials
   ```

5. **Run database migrations:**
   ```bash
   alembic upgrade head
   ```

6. **Start the server:**
   ```bash
   uvicorn app.main:app --reload
   ```

The API will be available at `http://localhost:8000`

## Configuration

### Environment Variables

Create a `.env` file in the `backend/` directory:

```env
# Database configuration (Option 1: Full URL)
DATABASE_URL=postgresql://postgres:password@localhost:5432/error_ingestion

# Database configuration (Option 2: Individual components)
DATABASE_USER=postgres
DATABASE_PASSWORD=your_password
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=error_ingestion

# Environment
ENV=development  # development or production

# Optional: Server configuration
HOST=0.0.0.0
PORT=8000
```

### Environment Modes

- **Development** (`ENV=development`): Tables are auto-created on startup
- **Production** (`ENV=production`): Use Alembic migrations only

## API Endpoints

### `POST /api/v1/events`

Create a new error event.

**Request Body:**
```json
{
  "project_key": "my-project",
  "message": "Error message",
  "stack": "Error: message\n    at ...",
  "method": "GET",
  "path": "/api/users/:id",
  "status_code": 500,
  "timestamp": "2024-01-15T12:00:00Z"
}
```

**Response:**
```json
{
  "id": 1,
  "timestamp": "2024-01-15T12:00:00",
  "message": "Error message"
}
```

### `GET /health`

Health check endpoint.

**Response:**
```json
{
  "status": "ok"
}
```

## Database Migrations

This project uses Alembic for database migrations. See [ALEMBIC_SETUP.md](./ALEMBIC_SETUP.md) for detailed instructions.

### Quick Migration Commands

```bash
# Generate new migration
alembic revision --autogenerate -m "Description"

# Apply migrations
alembic upgrade head

# Check current revision
alembic current

# View migration history
alembic history
```

## Project Structure

```
backend/
├── alembic/              # Database migrations
│   ├── versions/        # Migration files
│   └── env.py           # Alembic configuration
├── app/
│   ├── __init__.py
│   ├── main.py          # FastAPI application
│   ├── database.py      # Database connection
│   ├── models.py        # SQLAlchemy models
│   ├── schemas.py       # Pydantic schemas
│   └── crud.py          # Database operations
├── alembic.ini          # Alembic config
├── requirements.txt     # Python dependencies
├── env.example          # Environment variables template
└── README.md            # This file
```

## Development

### Running Tests

```bash
# Test database connection
python test_db_connection.py
```

### Code Quality

- Follow PEP 8 style guide
- Use type hints where possible
- Add docstrings to functions and classes

## Production Deployment

1. **Set environment to production:**
   ```env
   ENV=production
   ```

2. **Run migrations before starting:**
   ```bash
   alembic upgrade head
   ```

3. **Start with production server:**
   ```bash
   uvicorn app.main:app --host 0.0.0.0 --port 8000
   ```

4. **Use a production WSGI server** (e.g., Gunicorn with Uvicorn workers):
   ```bash
   gunicorn app.main:app -w 4 -k uvicorn.workers.UvicornWorker
   ```

## Troubleshooting

### Database Connection Issues

- Verify PostgreSQL is running
- Check `.env` file has correct credentials
- Test connection: `python test_db_connection.py`

### Migration Issues

See [ALEMBIC_SETUP.md](./ALEMBIC_SETUP.md) troubleshooting section.

## License

MIT

