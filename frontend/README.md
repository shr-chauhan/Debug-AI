# Stackwise Dashboard

Developer-facing dashboard for the AI-powered error debugging platform.

## Features

- 🔐 GitHub OAuth authentication
- 📊 Project management
- 🔍 Error event viewing and filtering
- 🤖 AI-powered error analysis
- 📦 SDK setup instructions

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Authentication**: NextAuth.js v5 (beta)
- **API Client**: Custom typed client

## Setup

### Prerequisites

- Node.js 18+ 
- Backend API running (default: http://localhost:8000)

### Installation

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment variables:**
   
   Create a `.env.local` file:
   ```env
   # Backend API URL
   NEXT_PUBLIC_API_BASE_URL=http://localhost:8000

   # NextAuth
   AUTH_SECRET=your-secret-key-here
   AUTH_URL=http://localhost:3000

   # GitHub OAuth
   GITHUB_CLIENT_ID=your-github-client-id
   GITHUB_CLIENT_SECRET=your-github-client-secret
   ```

3. **Generate AUTH_SECRET:**
   ```bash
   openssl rand -base64 32
   ```

4. **Set up GitHub OAuth App:**
   - Go to GitHub Settings → Developer settings → OAuth Apps
   - Create a new OAuth App
   - Set Authorization callback URL to: `http://localhost:3000/api/auth/callback/github`
   - Copy Client ID and Client Secret to `.env.local`

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Build

```bash
npm run build
npm start
```

## Project Structure

```
frontend/
├── app/
│   ├── api/
│   │   └── auth/
│   │       └── [...nextauth]/    # NextAuth API routes
│   ├── login/                     # Login page
│   ├── projects/
│   │   ├── page.tsx               # Projects list
│   │   ├── new/
│   │   │   └── page.tsx           # Create project
│   │   └── [projectId]/
│   │       ├── page.tsx           # Project detail
│   │       └── errors/
│   │           └── [errorId]/
│   │               └── page.tsx   # Error detail
│   └── layout.tsx                 # Root layout
├── components/                     # Reusable components
├── lib/
│   ├── api.ts                     # API client
│   └── auth.ts                    # NextAuth config
└── middleware.ts                  # Route protection
```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `NEXT_PUBLIC_API_BASE_URL` | Backend API base URL | Yes |
| `AUTH_SECRET` | Secret for NextAuth session encryption | Yes |
| `AUTH_URL` | Base URL for authentication callbacks | Yes |
| `GITHUB_CLIENT_ID` | GitHub OAuth Client ID | Yes |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth Client Secret | Yes |

## Features

### Authentication
- GitHub OAuth login
- Protected routes (all routes except `/login` require authentication)
- Session management

### Projects
- List all projects
- Create new projects
- View project details
- Repository configuration
- SDK setup instructions

### Error Events
- View error events for a project
- Filter by status code
- View error details with stack traces
- AI analysis integration

### AI Analysis
- View AI-powered error analysis
- Analysis status (Pending/Analyzed)
- Model and confidence information
- Real-time analysis updates

## API Integration

The dashboard uses a typed API client (`lib/api.ts`) that communicates with the backend FastAPI service. All API calls are typed and include proper error handling.

## Development Notes

- All routes except `/login` are protected by middleware
- API client handles errors gracefully
- Components are server-side rendered where possible
- Client components are used for interactive forms
