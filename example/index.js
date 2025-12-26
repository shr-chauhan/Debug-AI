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
    endpoints: {
      '/test-error': '404 - User not found (default)',
      '/test-error?id=999': '404 - User not found',
      '/test-error?id=error': '500 - Database connection error',
      '/test-error?id=123': '200 - Success (no error)'
    }
  });
});

// Test endpoint that simulates a real API error
app.get('/test-error', async (req, res, next) => {
  try {
    // Simulate a realistic error scenario
    // Example: Trying to fetch a user that doesn't exist
    const userId = req.query.id || '999'; // Default to non-existent user to trigger error
    
    // Simulate database lookup that fails
    const user = await simulateDatabaseLookup(userId);
    
    if (!user) {
      const error = new Error(`User with id ${userId} not found`);
      error.statusCode = 404;
      return next(error);
    }
    
    res.json(user);
  } catch (err) {
    // This catches any unexpected errors (like database connection failures)
    console.log('Error', err);
    console.error('Error code', err.statusCode);
    
    err.statusCode = err.statusCode || 500;
    next(err);
  }
});

// Simulate a database lookup function that can fail
async function simulateDatabaseLookup(userId) {
  // Simulate async operation
  await new Promise(resolve => setTimeout(resolve, 10));
  
  // Simulate error: if userId is 'error', throw a database error
  if (userId === 'error') {
    throw new Error('Database connection failed');
  }
  
  // Simulate not found: if userId is '999', return null
  if (userId === '999') {
    return null;
  }
  
  // Otherwise return a user
  return { id: userId, name: 'Test User', email: 'test@example.com' };
}

// Error ingestion middleware (must be after routes, before final error handler)
app.use(errorIngestionMiddleware({
  apiUrl: process.env.API_URL || 'http://localhost:8000',
  projectKey: process.env.PROJECT_KEY || 'test-project',
  timeout: 5000
}));

// Final error handler
app.use((err, req, res, next) => {
  console.error('Error caught:', err.message);
  const statusCode = err.statusCode || err.status || 500;
  res.status(statusCode).json({
    error: err.message,
    path: req.path,
    message: 'Error was captured and sent to error ingestion backend'
  });
});

app.listen(PORT, () => {
  console.log(`\n🚀 Test app running on http://localhost:${PORT}`);
  console.log(`\n📝 Test the SDK:`);
  console.log(`   - http://localhost:${PORT}/test-error (404 - User not found)`);
  console.log(`   - http://localhost:${PORT}/test-error?id=999 (404 - User not found)`);
  console.log(`   - http://localhost:${PORT}/test-error?id=error (500 - Database error)`);
  console.log(`   - http://localhost:${PORT}/test-error?id=123 (200 - Success)\n`);
});

