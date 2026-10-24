import type { AccountItem, SessionPayload } from '../types';
import { sanitizeGothwadUsername } from './protocol';

export const APP_DOMAIN = 'gothwadtech.com';
export const ECOSYSTEM_NAME = 'Gothwad';
export const ACCOUNTS_API_ORIGIN = 'https://api.gothwadtech.com';
export const ACCOUNTS_WEB_ORIGIN = 'https://accounts.gothwadtech.com';

export class AuthRequiredError extends Error {
  readonly signinUrl: string;
  constructor(signinUrl: string) {
    super('Sign in with your Gothwad Account');
    this.signinUrl = signinUrl;
  }
}

export function isProductionGothwadHost(hostname = window.location.hostname): boolean {
  const h = hostname.toLowerCase();
  return h === APP_DOMAIN || h.endsWith(`.${APP_DOMAIN}`);
}

export function widgetScriptUrl(): string {
  return `${ACCOUNTS_WEB_ORIGIN}/widget/account-menu.js`;
}

export function manageAccountUrl(authuser = 0): string {
  return `${ACCOUNTS_WEB_ORIGIN}/u/${authuser}/me`;
}

export function addAccountUrl(nextUrl?: string): string {
  const u = new URL(`${ACCOUNTS_WEB_ORIGIN}/signin`);
  u.searchParams.set('add', '1');
  u.searchParams.set('next', nextUrl || window.location.href);
  return u.toString();
}

export function buildGothwadSignInUrl(authuser = 0): string {
  const u = new URL(`${ACCOUNTS_WEB_ORIGIN}/signin`);
  u.searchParams.set('next', window.location.href);
  if (authuser > 0) u.searchParams.set('authuser', String(authuser));
  return u.toString();
}

function buildPreviewSession(authuser: number): SessionPayload {
  const demoAccounts: AccountItem[] = [
    {
      index: 0,
      id: 'a',
      username: 'pawan',
      email: `pawan@${APP_DOMAIN}`,
      name: 'Pawan Gothwad',
      avatarUrl: null,
      active: authuser === 0,
    },
    {
      index: 1,
      id: 'b',
      username: 'alex',
      email: `alex@${APP_DOMAIN}`,
      name: 'Alex Sharma',
      avatarUrl: null,
      active: authuser === 1,
    },
  ];
  const chosen = demoAccounts[authuser] || demoAccounts[0];
  return {
    authenticated: true,
    user: {
      username: chosen.username,
      email: chosen.email,
      name: chosen.name,
      avatarUrl: null,
    },
    authuser: chosen.index,
    activeId: chosen.id,
    accounts: demoAccounts,
    accountUrl: manageAccountUrl(chosen.index),
    source: 'dev',
  };
}

export async function resolveGothwadSession(authuser: number): Promise<SessionPayload> {
  if (!isProductionGothwadHost()) {
    return buildPreviewSession(authuser);
  }

  let res: Response;
  try {
    res = await fetch(`${ACCOUNTS_API_ORIGIN}/api/auth/me?authuser=${authuser}`, {
      method: 'GET',
      credentials: 'include',
      cache: 'no-store',
      headers: {
        Accept: 'application/json',
        'X-Gothwad-Authuser': String(authuser),
      },
    });
  } catch {
    throw new Error('Could not reach Gothwad Accounts. Please check your connection and retry.');
  }

  if (res.status === 401 || res.status === 403) {
    throw new AuthRequiredError(buildGothwadSignInUrl(authuser));
  }

  if (!res.ok) {
    throw new Error(`Gothwad Accounts returned temporary status ${res.status}`);
  }

  const data = (await res.json()) as Record<string, unknown>;
  const userObj = (data.user && typeof data.user === 'object' ? data.user : data) as Record<
    string,
    unknown
  >;
  const username = sanitizeGothwadUsername(String(userObj.username || ''));
  if (!username) {
    throw new AuthRequiredError(buildGothwadSignInUrl(authuser));
  }

  const rawAccounts = Array.isArray(data.accounts) ? data.accounts : [];
  const accounts: AccountItem[] = rawAccounts
    .map((item, idx): AccountItem | null => {
      const a = item as Record<string, unknown>;
      const u = sanitizeGothwadUsername(String(a.username || ''));
      if (!u) return null;
      return {
        index: typeof a.index === 'number' ? a.index : idx,
        id: typeof a.id === 'string' ? a.id : String(idx),
        username: u,
        email: `${u}@${APP_DOMAIN}`,
        name: typeof a.name === 'string' ? a.name : u,
        avatarUrl: typeof a.avatarUrl === 'string' ? a.avatarUrl : null,
        active: u === username,
      };
    })
    .filter((x): x is AccountItem => x !== null);

  return {
    authenticated: true,
    user: {
      username,
      email: `${username}@${APP_DOMAIN}`,
      name: typeof userObj.name === 'string' ? userObj.name : username,
      avatarUrl: typeof userObj.avatarUrl === 'string' ? userObj.avatarUrl : null,
    },
    authuser,
    activeId: typeof data.activeId === 'string' ? data.activeId : null,
    accounts,
    accountUrl: manageAccountUrl(authuser),
    source: 'cookie',
  };
}

export async function switchAccountOnServer(slotId: string): Promise<void> {
  if (!isProductionGothwadHost()) return;
  await fetch(`${ACCOUNTS_API_ORIGIN}/api/auth/switch`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: slotId }),
  }).catch(() => undefined);
}

export async function signOutAccountSlotOnServer(slotId: string): Promise<void> {
  if (!isProductionGothwadHost()) return;
  await fetch(`${ACCOUNTS_API_ORIGIN}/api/auth/accounts/${encodeURIComponent(slotId)}/signout`, {
    method: 'POST',
    credentials: 'include',
  }).catch(() => undefined);
}

export async function signOutAllOnServer(): Promise<void> {
  if (!isProductionGothwadHost()) {
    window.location.href = buildGothwadSignInUrl(0);
    return;
  }
  await fetch(`${ACCOUNTS_API_ORIGIN}/api/auth/signout`, {
    method: 'POST',
    credentials: 'include',
  }).catch(() => undefined);
  window.location.href = buildGothwadSignInUrl(0);
}
