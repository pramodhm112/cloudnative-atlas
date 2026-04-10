import crypto from 'node:crypto';

const COOKIE_NAME = 'admin_session';
const SESSION_MAX_AGE = 24 * 60 * 60; // 24 hours in seconds

interface SessionPayload {
  created: number;
}

export function createSessionToken(secret: string): string {
  const payload: SessionPayload = { created: Date.now() };
  const data = JSON.stringify(payload);
  const encoded = Buffer.from(data).toString('base64url');
  const signature = crypto
    .createHmac('sha256', secret)
    .update(encoded)
    .digest('base64url');
  return `${encoded}.${signature}`;
}

export function validateSessionToken(token: string, secret: string): boolean {
  try {
    const [encoded, signature] = token.split('.');
    if (!encoded || !signature) return false;

    const expectedSig = crypto
      .createHmac('sha256', secret)
      .update(encoded)
      .digest('base64url');

    if (signature !== expectedSig) return false;

    const data = JSON.parse(Buffer.from(encoded, 'base64url').toString());
    const payload = data as SessionPayload;
    const age = (Date.now() - payload.created) / 1000;

    return age < SESSION_MAX_AGE;
  } catch {
    return false;
  }
}

export function getSessionCookie(token: string): string {
  return `${COOKIE_NAME}=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${SESSION_MAX_AGE}`;
}

export function getClearSessionCookie(): string {
  return `${COOKIE_NAME}=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0`;
}

export { COOKIE_NAME };
