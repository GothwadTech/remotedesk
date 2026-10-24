import { useEffect, useRef } from 'react';
import type { SessionPayload } from '../types';
import {
  ACCOUNTS_API_ORIGIN,
  ACCOUNTS_WEB_ORIGIN,
  APP_DOMAIN,
  buildGothwadSignInUrl,
  ECOSYSTEM_NAME,
  manageAccountUrl,
  signOutAccountSlotOnServer,
  signOutAllOnServer,
  switchAccountOnServer,
} from '../lib/gothwadAuth';
import {
  ensureGothwadAccountMenu,
  pickAvatarColor,
  type WidgetAccountItem,
} from './gothwadAccountMenuFallback';

interface AccountMenuProps {
  session: SessionPayload | null;
  authuser: number;
  onSwitchAccount: (index: number) => void;
  onReloadSession: () => void;
}

export function AccountMenu({
  session,
  authuser,
  onSwitchAccount,
  onReloadSession,
}: AccountMenuProps) {
  const btnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (session) void ensureGothwadAccountMenu();
  }, [session]);

  if (!session) {
    return (
      <a
        href={buildGothwadSignInUrl(authuser)}
        className="inline-flex items-center justify-center rounded-full bg-[#0494f4] px-4 py-1.5 text-sm font-medium text-white transition hover:bg-[#0382d6]"
      >
        Sign in
      </a>
    );
  }

  const extraCount = Math.max(0, session.accounts.length - 1);
  const fullName = session.user.name || session.user.username;
  const initial = (fullName[0] || session.user.username[0] || 'G').toUpperCase();

  const handleOpen = async () => {
    const widget = await ensureGothwadAccountMenu();
    if (widget.isOpen()) {
      widget.close();
      return;
    }

    const mappedAccounts: WidgetAccountItem[] = (
      session.accounts.length > 0
        ? session.accounts
        : [
            {
              index: authuser,
              id: session.activeId || 'a',
              username: session.user.username,
              email: session.user.email,
              name: fullName,
              avatarUrl: session.user.avatarUrl,
              active: true,
            },
          ]
    ).map((acc) => {
      const n = acc.name || acc.username;
      const parts = n.split(' ');
      return {
        id: acc.id,
        authuser: acc.index,
        username: acc.username,
        firstName: parts[0] || acc.username,
        lastName: parts.slice(1).join(' '),
        name: n,
        email: acc.email,
        avatarUrl: acc.avatarUrl,
        active: acc.active,
      };
    });

    const userParts = fullName.split(' ');
    const currentUserItem: WidgetAccountItem = {
      id: session.activeId || 'a',
      authuser,
      username: session.user.username,
      firstName: userParts[0] || session.user.username,
      lastName: userParts.slice(1).join(' '),
      name: fullName,
      email: session.user.email,
      avatarUrl: session.user.avatarUrl,
      active: true,
    };

    widget.open(
      {
        user: currentUserItem,
        accounts: mappedAccounts,
        activeId: session.activeId || currentUserItem.id,
        authuser,
      },
      {
        anchorEl: btnRef.current,
        appDomain: APP_DOMAIN,
        accountsWebOrigin: ACCOUNTS_WEB_ORIGIN,
        accountsApiOrigin: ACCOUNTS_API_ORIGIN,
        ecosystemName: ECOSYSTEM_NAME,
        authuser,
        nextUrl: window.location.href,
        manageAccountHref: manageAccountUrl(authuser),
        onSwitchAccount: async (acc) => {
          await switchAccountOnServer(acc.id);
          onSwitchAccount(acc.authuser);
        },
        onSignOutAccount: async (slotOrAcc) => {
          const slotId = typeof slotOrAcc === 'string' ? slotOrAcc : slotOrAcc.id;
          if (slotId) {
            await signOutAccountSlotOnServer(slotId);
            onReloadSession();
          }
        },
        onSignOutAll: async () => {
          await signOutAllOnServer();
        },
      },
    );
  };

  return (
    <button
      ref={btnRef}
      type="button"
      onClick={() => void handleOpen()}
      aria-haspopup="dialog"
      aria-label={`Account (${session.user.email})`}
      title={`${fullName} (${session.user.email})`}
      className="relative flex h-9 items-center rounded-full transition hover:opacity-90"
    >
      {extraCount > 0 && (
        <span className="-mr-2.5 flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-neutral-400 text-[10px] font-bold text-white dark:border-[#212121] dark:bg-neutral-600">
          +{extraCount}
        </span>
      )}
      <span
        className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full text-sm font-bold text-white shadow-xs"
        style={{ backgroundColor: pickAvatarColor(session.user.username) }}
      >
        {session.user.avatarUrl ? (
          <img
            src={session.user.avatarUrl}
            alt=""
            className="h-full w-full object-cover"
            referrerPolicy="no-referrer"
          />
        ) : (
          initial
        )}
      </span>
    </button>
  );
}
