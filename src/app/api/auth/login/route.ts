import { NextRequest, NextResponse } from 'next/server';
import { login, setSessionCookie } from '@/lib/auth';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const username = typeof body?.username === 'string' ? body.username : '';
    const password = typeof body?.password === 'string' ? body.password : '';
    const session = await login(username, password);
    if (!session) {
      return NextResponse.json({ error: 'Invalid username or password' }, { status: 401 });
    }
    const response = NextResponse.json({ ok: true });
    setSessionCookie(response, session);
    return response;
  } catch (error) {
    console.error('[Auth] Login failed:', error);
    return NextResponse.json({ error: 'Authentication service unavailable' }, { status: 503 });
  }
}

