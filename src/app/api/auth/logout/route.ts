import { NextRequest, NextResponse } from 'next/server';
import { clearSessionCookie, logout } from '@/lib/auth';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  await logout(request).catch((error) => console.error('[Auth] Logout failed:', error));
  const response = NextResponse.json({ ok: true });
  clearSessionCookie(response);
  return response;
}

