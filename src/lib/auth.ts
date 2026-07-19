import {
  pbkdf2 as pbkdf2Callback,
  randomBytes,
  timingSafeEqual,
  createHash,
} from 'node:crypto';
import { promisify } from 'node:util';
import { neon } from '@neondatabase/serverless';
import type { NextRequest, NextResponse } from 'next/server';

const pbkdf2 = promisify(pbkdf2Callback);
export const AUTH_COOKIE = 'atlas_session';
// Credencial "semente" criada a partir de APP_USERNAME/APP_PASSWORD no primeiro
// login. Logins adicionais (ex.: convidados) vivem em outras linhas de
// auth_credentials e são resolvidos por username — o login não é mais preso a
// esta id fixa.
const CREDENTIAL_ID = 'primary';
const PBKDF2_ITERATIONS = 210_000;
const SESSION_DAYS = 30;
let schemaReady: Promise<void> | null = null;

function postgres() {
  const url = process.env.DATABASE_URL?.trim();
  return url ? neon(url) : null;
}

async function ensureSchema(): Promise<void> {
  const sql = postgres();
  if (!sql) throw new Error('DATABASE_URL is required for managed authentication');
  schemaReady ??= (async () => {
    await sql`
      CREATE TABLE IF NOT EXISTS auth_credentials (
        id text PRIMARY KEY,
        username text NOT NULL UNIQUE,
        password_hash text NOT NULL,
        salt text NOT NULL,
        iterations integer NOT NULL,
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS auth_sessions (
        token_hash text PRIMARY KEY,
        credential_id text NOT NULL REFERENCES auth_credentials(id) ON DELETE CASCADE,
        created_at timestamptz NOT NULL DEFAULT now(),
        expires_at timestamptz NOT NULL
      )
    `;
    await sql`CREATE INDEX IF NOT EXISTS auth_sessions_expires_idx ON auth_sessions(expires_at)`;
  })().catch((error) => {
    schemaReady = null;
    throw error;
  });
  await schemaReady;
}

function tokenHash(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

async function derivePassword(password: string, salt: string, iterations: number): Promise<string> {
  const derived = await pbkdf2(password, salt, iterations, 32, 'sha256');
  return derived.toString('hex');
}

async function passwordRecord(password: string) {
  const salt = randomBytes(18).toString('hex');
  return {
    salt,
    iterations: PBKDF2_ITERATIONS,
    hash: await derivePassword(password, salt, PBKDF2_ITERATIONS),
  };
}

function constantTimeHexEqual(left: string, right: string): boolean {
  try {
    const a = Buffer.from(left, 'hex');
    const b = Buffer.from(right, 'hex');
    return a.length === b.length && timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

interface CredentialRow {
  id: string;
  username: string;
  password_hash: string;
  salt: string;
  iterations: number;
}

async function loadCredential(): Promise<CredentialRow | null> {
  await ensureSchema();
  const sql = postgres()!;
  const rows = await sql`
    SELECT id, username, password_hash, salt, iterations
    FROM auth_credentials
    WHERE id = ${CREDENTIAL_ID}
  `;
  return rows[0] as CredentialRow | undefined ?? null;
}

async function loadCredentialByUsername(username: string): Promise<CredentialRow | null> {
  await ensureSchema();
  const sql = postgres()!;
  const rows = await sql`
    SELECT id, username, password_hash, salt, iterations
    FROM auth_credentials
    WHERE username = ${username}
  `;
  return rows[0] as CredentialRow | undefined ?? null;
}

async function bootstrapCredential(username: string, password: string): Promise<CredentialRow | null> {
  const envUsername = process.env.APP_USERNAME ?? '';
  const envPassword = process.env.APP_PASSWORD ?? '';
  if (username !== envUsername || password !== envPassword || !envUsername || !envPassword) return null;
  const record = await passwordRecord(password);
  const sql = postgres()!;
  await sql`
    INSERT INTO auth_credentials (id, username, password_hash, salt, iterations)
    VALUES (
      ${CREDENTIAL_ID}, ${username}, ${record.hash}, ${record.salt}, ${record.iterations}
    )
    ON CONFLICT (id) DO NOTHING
  `;
  return loadCredential();
}

/**
 * Cria (idempotente) uma credencial de login adicional que compartilha a mesma
 * interface e o mesmo book global. Usada para provisionar acessos nomeados
 * (ex.: o João) enquanto o produto ainda é single-tenant; o isolamento de dados
 * por usuário virá no design multi-tenant (SP2).
 */
export async function provisionCredential(
  id: string,
  username: string,
  password: string
): Promise<CredentialRow | null> {
  await ensureSchema();
  const record = await passwordRecord(password);
  const sql = postgres()!;
  await sql`
    INSERT INTO auth_credentials (id, username, password_hash, salt, iterations)
    VALUES (${id}, ${username}, ${record.hash}, ${record.salt}, ${record.iterations})
    ON CONFLICT (id) DO NOTHING
  `;
  return loadCredentialByUsername(username);
}

async function verifyPassword(credential: CredentialRow, password: string): Promise<boolean> {
  const candidate = await derivePassword(password, credential.salt, credential.iterations);
  return constantTimeHexEqual(candidate, credential.password_hash);
}

async function createSession(credentialId: string): Promise<{ token: string; expiresAt: Date }> {
  const sql = postgres()!;
  const token = randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await sql`DELETE FROM auth_sessions WHERE expires_at <= now()`;
  await sql`
    INSERT INTO auth_sessions (token_hash, credential_id, expires_at)
    VALUES (${tokenHash(token)}, ${credentialId}, ${expiresAt.toISOString()})
  `;
  return { token, expiresAt };
}

export async function login(username: string, password: string) {
  // Resolve por username: qualquer credencial provisionada pode logar. Se ainda
  // não existir e casar com APP_USERNAME/APP_PASSWORD, cria a semente 'primary'.
  let credential = await loadCredentialByUsername(username);
  if (!credential) credential = await bootstrapCredential(username, password);
  if (!credential || credential.username !== username || !(await verifyPassword(credential, password))) {
    return null;
  }
  return createSession(credential.id);
}

export async function authenticatedUser(request: NextRequest): Promise<string | null> {
  const token = request.cookies.get(AUTH_COOKIE)?.value;
  if (!token) return null;
  await ensureSchema();
  const sql = postgres()!;
  const rows = await sql`
    SELECT c.username
    FROM auth_sessions s
    JOIN auth_credentials c ON c.id = s.credential_id
    WHERE s.token_hash = ${tokenHash(token)}
      AND s.expires_at > now()
  `;
  return typeof rows[0]?.username === 'string' ? rows[0].username : null;
}

export async function changeCredentials(
  request: NextRequest,
  currentPassword: string,
  username: string,
  newPassword: string
) {
  const currentUser = await authenticatedUser(request);
  if (!currentUser) return { error: 'Session expired', status: 401 } as const;
  // Altera a credencial do usuário logado (não mais uma fixa) — cada login
  // gerencia a própria senha/nome sem afetar os demais.
  const credential = await loadCredentialByUsername(currentUser);
  if (!credential || !(await verifyPassword(credential, currentPassword))) {
    return { error: 'Current password is incorrect', status: 403 } as const;
  }
  const normalizedUsername = username.trim();
  if (normalizedUsername.length < 3 || normalizedUsername.length > 64) {
    return { error: 'Username must have between 3 and 64 characters', status: 400 } as const;
  }
  if (newPassword.length < 12) {
    return { error: 'New password must have at least 12 characters', status: 400 } as const;
  }

  const record = await passwordRecord(newPassword);
  const sql = postgres()!;
  await sql`
    UPDATE auth_credentials
    SET username = ${normalizedUsername},
        password_hash = ${record.hash},
        salt = ${record.salt},
        iterations = ${record.iterations},
        updated_at = now()
    WHERE id = ${credential.id}
  `;
  await sql`DELETE FROM auth_sessions WHERE credential_id = ${credential.id}`;
  return { session: await createSession(credential.id), username: normalizedUsername } as const;
}

export async function logout(request: NextRequest): Promise<void> {
  const token = request.cookies.get(AUTH_COOKIE)?.value;
  if (!token) return;
  await ensureSchema();
  await postgres()!`DELETE FROM auth_sessions WHERE token_hash = ${tokenHash(token)}`;
}

export function setSessionCookie(
  response: NextResponse,
  session: { token: string; expiresAt: Date }
): void {
  response.cookies.set(AUTH_COOKIE, session.token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    expires: session.expiresAt,
  });
}

export function clearSessionCookie(response: NextResponse): void {
  response.cookies.set(AUTH_COOKIE, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    expires: new Date(0),
  });
}
