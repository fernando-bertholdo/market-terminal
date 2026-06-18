import { NextRequest, NextResponse } from 'next/server';
import {
  authenticatedUser,
  changeCredentials,
  setSessionCookie,
} from '@/lib/auth';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const username = await authenticatedUser(request);
  if (!username) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  return NextResponse.json({ username });
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const result = await changeCredentials(
      request,
      typeof body?.currentPassword === 'string' ? body.currentPassword : '',
      typeof body?.username === 'string' ? body.username : '',
      typeof body?.newPassword === 'string' ? body.newPassword : ''
    );
    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }
    const response = NextResponse.json({ ok: true, username: result.username });
    setSessionCookie(response, result.session);
    return response;
  } catch (error) {
    console.error('[Auth] Credential change failed:', error);
    return NextResponse.json({ error: 'Could not update credentials' }, { status: 500 });
  }
}

