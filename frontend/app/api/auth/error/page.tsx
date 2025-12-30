import Link from "next/link";

export default async function AuthErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8">
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">
            Authentication Error
          </h1>
          <p className="text-gray-700 mb-6">
            There was a problem signing in with GitHub. This could be due to:
          </p>
          <ul className="text-left text-sm text-gray-600 space-y-2 mb-6">
            <li>• Missing or incorrect GitHub OAuth credentials</li>
            <li>• Network connectivity issues</li>
            <li>• GitHub API timeout</li>
            <li>• Incorrect callback URL configuration</li>
          </ul>
          <div className="space-y-3">
            <Link
              href="/login"
              className="block w-full px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Try Again
            </Link>
            <div className="text-xs text-gray-500 mt-4">
              <p>Check your <code className="bg-gray-100 px-1 rounded">.env.local</code> file:</p>
              <ul className="mt-2 space-y-1">
                <li>• GITHUB_CLIENT_ID</li>
                <li>• GITHUB_CLIENT_SECRET</li>
                <li>• AUTH_SECRET</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

