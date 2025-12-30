# Frontend Setup Guide

## Quick Start

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment variables:**
   ```bash
   cp env.example .env.local
   # Edit .env.local with your values
   ```

3. **Generate AUTH_SECRET:**
   ```bash
   # On macOS/Linux:
   openssl rand -base64 32
   
   # On Windows (PowerShell):
   [Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))
   ```

4. **Set up GitHub OAuth:**
   - Go to https://github.com/settings/developers
   - Click "New OAuth App"
   - Fill in:
     - **Application name**: Debug AI (or your choice)
     - **Homepage URL**: http://localhost:3000
     - **Authorization callback URL**: http://localhost:3000/api/auth/callback/github
   - Click "Register application"
   - Copy **Client ID** and generate a **Client Secret**
   - Add both to `.env.local`

5. **Start the development server:**
   ```bash
   npm run dev
   ```

6. **Open your browser:**
   Navigate to http://localhost:3000

## Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `NEXT_PUBLIC_API_BASE_URL` | Backend API URL | `http://localhost:8000` |
| `AUTH_SECRET` | NextAuth session secret | Generated with openssl |
| `AUTH_URL` | Base URL for auth callbacks | `http://localhost:3000` |
| `GITHUB_CLIENT_ID` | GitHub OAuth Client ID | From GitHub OAuth App |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth Client Secret | From GitHub OAuth App |

## Troubleshooting

### "Invalid credentials" error
- Check that `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET` are correct
- Verify the callback URL in GitHub OAuth app matches exactly: `http://localhost:3000/api/auth/callback/github`

### API requests failing
- Ensure backend is running on the URL specified in `NEXT_PUBLIC_API_BASE_URL`
- Check CORS settings in backend (should allow `http://localhost:3000`)

### Authentication not working
- Verify `AUTH_SECRET` is set and is a valid base64 string
- Check that `AUTH_URL` matches your frontend URL
- Clear browser cookies and try again

### Connection timeout error (ConnectTimeoutError)
This error occurs when NextAuth cannot connect to GitHub's OAuth API. Try these solutions:

1. **Verify GitHub OAuth credentials:**
   - Check that `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET` are set in `.env.local`
   - Ensure there are no extra spaces or quotes around the values
   - Verify the credentials are correct in your GitHub OAuth App settings

2. **Check network connectivity:**
   - Test if you can reach GitHub: `curl https://github.com` or open in browser
   - If behind a corporate firewall/proxy, you may need to configure proxy settings
   - Try disabling VPN if active

3. **Verify callback URL:**
   - In GitHub OAuth App settings, ensure callback URL is exactly:
     `http://localhost:3000/api/auth/callback/github`
   - No trailing slashes or extra characters

4. **Restart the dev server:**
   - After changing `.env.local`, always restart: `npm run dev`

5. **Check for environment variable issues:**
   - Ensure `.env.local` is in the `frontend/` directory
   - Verify the file is not named `.env.local.txt` (Windows sometimes adds .txt)
   - Check that variables don't have quotes: `GITHUB_CLIENT_ID=abc123` not `GITHUB_CLIENT_ID="abc123"`

## Production Deployment

For production:

1. Update `AUTH_URL` to your production domain
2. Update GitHub OAuth callback URL to production domain
3. Use a strong, randomly generated `AUTH_SECRET`
4. Set `NEXT_PUBLIC_API_BASE_URL` to your production API URL
5. Build the app: `npm run build`
6. Start the server: `npm start`


