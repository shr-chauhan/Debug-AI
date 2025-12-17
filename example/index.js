require('dotenv').config();
const express = require('express');
const { errorIngestionMiddleware } = require('@error-ingestion/sdk-node');

const app = express();
const PORT = 3000;

// Parse JSON bodies
app.use(express.json());

// Routes
app.get('/', (req, res) => {
  res.json({ 
    message: 'Error Ingestion Test App',
    endpoint: '/test-error - Triggers an error to test the SDK'
  });
});

// Test endpoint that throws an error
app.get('/test-error', (req, res, next) => {
  const error = new Error('Test error from /test-error endpoint');
  next(error);
});

// Error ingestion middleware (must be after routes, before final error handler)
app.use(errorIngestionMiddleware({
  apiUrl: process.env.API_URL || 'http://localhost:8000',
  projectKey: process.env.PROJECT_KEY || 'test-project',
  timeout: 5000
}));

// Final error handler
app.use((err, req, res, next) => {
  console.error('Error caught:', err.message);
  res.status(500).json({
    error: err.message,
    path: req.path,
    message: 'Error was captured and sent to error ingestion backend'
  });
});

app.listen(PORT, () => {
  console.log(`\n🚀 Test app running on http://localhost:${PORT}`);
  console.log(`\n📝 Test the SDK by visiting: http://localhost:${PORT}/test-error\n`);
});

