// import { auth } from "@/lib/auth";
// import { signOutAction } from "@/lib/actions";

/**
 * Header component - Authentication disabled for development
 * 
 * NOTE: User info and sign out are hidden when auth is disabled.
 * Uncomment auth code below when ready to enable authentication.
 * 
 * When auth is enabled, this should be an async Server Component.
 */
export function Header() {
  // Authentication disabled - no session check
  // When auth is enabled, uncomment: const session = await auth();

  return (
    <header className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <a href="/projects" className="text-xl font-bold text-gray-900">
              Debug AI
            </a>
            <span className="ml-4 text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
              Dev Mode (No Auth)
            </span>
          </div>
          
          {/* User info hidden when auth is disabled */}
          {/* Uncomment below when ready to enable authentication: */}
          {/* {session && (
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                {session.user?.image && (
                  <img
                    src={session.user.image}
                    alt={session.user.name || "User"}
                    className="w-8 h-8 rounded-full"
                  />
                )}
                <span className="text-sm text-gray-700">
                  {session.user?.username || session.user?.name}
                </span>
              </div>
              
              <form action={signOutAction}>
                <button
                  type="submit"
                  className="text-sm text-gray-600 hover:text-gray-900"
                >
                  Sign out
                </button>
              </form>
            </div>
          )} */}
        </div>
      </div>
    </header>
  );
}

