import { Menu, Monitor, Moon, RefreshCw, Sun } from 'lucide-react';
import type { SessionPayload } from '../types';
import { AccountMenu } from './AccountMenu';

interface HeaderProps {
  session: SessionPayload | null;
  authuser: number;
  theme: 'dark' | 'light';
  refreshing: boolean;
  onToggleSidebar: () => void;
  onToggleTheme: () => void;
  onRefresh: () => void;
  onSwitchAccount: (index: number) => void;
  onReloadSession: () => void;
}

export function Header({
  session,
  authuser,
  theme,
  refreshing,
  onToggleSidebar,
  onToggleTheme,
  onRefresh,
  onSwitchAccount,
  onReloadSession,
}: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-neutral-200 bg-white px-3 sm:px-5 dark:border-neutral-800 dark:bg-[#212121]">
      <div className="flex items-center gap-2 sm:gap-3">
        <button
          type="button"
          onClick={onToggleSidebar}
          aria-label="Toggle navigation menu"
          className="hidden h-9 w-9 items-center justify-center rounded-full text-neutral-600 transition hover:bg-neutral-100 md:inline-flex dark:text-neutral-300 dark:hover:bg-neutral-800"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#0494f4] text-white">
            <Monitor className="h-4 w-4" />
          </div>
          <span className="text-base font-medium tracking-tight text-neutral-900 sm:text-lg dark:text-neutral-100">
            Remote Desktop
          </span>
        </div>
      </div>

      <div className="flex items-center gap-1.5 sm:gap-2">
        <button
          type="button"
          onClick={onRefresh}
          disabled={refreshing}
          aria-label="Refresh computers"
          title="Refresh computers"
          className="inline-flex h-9 w-9 items-center justify-center rounded-full text-neutral-600 transition hover:bg-neutral-100 disabled:opacity-50 dark:text-neutral-300 dark:hover:bg-neutral-800"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
        </button>

        <button
          type="button"
          onClick={onToggleTheme}
          aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
          title={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
          className="inline-flex h-9 w-9 items-center justify-center rounded-full text-neutral-600 transition hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
        >
          {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>

        <div className="ml-1">
          <AccountMenu
            session={session}
            authuser={authuser}
            onSwitchAccount={onSwitchAccount}
            onReloadSession={onReloadSession}
          />
        </div>
      </div>
    </header>
  );
}
