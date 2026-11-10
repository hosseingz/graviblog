/**
 * Next.js Edge Middleware for Route Guarding & Non-Premature Session Eviction
 *
 * CRITICAL ARCHITECTURAL GUARDRAIL (Non-Premature Route Eviction):
 * - Protected routes MUST allow entry if EITHER `pod_access_token` OR `pod_refresh_token` is present.
 * - If `pod_access_token` has expired, the client browser still holds `pod_refresh_token`.
 *   Prematurely redirecting to `/auth/login` destroys UX and causes unneeded logouts.
 * - By passing requests through when `pod_refresh_token` exists, client-side hydration
 *   and `apiClient.ts` interceptors seamlessly execute background token refreshes.
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const ACCESS_COOKIE_NAME = 'pod_access_token';
const REFRESH_COOKIE_NAME = 'pod_refresh_token';

// Routes requiring authentication
const PROTECTED_ROUTES = ['/dashboard', '/checkout', '/profile', '/settings'];

// Routes reserved for non-authenticated guests
const AUTH_ROUTES = ['/auth/login', '/auth/register', '/auth/otp'];

/**
 * Safely resolves and validates a redirect destination to prevent Open Redirect (CWE-601)
 * and Denial of Service (DoS) via malformed URL inputs.
 *
 * Validation Pipeline:
 * 1. Rejects null, undefined, non-string, or empty/whitespace-only input.
 * 2. Enforces single leading slash; rejects protocol-relative prefixes ('//', '/\', '/\\').
 * 3. Rejects backslashes and ASCII control characters (U+0000 to U+001F, including \t, \r, \n)
 *    which WHATWG parsers strip/normalize, preventing filter bypasses and CRLF injection.
 * 4. Checks decoded variant to catch double-encoding bypasses (e.g. /%2fevil.com, /%5cevil.com).
 * 5. Parses the target safely relative to baseOrigin inside a try/catch block.
 * 6. Strictly enforces parsed.origin === baseOrigin.
 * 7. Strictly enforces parsed.protocol is 'http:' or 'https:'.
 * 8. Prevents infinite redirect loops: if target matches an AUTH_ROUTE, falls back to defaultPath.
 * 9. Returns safe URL preserving valid path, query parameters, and hash fragments.
 */
export function getSafeRedirectUrl(
  destination: string | null | undefined,
  baseOrigin: string,
  defaultPath: string = '/dashboard'
): URL {
  const fallbackUrl = new URL(defaultPath, baseOrigin);

  if (!destination || typeof destination !== 'string') {
    return fallbackUrl;
  }

  const trimmed = destination.trim();

  // Must begin with a single '/' and cannot be followed by another '/' or '\'
  if (!trimmed.startsWith('/') || /^\/[/\\]/.test(trimmed)) {
    return fallbackUrl;
  }

  // Reject backslashes anywhere and ASCII control characters (U+0000 to U+001F)
  if (/[\\]|[\u0000-\u001f]/.test(trimmed)) {
    return fallbackUrl;
  }

  // Check decoded variant to catch double-encoding bypasses (e.g. /%2fevil.com)
  try {
    const decoded = decodeURIComponent(trimmed);
    if (decoded.startsWith('//') || /^\/[/\\]/.test(decoded) || /[\\]|[\u0000-\u001f]/.test(decoded)) {
      return fallbackUrl;
    }
  } catch {
    return fallbackUrl;
  }

  try {
    const parsed = new URL(trimmed, baseOrigin);

    // Enforce strict origin identity
    if (parsed.origin !== baseOrigin) {
      return fallbackUrl;
    }

    // Enforce strict protocol whitelist
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return fallbackUrl;
    }

    // Avoid infinite redirect loops back to auth routes for logged-in users
    if (AUTH_ROUTES.some((route) => parsed.pathname.startsWith(route))) {
      return fallbackUrl;
    }

    return parsed;
  } catch {
    return fallbackUrl;
  }
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const hasAccessToken = request.cookies.has(ACCESS_COOKIE_NAME);
  const hasRefreshToken = request.cookies.has(REFRESH_COOKIE_NAME);
  const hasSession = hasAccessToken || hasRefreshToken;

  const isProtectedRoute = PROTECTED_ROUTES.some((route) =>
    pathname.startsWith(route)
  );

  const isAuthRoute = AUTH_ROUTES.some((route) =>
    pathname.startsWith(route)
  );

  // 1. Guard Protected Routes
  if (isProtectedRoute) {
    if (!hasSession) {
      // Complete session absence: redirect to login with return destination
      const loginUrl = new URL('/auth/login', request.url);
      loginUrl.searchParams.set('next', pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Has either valid access token OR refresh token: allow through for silent refresh
    return NextResponse.next();
  }

  // 2. Redirect Authenticated Users Away From Login/Register
  if (isAuthRoute) {
    if (hasSession) {
      // User is already logged in (or has active refresh token), redirect to safe destination
      const nextParam = request.nextUrl.searchParams.get('next');
      const safeRedirectUrl = getSafeRedirectUrl(
        nextParam,
        request.nextUrl.origin,
        '/dashboard'
      );
      return NextResponse.redirect(safeRedirectUrl);
    }

    return NextResponse.next();
  }

  return NextResponse.next();
}

/**
 * Configure matching routes for Next.js Middleware.
 * Excludes static assets, image optimization, and favicon files.
 */
export const config = {
  matcher: [
    '/dashboard/:path*',
    '/checkout/:path*',
    '/profile/:path*',
    '/settings/:path*',
    '/auth/login',
    '/auth/register',
    '/auth/otp',
  ],
};
