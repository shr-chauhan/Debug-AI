# Error Ingestion System - Phase 1 (MVP)

An open-source error ingestion system for capturing and storing application errors from Node.js Express applications.

## Overview

This system provides a simple, production-ready solution for error tracking:
- **Node.js SDK**: Express middleware that captures errors automatically
- **FastAPI Backend**: RESTful API for receiving and storing error events
- **PostgreSQL Storage**: Efficient storage with JSONB payloads

## Architecture

```
┌─────────────┐         HTTP POST          ┌─────────────┐
│   Express   │ ──────────────────────────> │   FastAPI   │
│     App     │                             │   Backend   │
│             │                             │             │
│  SDK Middle │                             │  PostgreSQL │
│    ware     │                             │  Database   │
└─────────────┘                             └─────────────┘
```

## Project Structure

```
.
├── backend/          # FastAPI backend application
│   ├── app/          # Application code
│   ├── alembic/      # Database migrations
│   └── README.md     # Backend documentation
├── sdks/
│   └── node/         # Node.js SDK (npm package)
│       └── README.md # SDK documentation
└── example/          # Example Express app
```

## Quick Start

### 1. Start Backend

```bash
cd backend

# Install dependencies
pip install -r requirements.txt

# Set up database (see backend/README.md for details)
createdb error_ingestion
alembic upgrade head

# Configure environment
cp env.example .env
# Edit .env with your database credentials

# Run server
uvicorn app.main:app --reload
```

Backend will be available at `http://localhost:8000`

### 2. Install SDK

```bash
cd sdks/node

# Install dependencies
npm install

# Build TypeScript
npm run build
```

### 3. Use in Your Express App

```javascript
const express = require('express');
const { errorIngestionMiddleware } = require('@error-ingestion/sdk-node');

const app = express();

// Add error ingestion middleware (after routes, before error handler)
app.use(errorIngestionMiddleware({
  apiUrl: 'http://localhost:8000',
  projectKey: 'my-project'
}));

// Your routes...
app.get('/api/users/:id', async (req, res, next) => {
  try {
    // Your code
  } catch (err) {
    next(err); // Error will be automatically captured
  }
}));

app.listen(3000);
```

### 4. Test with Example App

```bash
cd example

# Install dependencies
npm install

# Run example
npm start

# Trigger test error
curl http://localhost:3000/test-error
```

## Features

### SDK Features
- ✅ Express error-handling middleware
- ✅ Automatic error capture (message, stack, method, path, status code)
- ✅ Path sanitization (replaces IDs with `:id` to reduce cardinality)
- ✅ Non-blocking (doesn't interrupt request handling)
- ✅ Duplicate prevention (symbol flag prevents double ingestion)
- ✅ TypeScript support with type definitions

### Backend Features
- ✅ RESTful API with FastAPI
- ✅ Request validation with Pydantic
- ✅ PostgreSQL storage with JSONB payloads
- ✅ Automatic project creation
- ✅ Database migrations with Alembic
- ✅ Comprehensive error logging
- ✅ Thread-safe project creation

## Documentation

- **[Backend README](./backend/README.md)** - Backend setup, API documentation, migrations
- **[SDK README](./sdks/node/README.md)** - SDK installation and usage
- **[Alembic Setup](./backend/ALEMBIC_SETUP.md)** - Database migration guide

## Configuration

### Backend
- See `backend/README.md` for environment variables and configuration

### SDK
- `apiUrl`: Backend API URL (required)
- `projectKey`: Project identifier (required)
- `timeout`: Request timeout in ms (optional, default: 5000)

## Development

### Backend
```bash
cd backend
# See backend/README.md for development setup
```

### SDK
```bash
cd sdks/node
npm install
npm run build
```

## Production Deployment

### Backend
1. Set `ENV=production` in `.env`
2. Run migrations: `alembic upgrade head`
3. Deploy with production WSGI server

### SDK
1. Build: `npm run build`
2. Publish to npm (or use as local package)

## Assumptions

1. **Project Key**: Projects identified by `project_key`, auto-created if missing
2. **Non-blocking**: SDK failures don't interrupt request handling
3. **No Authentication**: Only project_key validation (Phase 1 scope)
4. **Path Sanitization**: IDs in paths are replaced with `:id` placeholder
5. **Error Handling**: Backend validates all fields and returns appropriate HTTP codes

## Next Steps (Future Phases)

- Error grouping and deduplication
- Web UI for viewing errors
- AI-powered error analysis
- Authentication and authorization
- Rate limiting
- Error filtering and rules
- Additional SDKs (Python, Ruby, etc.)

## License

MIT

