import { neon } from '@neondatabase/serverless';
import { NextRequest, NextResponse } from 'next/server';

const AUTH_COOKIE = 'atlas_session';
const PUBLIC_PATHS = ['/login', '/api/auth/login'];

function constantTimeEqual(left: string, right: string): boolean {
  const length = Math.max(left.length, right.length);
  let mismatch = left.length ^ right.length;
  for (let index = 0; index < length; index += 1) {
    mismatch |= (left.charCodeAt(index) || 0) ^ (right.charCodeAt(index) || 0);
  }
  return mismatch === 0;
}

function isCronRequest(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret || !['/api/sim', '/api/market'].includes(request.nextUrl.pathname)) return false;
  return constantTimeEqual(
    request.headers.get('authorization') ?? '',
    `Bearer ${secret}`
  );
}

async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

async function hasValidSession(request: NextRequest): Promise<boolean> {
  const token = request.cookies.get(AUTH_COOKIE)?.value;
  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (!token || !databaseUrl) return false;
  try {
    const sql = neon(databaseUrl);
    const rows = await sql`
      SELECT 1
      FROM auth_sessions
      WHERE token_hash = ${await sha256(token)}
        AND expires_at > now()
      LIMIT 1
    `;
    return rows.length > 0;
  } catch {
    return false;
  }
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  if (PUBLIC_PATHS.includes(pathname) || isCronRequest(request)) {
    return NextResponse.next();
  }
  if (await hasValidSession(request)) {
    if (pathname === '/login') return NextResponse.redirect(new URL('/', request.url));
    return NextResponse.next();
  }
  if (pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const loginUrl = new URL('/login', request.url);
  if (pathname !== '/') loginUrl.searchParams.set('next', pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  // `icon.svg` is the App Router file convention (src/app/icon.svg): Next emits a
  // `<link rel="icon" href="/icon.svg">` on every page, so the browser requests it
  // before any session exists. Without the exemption the auth gate answers with a
  // 307 to /login and the tab renders no icon at all.
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icon.svg).*)'],
};

