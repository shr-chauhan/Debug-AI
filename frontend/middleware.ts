/**
 * Middleware to protect routes and handle authentication
 * 
 * NOTE: Authentication is currently disabled for development.
 * Uncomment the auth check below when ready to enable authentication.
 */

import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const { pathname } = req.nextUrl;
  // const isLoggedIn = !!req.auth;

  // Authentication disabled for development - allow all routes
  // Uncomment below when ready to enable authentication:
  
  // // Public routes
  // if (pathname === '/login' || pathname.startsWith('/api/auth')) {
  //   if (isLoggedIn && pathname === '/login') {
  //     // Redirect to projects if already logged in
  //     return NextResponse.redirect(new URL('/projects', req.url));
  //   }
  //   return NextResponse.next();
  // }

  // // Protect all other routes
  // if (!isLoggedIn) {
  //   const loginUrl = new URL('/login', req.url);
  //   loginUrl.searchParams.set('callbackUrl', pathname);
  //   return NextResponse.redirect(loginUrl);
  // }

  return NextResponse.next();
});

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.svg$).*)'],
};


