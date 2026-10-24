import { useState } from 'react';
import {
  ChevronDown,
  ExternalLink,
  Monitor,
  Plus,
  RefreshCw,
  ShieldCheck,
  Terminal,
} from 'lucide-react';
import type { SessionPayload } from '../types';

export type NavTab = 'access' | 'setup';

interface HeaderProps {
  session: SessionPayload | null;
  authuser: number;
  activeTab: NavTab;
  loading: boolean;
  onChangeTab: (tab: NavTab) => void;
  onRefresh: () => void;
  onOpenPairModal: () => void;
  onSwitchAccount: (index: number) => void;
}

export function Header({
  session,
  authuser,
  activeTab,
  loading,
  onChangeTab,
  onRefresh,
  onOpenPairModal,
  onSwitchAccount,
}: HeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  const initials = (session?.user.name || session?.user.username || 'G')
    .split(/\s+/)
    .map((p) => p[0]?.toUpperCase() || '')
    .slice(0, 2)
    .join('');

  return (
    <header className="sticky top-0 z-30 border-b border-slate-800/80 bg-slate-950/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-5">
          <button
            type="button"
            onClick={() => onChangeTab('access')}
            className="flex items-center gap-3 text-left"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-500/20">
              <Monitor className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold tracking-tight text-white sm:text-lg">
                  Gothwad Remote Desktop
                </h1>
                <span className="hidden rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-300 lg:inline-flex items-center gap-1">
                  <ShieldCheck className="h-3 w-3" />
                  Gothwad SSO
                </span>
              </div>
              <p className="text-[11px] text-slate-400">remotedesktop.gothwadtech.com</p>
            </div>
          </button>

          {/* Google-Remote-Desktop Style Navigation Tabs */}
          {session && (
            <nav className="flex items-center rounded-xl border border-slate-800 bg-slate-900/80 p-1 text-xs">
              <button
                type="button"
                onClick={() => onChangeTab('access')}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-semibold transition ${
                  activeTab === 'access'
                    ? 'bg-indigo-600 text-white shadow'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <Monitor className="h-3.5 w-3.5" />
                Remote Access
              </button>
              <button
                type="button"
                onClick={() => onChangeTab('setup')}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-semibold transition ${
                  activeTab === 'setup'
                    ? 'bg-indigo-600 text-white shadow'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <Terminal className="h-3.5 w-3.5" />
                Windows Setup &amp; Commands
              </button>
            </nav>
          )}
        </div>

        <div className="flex items-center gap-2 sm:gap-2.5">
          <button
            type="button"
            onClick={onRefresh}
            title="Refresh remote devices"
            className="rounded-lg border border-slate-800 bg-slate-900 p-2 text-slate-300 transition hover:border-slate-700 hover:text-white"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin text-indigo-400' : ''}`} />
          </button>

          <button
            type="button"
            onClick={onOpenPairModal}
            className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-500/40 bg-indigo-600/20 px-3 py-2 text-xs font-semibold text-indigo-200 transition hover:bg-indigo-600 hover:text-white"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Quick Pair Code</span>
          </button>

          {session && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setMenuOpen((v) => !v)}
                className="flex items-center gap-2 rounded-full border border-slate-800 bg-slate-900 py-1 pl-1.5 pr-2.5 text-left transition hover:border-slate-700"
              >
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-500/20 text-xs font-bold text-indigo-300">
                  {initials}
                </div>
                <div className="hidden md:block">
                  <div className="text-xs font-medium text-slate-100 leading-none">
                    {session.user.username}
                  </div>
                  <div className="text-[10px] text-slate-400">u/{authuser}</div>
                </div>
                <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
              </button>

              {menuOpen && (
                <div className="absolute right-0 mt-2 w-72 rounded-2xl border border-slate-800 bg-slate-900 p-3 shadow-2xl">
                  <div className="border-b border-slate-800 pb-2.5">
                    <div className="text-sm font-semibold text-white">
                      {session.user.name || session.user.username}
                    </div>
                    <div className="text-xs text-slate-400">{session.user.email}</div>
                    {session.source === 'dev' && (
                      <span className="mt-1.5 inline-block rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-medium text-amber-300">
                        Preview / Local Dev Session
                      </span>
                    )}
                  </div>

                  {session.accounts.length > 0 && (
                    <div className="py-2">
                      <div className="px-2 pb-1 text-[11px] font-medium uppercase tracking-wider text-slate-500">
                        Switch Gothwad Account (u/0..5)
                      </div>
                      {session.accounts.map((acc) => (
                        <button
                          key={acc.id}
                          type="button"
                          onClick={() => {
                            setMenuOpen(false);
                            onSwitchAccount(acc.index);
                          }}
                          className={`flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left text-xs transition ${
                            acc.index === authuser
                              ? 'bg-indigo-500/15 text-indigo-200'
                              : 'text-slate-300 hover:bg-slate-800'
                          }`}
                        >
                          <div>
                            <div className="font-medium">{acc.email}</div>
                            <div className="text-[10px] text-slate-400">
                              Slot u/{acc.index} · {acc.name}
                            </div>
                          </div>
                          {acc.index === authuser && (
                            <span className="rounded bg-indigo-500/30 px-1.5 py-0.5 text-[10px] font-semibold">
                              Active
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}

                  <div className="border-t border-slate-800 pt-2">
                    <a
                      href={session.accountUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-between rounded-lg px-2 py-1.5 text-xs text-slate-300 hover:bg-slate-800 hover:text-white"
                    >
                      <span>Manage Gothwad Account</span>
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
