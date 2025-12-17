# Error Ingestion SDK - Node.js

Express middleware for automatically capturing and sending errors to the error ingestion backend.

## Features

- ✅ Automatic error capture from Express error handlers
- ✅ Path sanitization (replaces IDs with `:id` to reduce cardinality)
- ✅ Non-blocking (doesn't interrupt request handling)
- ✅ Duplicate prevention (prevents double ingestion)
- ✅ TypeScript support with type definitions
- ✅ Minimal dependencies (only axios)

## Installation

```bash
npm install @error-ingestion/sdk-node
```

## Quick Start

```javascript
const express = require('express');
const { errorIngestionMiddleware } = require('@error-ingestion/sdk-node');

const app = express();
app.use(express.json());

// Your routes
app.get('/api/users/:id', async (req, res, next) => {
  try {
    const user = await getUser(req.params.id);
    res.json(user);
  } catch (err) {
    next(err); // Error will be captured by SDK
  }
});

// Add error ingestion middleware (after routes, before final error handler)
app.use(errorIngestionMiddleware({
  apiUrl: 'http://localhost:8000',
  projectKey: 'my-project',
  timeout: 5000 // optional
}));

// Final error handler
app.use((err, req, res, next) => {
  res.status(500).json({ error: err.message });
});

app.listen(3000);
```

## Configuration Options

```javascript
errorIngestionMiddleware({
  apiUrl: 'http://localhost:8000',  // Required: Backend API URL
  projectKey: 'my-project',         // Required: Project identifier
  timeout: 5000                      // Optional: Request timeout in ms (default: 5000)
})
```

## How It Works

1. **Error occurs** in your route handler
2. **Pass to next()**: `next(error)` triggers error middleware chain
3. **SDK captures**: Middleware extracts error details (message, stack, method, path, status code)
4. **Path sanitization**: IDs in paths are replaced (e.g., `/users/123` → `/users/:id`)
5. **Send to backend**: Error is sent asynchronously (non-blocking)
6. **Continue**: Request handling continues normally

## Captured Data

The SDK automatically captures:
- Error message
- Stack trace
- HTTP method (GET, POST, etc.)
- Request path (sanitized)
- HTTP status code
- Timestamp (ISO format)

## Path Sanitization

To reduce cardinality and avoid leaking IDs, paths are automatically sanitized:

| Original Path | Sanitized Path |
|--------------|----------------|
| `/users/123` | `/users/:id` |
| `/users/123/orders/456` | `/users/:id/orders/:id` |
| `/api/products/789` | `/api/products/:id` |

UUIDs are also replaced: `/users/550e8400-e29b-41d4-a716-446655440000` → `/users/:id`

## Middleware Placement

**Important**: The middleware must be placed **after your routes** but **before your final error handler**:

```javascript
// ✅ Correct order
app.use(express.json());
app.use('/api', routes);              // Your routes
app.use(errorIngestionMiddleware());  // SDK middleware
app.use(finalErrorHandler);           // Final error handler
```

## TypeScript Support

```typescript
import { errorIngestionMiddleware, ErrorIngestionOptions } from '@error-ingestion/sdk-node';

const options: ErrorIngestionOptions = {
  apiUrl: 'http://localhost:8000',
  projectKey: 'my-project',
  timeout: 5000
};

app.use(errorIngestionMiddleware(options));
```

## Error Handling

- **Non-blocking**: If the backend is down, errors are logged (in dev mode) but don't interrupt your app
- **Duplicate prevention**: Uses symbol flag to prevent errors from being ingested multiple times
- **Automatic retry**: Not implemented (Phase 1 scope)

## Development

### Building from Source

```bash
npm install
npm run build
```

### Testing

See the `example/` directory for a complete example app.

## Requirements

- Node.js 14+
- Express 4.18+
- axios (installed automatically)

## License

MIT

