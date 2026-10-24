import type { TargetMode } from '../types';

export const DEFAULT_ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:global.stun.twilio.com:3478' },
  {
    urls: 'turn:openrelay.metered.ca:80',
    username: 'openrelay',
    credential: 'openrelay',
  },
  {
    urls: 'turn:openrelay.metered.ca:443',
    username: 'openrelay',
    credential: 'openrelay',
  },
  {
    urls: 'turn:openrelay.metered.ca:443?transport=tcp',
    username: 'openrelay',
    credential: 'openrelay',
  },
];

export function sanitizeGothwadUsername(raw: string): string {
  const clean = raw.trim().toLowerCase();
  const base = clean.includes('@') ? clean.split('@')[0] || '' : clean;
  return base.replace(/[^a-z0-9._-]/g, '');
}

export function buildHostPeerId(username: string, slot = 1): string {
  const safeUser = sanitizeGothwadUsername(username).replace(/[._]/g, '-');
  const safeSlot = Math.min(6, Math.max(1, Math.floor(slot)));
  return `grd-${safeUser}-slot-${safeSlot}`;
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

export async function computeAuthProof(
  pin: string,
  nonce: string,
  viewerUsername: string,
  targetMode: TargetMode,
): Promise<string> {
  const cleanViewer = sanitizeGothwadUsername(viewerUsername);
  const message = `${nonce}:${cleanViewer}:${targetMode}`;
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(pin.trim()),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message));
  return bytesToHex(new Uint8Array(sig));
}

export async function verifyAuthProof(
  pin: string,
  nonce: string,
  viewerUsername: string,
  targetMode: TargetMode,
  candidateProof: string,
): Promise<boolean> {
  const expected = await computeAuthProof(pin, nonce, viewerUsername, targetMode);
  return constantTimeEqual(expected, candidateProof.trim().toLowerCase());
}
