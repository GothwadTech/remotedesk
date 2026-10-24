const GOTHWAD_ACCOUNTS_WEB = 'https://accounts.gothwadtech.com';
const GOTHWAD_OAUTH_API = 'https://accounts.gothwadtech.com/api';
const OAUTH_CLIENT_ID = 'gothwad-remotedesktop';

function base64Url(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

export function buildGothwadSignInUrl(signinBase?: string, authuser?: number): string {
  const origin = (signinBase || GOTHWAD_ACCOUNTS_WEB).replace(/\/+$/, '');
  const u = new URL(`${origin}/signin`);
  u.searchParams.set('next', window.location.href);
  if (typeof authuser === 'number' && authuser > 0) {
    u.searchParams.set('authuser', String(authuser));
  }
  return u.toString();
}

export async function startGothwadOAuthPkce(): Promise<void> {
  const verifierBytes = crypto.getRandomValues(new Uint8Array(32));
  const verifier = base64Url(verifierBytes);
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
  const challenge = base64Url(new Uint8Array(digest));
  const state = base64Url(crypto.getRandomValues(new Uint8Array(16)));

  const u = new URL('oauth/authorize', `${GOTHWAD_OAUTH_API}/`);
  u.searchParams.set('client_id', OAUTH_CLIENT_ID);
  u.searchParams.set('redirect_uri', `${window.location.origin}/auth/callback`);
  u.searchParams.set('response_type', 'code');
  u.searchParams.set('scope', 'profile email');
  u.searchParams.set('state', state);
  u.searchParams.set('code_challenge', challenge);
  u.searchParams.set('code_challenge_method', 'S256');
  window.location.href = u.toString();
}
