// Universal Google-style Gothwad Account Menu loader + offline Shadow DOM fallback
// Loads https://accounts.gothwadtech.com/widget/account-menu.js in production and guarantees
// window.GothwadAccountMenu is always available even in offline dev / CI environments.
import {
  ACCOUNTS_API_ORIGIN,
  ACCOUNTS_WEB_ORIGIN,
  addAccountUrl,
  ECOSYSTEM_NAME,
  manageAccountUrl,
  widgetScriptUrl,
} from '../lib/gothwadAuth';

export interface WidgetAccountItem {
  id: string;
  authuser: number;
  username: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  email: string;
  avatarUrl?: string | null;
  active?: boolean;
}

export interface WidgetMenuState {
  user: WidgetAccountItem | null;
  accounts: WidgetAccountItem[];
  activeId?: string | null;
  authuser?: number;
}

export interface WidgetExtraAction {
  id?: string;
  label: string;
  href?: string;
  target?: string;
  onClick?: () => void;
}

export interface WidgetMenuOptions {
  anchorEl?: HTMLElement | null;
  appDomain?: string;
  accountsWebOrigin?: string;
  accountsApiOrigin?: string;
  ecosystemName?: string;
  authuser?: number;
  nextUrl?: string;
  manageAccountHref?: string;
  extraActions?: WidgetExtraAction[];
  onSwitchAccount?: (acc: WidgetAccountItem, index: number) => void | Promise<void>;
  onSignOutAccount?: (
    slotOrAccount: string | WidgetAccountItem,
    account?: WidgetAccountItem | null,
  ) => void | Promise<void>;
  onSignOutAll?: () => void | Promise<void>;
  onClose?: () => void;
}

export interface GothwadAccountMenuGlobal {
  open: (state: WidgetMenuState, opts?: WidgetMenuOptions) => void;
  update: (state: WidgetMenuState, opts?: WidgetMenuOptions) => void;
  close: () => void;
  isOpen: () => boolean;
}

declare global {
  interface Window {
    GothwadAccountMenu?: GothwadAccountMenuGlobal;
  }
}

const AVATAR_PALETTE = ['#0494f4', '#1e8e3e', '#d93025', '#9334e6', '#e37400', '#00897b'];

function esc(v: unknown): string {
  return String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function pickAvatarColor(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i += 1) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return AVATAR_PALETTE[Math.abs(h) % AVATAR_PALETTE.length];
}

function createLocalFallbackMenu(): GothwadAccountMenuGlobal {
  let hostEl: HTMLElement | null = null;
  let shadow: ShadowRoot | null = null;
  let expanded = true;

  function close(): void {
    if (hostEl) {
      hostEl.remove();
      hostEl = null;
      shadow = null;
    }
  }

  function render(state: WidgetMenuState, opts: WidgetMenuOptions = {}): void {
    if (typeof document === 'undefined' || !state.user) return;
    if (!hostEl) {
      hostEl = document.createElement('div');
      hostEl.id = 'gothwad-account-menu-host';
      shadow = hostEl.attachShadow({ mode: 'open' });
      document.body.appendChild(hostEl);
    }
    if (!shadow) return;

    const isDark = document.documentElement.classList.contains('dark');
    const u = state.user;
    const webOrigin = (opts.accountsWebOrigin || ACCOUNTS_WEB_ORIGIN).replace(/\/+$/, '');
    const ecosystem = opts.ecosystemName || ECOSYSTEM_NAME;
    const au = typeof opts.authuser === 'number' ? opts.authuser : (state.authuser ?? 0);
    const manageHref = opts.manageAccountHref || manageAccountUrl(au);
    const firstName = u.firstName || (u.name || u.username).split(' ')[0] || u.username;
    const initial = (firstName[0] || u.username[0] || 'G').toUpperCase();
    const otherAccounts = (state.accounts || []).filter(
      (a) => a.username.toLowerCase() !== u.username.toLowerCase(),
    );
    const addHref = addAccountUrl(opts.nextUrl);
    const rect = opts.anchorEl?.getBoundingClientRect();
    const topPx = rect
      ? Math.min(window.innerHeight - 460, Math.max(12, Math.round(rect.bottom + 10)))
      : 60;
    const rightPx = rect ? Math.max(12, Math.round(window.innerWidth - rect.right)) : 16;

    const sheetBg = isDark ? '#2a2a2a' : '#f8fafd';
    const cardBg = isDark ? '#1e1e1e' : '#ffffff';
    const textMain = isDark ? '#f1f1f1' : '#1f1f1f';
    const textSub = isDark ? '#a3a3a3' : '#5f6368';
    const borderCol = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';
    const hoverBg = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)';
    const manageCol = isDark ? '#a8c7fa' : '#0b57d0';

    shadow.innerHTML = `
      <style>
        .backdrop { position: fixed; inset: 0; z-index: 2147483646; background: rgba(0,0,0,0.28); }
        .sheet {
          position: fixed; top: ${topPx}px; right: ${rightPx}px; z-index: 2147483647;
          width: min(372px, calc(100vw - 24px)); border-radius: 28px;
          background: ${sheetBg}; color: ${textMain}; font-family: system-ui, -apple-system, sans-serif;
          box-shadow: 0 12px 40px rgba(0,0,0,0.36); border: 1px solid ${borderCol};
          padding: 16px; box-sizing: border-box;
        }
        .top-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
        .email { font-size: 13px; font-weight: 500; color: ${textSub}; text-align: center; flex: 1; padding-left: 28px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .close-btn { background: transparent; border: 0; color: ${textSub}; width: 28px; height: 28px; border-radius: 999px; cursor: pointer; font-size: 16px; }
        .close-btn:hover { background: ${hoverBg}; color: ${textMain}; }
        .hero { display: flex; flex-direction: column; align-items: center; text-align: center; margin-bottom: 14px; }
        .avatar-lg { width: 74px; height: 74px; border-radius: 999px; display: grid; place-items: center; font-size: 28px; font-weight: 600; color: #fff; overflow: hidden; margin-bottom: 10px; background: ${pickAvatarColor(u.username)}; }
        .avatar-lg img { width: 100%; height: 100%; object-fit: cover; }
        .greeting { font-size: 20px; font-weight: 500; color: ${textMain}; margin: 0 0 12px; }
        .manage-btn { display: inline-flex; align-items: center; justify-content: center; padding: 8px 20px; border-radius: 999px; border: 1px solid ${borderCol}; color: ${manageCol}; text-decoration: none; font-size: 13px; font-weight: 500; background: ${cardBg}; }
        .manage-btn:hover { background: ${hoverBg}; }
        .card { background: ${cardBg}; border-radius: 20px; overflow: hidden; margin-top: 8px; border: 1px solid ${borderCol}; }
        .acc-toggle, .action-row { width: 100%; display: flex; align-items: center; gap: 12px; padding: 12px 16px; background: transparent; border: 0; border-bottom: 1px solid ${borderCol}; color: ${textMain}; font-size: 13px; text-align: left; text-decoration: none; cursor: pointer; box-sizing: border-box; }
        .acc-toggle:hover, .action-row:hover, .slot-switch:hover { background: ${hoverBg}; }
        .slot-item { display: flex; align-items: center; border-bottom: 1px solid ${borderCol}; padding-right: 10px; }
        .slot-switch { flex: 1; min-width: 0; display: flex; align-items: center; gap: 12px; padding: 10px 16px; background: transparent; border: 0; color: ${textMain}; text-align: left; cursor: pointer; }
        .slot-signout { background: transparent; border: 1px solid ${borderCol}; color: ${textSub}; border-radius: 999px; padding: 4px 10px; font-size: 11px; cursor: pointer; flex-shrink: 0; }
        .action-row:last-child { border-bottom: 0; }
        .avatar-sm { width: 32px; height: 32px; border-radius: 999px; display: grid; place-items: center; font-size: 13px; font-weight: 600; color: #fff; overflow: hidden; flex-shrink: 0; }
        .avatar-sm img { width: 100%; height: 100%; object-fit: cover; }
        .slot-meta { flex: 1; min-width: 0; }
        .slot-name { display: block; font-weight: 500; color: ${textMain}; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .slot-email { display: block; font-size: 11px; color: ${textSub}; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .footer { display: flex; justify-content: center; gap: 10px; margin-top: 12px; font-size: 11px; color: ${textSub}; }
        .footer a { color: ${textSub}; text-decoration: none; }
      </style>
      <div class="backdrop" data-action="close"></div>
      <div class="sheet" role="dialog" aria-label="${esc(ecosystem)} Account menu">
        <div class="top-row">
          <div class="email">${esc(u.email)}</div>
          <button class="close-btn" data-action="close" aria-label="Close">✕</button>
        </div>
        <div class="hero">
          <div class="avatar-lg">
            ${u.avatarUrl ? `<img src="${esc(u.avatarUrl)}" alt="${esc(u.name || u.username)}" />` : esc(initial)}
          </div>
          <p class="greeting">Hi, ${esc(firstName)}!</p>
          <a class="manage-btn" href="${esc(manageHref)}" target="_blank" rel="noopener">Manage your ${esc(ecosystem)} Account</a>
        </div>
        <div class="card">
          ${
            otherAccounts.length > 0
              ? `<button class="acc-toggle" data-action="toggle-expand">
                  <span style="flex:1;font-weight:500">${expanded ? 'Hide more accounts' : 'Show more accounts'}</span>
                  <span>${expanded ? '▴' : '▾'}</span>
                </button>`
              : ''
          }
          ${
            expanded
              ? otherAccounts
                  .map(
                    (acc, idx) => `
                  <div class="slot-item">
                    <button class="slot-switch" data-action="switch" data-idx="${idx}">
                      <span class="avatar-sm" style="background:${pickAvatarColor(acc.username)}">
                        ${acc.avatarUrl ? `<img src="${esc(acc.avatarUrl)}" alt="" />` : esc((acc.name || acc.username || 'G')[0].toUpperCase())}
                      </span>
                      <span class="slot-meta">
                        <span class="slot-name">${esc(acc.name || acc.username)}</span>
                        <span class="slot-email">${esc(acc.email)}</span>
                      </span>
                    </button>
                    <button class="slot-signout" data-action="signout-slot" data-slot-id="${esc(acc.id)}" data-idx="${idx}">Sign out</button>
                  </div>`,
                  )
                  .join('')
              : ''
          }
          ${(opts.extraActions || [])
            .map((act, i) => `<a class="action-row" href="${esc(act.href || '#')}" data-extra="${i}"><span>${esc(act.label)}</span></a>`)
            .join('')}
          <a class="action-row" href="${esc(addHref)}"><span>＋ Add another account</span></a>
          <button class="action-row" data-action="signout-all">
            <span>⇥ ${otherAccounts.length > 0 ? 'Sign out of all accounts' : 'Sign out'}</span>
          </button>
        </div>
        <div class="footer">
          <a href="${esc(webOrigin)}/privacy" target="_blank" rel="noopener">Privacy Policy</a>
          <span>•</span>
          <a href="${esc(webOrigin)}/terms" target="_blank" rel="noopener">Terms of Service</a>
        </div>
      </div>
    `;

    shadow.querySelectorAll('[data-action="close"]').forEach((el) =>
      el.addEventListener('click', () => {
        close();
        opts.onClose?.();
      }),
    );
    shadow.querySelector('[data-action="toggle-expand"]')?.addEventListener('click', () => {
      expanded = !expanded;
      render(state, opts);
    });
    shadow.querySelectorAll('[data-action="switch"]').forEach((el) =>
      el.addEventListener('click', async () => {
        const idx = Number((el as HTMLElement).dataset.idx ?? 0);
        const target = otherAccounts[idx];
        close();
        if (target && opts.onSwitchAccount) await opts.onSwitchAccount(target, target.authuser);
      }),
    );
    shadow.querySelectorAll('[data-action="signout-slot"]').forEach((el) =>
      el.addEventListener('click', async () => {
        const btn = el as HTMLElement;
        const idx = Number(btn.dataset.idx ?? 0);
        const target = otherAccounts[idx] ?? null;
        const slotId = btn.dataset.slotId || target?.id || '';
        close();
        if (slotId && opts.onSignOutAccount) await opts.onSignOutAccount(slotId, target);
      }),
    );
    shadow.querySelectorAll('[data-extra]').forEach((el) =>
      el.addEventListener('click', (e) => {
        const idx = Number((el as HTMLElement).dataset.extra ?? 0);
        const action = opts.extraActions?.[idx];
        close();
        if (typeof action?.onClick === 'function') {
          e.preventDefault();
          action.onClick();
        }
      }),
    );
    shadow.querySelector('[data-action="signout-all"]')?.addEventListener('click', async () => {
      close();
      await opts.onSignOutAll?.();
    });
  }

  return {
    open: (state, opts) => render(state, opts),
    update: (state, opts) => render(state, opts),
    close,
    isOpen: () => Boolean(hostEl),
  };
}

let scriptPromise: Promise<GothwadAccountMenuGlobal> | null = null;

export function ensureGothwadAccountMenu(): Promise<GothwadAccountMenuGlobal> {
  if (typeof window === 'undefined') return Promise.resolve(createLocalFallbackMenu());
  if (!window.GothwadAccountMenu) window.GothwadAccountMenu = createLocalFallbackMenu();
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise<GothwadAccountMenuGlobal>((resolve) => {
    const src = widgetScriptUrl();
    if (document.querySelector(`script[data-gothwad-account-menu="${src}"]`)) {
      resolve(window.GothwadAccountMenu!);
      return;
    }
    const script = document.createElement('script');
    script.type = 'module';
    script.src = src;
    script.async = true;
    script.dataset.gothwadAccountMenu = src;
    script.onload = () => resolve(window.GothwadAccountMenu!);
    script.onerror = () => resolve(window.GothwadAccountMenu!);
    document.head.appendChild(script);
  });

  return scriptPromise;
}

export { ACCOUNTS_API_ORIGIN, ACCOUNTS_WEB_ORIGIN };
