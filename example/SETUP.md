# Setup Instructions for Example App

## Prerequisites

1. **Backend must be running** on `http://localhost:8000`
2. **SDK must be built** (TypeScript compiled to JavaScript)

## Step 1: Build the SDK

```bash
cd ../sdks/node
npm install
npm run build
cd ../../example
```

## Step 2: Install Dependencies

```bash
npm install
```

## Step 3: Configure (Optional)

Create a `.env` file from the example:

**PowerShell:**
```powershell
copy env.example .env
```

**Command Prompt:**
```cmd
copy env.example .env
```

**macOS/Linux:**
```bash
cp env.example .env
```

Or manually create a `.env` file with:

```env
API_URL=http://localhost:8000
PROJECT_KEY=test-project
```

Edit `.env` if your backend is on a different URL or you want to use a different project key.

## Step 4: Run the App

```bash
npm start
```

The app will start on `http://localhost:3000`

## Step 5: Test the SDK

Visit `http://localhost:3000/test-error` in your browser or use:

**PowerShell:**
```powershell
Invoke-WebRequest http://localhost:3000/test-error
```

**curl:**
```bash
curl http://localhost:3000/test-error
```

## Verify Error Was Captured

Check your PostgreSQL database:

```sql
SELECT e.*, p.name as project_name 
FROM error_events e
JOIN projects p ON e.project_id = p.id
WHERE p.project_key = 'test-project'
ORDER BY e.timestamp DESC
LIMIT 1;
```

You should see the error event with the message "Test error from /test-error endpoint".

