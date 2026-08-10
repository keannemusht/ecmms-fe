import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

type Role = 'ADMIN' | 'MANAGEMENT' | 'USER';

const PUBLIC_PATHS = ['/login'];

const roleRequirements: { pattern: RegExp; roles: Role[] }[] = [
  { pattern: /^\/users/, roles: ['ADMIN'] },
  { pattern: /^\/audit-logs/, roles: ['ADMIN'] },
  { pattern: /^\/notification-settings/, roles: ['ADMIN'] },
  { pattern: /^\/dashboard/, roles: ['ADMIN', 'MANAGEMENT'] },
  { pattern: /^\/employees/, roles: ['ADMIN', 'MANAGEMENT'] },
  { pattern: /^\/contracts/, roles: ['ADMIN', 'MANAGEMENT'] },
  { pattern: /^\/reports/, roles: ['ADMIN', 'MANAGEMENT'] },
  { pattern: /^\/submissions/, roles: ['ADMIN', 'MANAGEMENT', 'USER'] },
  { pattern: /^\/departments/, roles: ['ADMIN', 'MANAGEMENT'] },
  { pattern: /^\/positions/, roles: ['ADMIN', 'MANAGEMENT'] },
];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get('ecmms_token')?.value;
  const userRaw = request.cookies.get('ecmms_user')?.value;

  let role: Role | null = null;
  if (userRaw) {
    try {
      const parsed = JSON.parse(decodeURIComponent(userRaw));
      role = parsed?.role ?? null;
    } catch {
      role = null;
    }
  }

  const isAuthenticated = Boolean(token) && Boolean(role);

  const homeFor = (r: Role | null) => (r === 'USER' ? '/my-profile' : '/dashboard');

  // Root path: route to the proper entry point.
  if (pathname === '/') {
    return NextResponse.redirect(new URL(isAuthenticated ? homeFor(role) : '/login', request.url));
  }

  // Authenticated users visiting /login go straight to their home.
  if (pathname === '/login' && isAuthenticated) {
    return NextResponse.redirect(new URL(homeFor(role), request.url));
  }

  if (PUBLIC_PATHS.includes(pathname)) {
    return NextResponse.next();
  }

  if (!isAuthenticated) {
    const url = new URL('/login', request.url);
    url.searchParams.set('from', pathname);
    return NextResponse.redirect(url);
  }

  for (const rule of roleRequirements) {
    if (rule.pattern.test(pathname) && !rule.roles.includes(role as Role)) {
      return NextResponse.redirect(new URL(homeFor(role), request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|uploads|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt)).*)'],
};
