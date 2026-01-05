"use client";

import { useEffect, useRef } from "react";
import { api, getApiToken } from "@/lib/api";

/**
 * Client component that syncs user with backend after login
 * This runs on the client side to avoid server-side network issues
 * 
 * Gets session data from NextAuth API route and syncs with backend
 * 
 * Optimization: Only syncs when:
 * 1. No token exists (first login)
 * 2. Token is invalid (401/403 error)
 * 3. Not on every page mount/navigation
 */
export function UserSync() {
  const hasSyncedRef = useRef(false);
  const isSyncingRef = useRef(false);

  useEffect(() => {
    const performSync = async () => {
      // Prevent multiple simultaneous syncs
      if (isSyncingRef.current) {
        return;
      }

      isSyncingRef.current = true;

      try {
        // Check if we already have a valid token
        const existingToken = getApiToken();
        if (existingToken && hasSyncedRef.current) {
          // Token exists and we've already synced in this session
          isSyncingRef.current = false;
          return;
        }

        // Fetch session from NextAuth API route
        const res = await fetch('/api/auth/session');
        
        if (!res.ok) {
          console.error('UserSync: Failed to fetch session, status:', res.status);
          isSyncingRef.current = false;
          return;
        }
        
        const session = await res.json();
        
        if (session?.user) {
          // Ensure we have required fields - github_id should be in user.id
          const githubId = session.user.id;
          const username = session.user.username || session.user.name || 'unknown';
          
          if (!githubId) {
            console.error('UserSync: Missing github_id (user.id)');
            isSyncingRef.current = false;
            return;
          }
          
          if (!username || username === 'unknown') {
            console.error('UserSync: Missing username');
            isSyncingRef.current = false;
            return;
          }
          
          // Sync user with backend - ensure all values are strings or null
          const userData = {
            github_id: String(githubId).trim(),
            username: String(username).trim(),
            email: session.user.email ? String(session.user.email).trim() : null,
            name: session.user.name ? String(session.user.name).trim() : null,
            avatar_url: session.user.image ? String(session.user.image).trim() : null,
          };
          
          try {
            await api.syncUser(userData);
            hasSyncedRef.current = true;
            // Dispatch custom event when sync completes
            window.dispatchEvent(new CustomEvent('user-synced'));
          } catch (error) {
            console.error("UserSync: Failed to sync user:", error);
          }
        }
      } catch (error) {
        console.error('UserSync: Failed to fetch session:', error);
      } finally {
        isSyncingRef.current = false;
      }
    };

    // Listen for token-invalid event (triggered when API returns 401/403)
    const handleTokenInvalid = () => {
      // Only re-sync if we had a token (meaning it was invalid, not missing)
      const hadToken = getApiToken() !== null;
      if (hadToken) {
        hasSyncedRef.current = false; // Reset to allow re-sync
        performSync();
      }
    };

    window.addEventListener('token-invalid', handleTokenInvalid);

    // Only sync on mount if no token exists (first login scenario)
    const existingToken = getApiToken();
    if (!existingToken && !hasSyncedRef.current) {
      performSync();
    } else {
      // Token exists, mark as synced to prevent unnecessary syncs
      hasSyncedRef.current = true;
    }

    return () => {
      window.removeEventListener('token-invalid', handleTokenInvalid);
    };
  }, []); // Empty dependency array - only run once on mount

  // This component doesn't render anything
  return null;
}

