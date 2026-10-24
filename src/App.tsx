import { useCallback, useEffect, useState } from 'react';
import { Monitor, Plus, Share2, Terminal } from 'lucide-react';
import type { ActiveConnection, RemoteDevice, SessionPayload, TargetMode } from './types';
import { AuthRequiredError, resolveGothwadSession } from './lib/gothwadAuth';
import {
  connectP2PDevice,
  discoverDevicesForUser,
  removeBookmarkedPeer,
  triggerVmPowerOnHost,
} from './lib/peerRegistry';
import { DeviceCard } from './components/DeviceCard';
import { Header } from './components/Header';
import { PairDeviceModal } from './components/PairDeviceModal';
import { PinPromptModal } from './components/PinPromptModal';
import { RemoteSupportView } from './components/RemoteSupportView';
import { RemoteViewer } from './components/RemoteViewer';
import { SetupRemoteCard } from './components/SetupRemoteCard';
import { SetupWizard } from './components/SetupWizard';
import { ShareAccessModal } from './components/ShareAccessModal';

type NavTab = 'access' | 'support' | 'headless';

const THEME_STORAGE_KEY = 'gothwad_rd_theme';

function getInitialTheme(): 'dark' | 'light' {
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (saved === 'light' || saved === 'dark') return saved;
  } catch {
    // ignore storage errors
  }
  if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: light)').matches) {
    return 'light';
  }
  return 'dark';
}

export function App() {
  const [theme, setTheme] = useState<'dark' | 'light'>(getInitialTheme);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<NavTab>('access');

  const [authuser, setAuthuser] = useState<number>(() => {
    const u = new URLSearchParams(window.location.search).get('authuser');
    return u ? Math.max(0, Math.min(5, Number(u) || 0)) : 0;
  });

  const [session, setSession] = useState<SessionPayload | null>(null);
  const [signinRedirectUrl, setSigninRedirectUrl] = useState<string | null>(null);
  const [devices, setDevices] = useState<RemoteDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [bannerError, setBannerError] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<string | null>(null);

  const [pairModalState, setPairModalState] = useState<{
    open: boolean;
    tab: 'setup' | 'shared';
  }>({ open: false, tab: 'setup' });
  const [shareDevice, setShareDevice] = useState<RemoteDevice | null>(null);

  const [pendingConnect, setPendingConnect] = useState<{
    device: RemoteDevice;
    mode: TargetMode;
  } | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);
  const [activeConnection, setActiveConnection] = useState<ActiveConnection | null>(null);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // ignore
    }
  }, [theme]);

  const loadWorkspace = useCallback(async (slotIndex: number, quiet = false) => {
    if (!quiet) setLoading(true);
    else setRefreshing(true);
    setBannerError(null);

    try {
      const sess = await resolveGothwadSession(slotIndex);
      setSession(sess);
      setSigninRedirectUrl(null);
      const list = await discoverDevicesForUser(sess.user.username);
      setDevices(list);
    } catch (err) {
      if (err instanceof AuthRequiredError) {
        setSession(null);
        setSigninRedirectUrl(err.signinUrl);
      } else {
        setBannerError(err instanceof Error ? err.message : 'Unable to load computers');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadWorkspace(authuser);
  }, [authuser, loadWorkspace]);

  const handleSwitchAccount = (nextIndex: number) => {
    const url = new URL(window.location.href);
    url.searchParams.set('authuser', String(nextIndex));
    window.history.replaceState({}, '', url.toString());
    setAuthuser(nextIndex);
  };

  const handleConfirmConnect = async (pin: string) => {
    if (!pendingConnect || !session) return;
    setConnecting(true);
    setConnectError(null);
    try {
      const conn = await connectP2PDevice(
        pendingConnect.device,
        pendingConnect.mode,
        pin,
        session.user.username,
      );
      setActiveConnection(conn);
      setPendingConnect(null);
    } catch (err) {
      setConnectError(err instanceof Error ? err.message : 'Failed to connect');
    } finally {
      setConnecting(false);
    }
  };

  const handleVmPower = async (
    device: RemoteDevice,
    action: 'start_vm' | 'save_vm' | 'restart_vm',
  ) => {
    setBusyAction(`${device.id}:${action}`);
    try {
      await triggerVmPowerOnHost(device, action);
      await loadWorkspace(authuser, true);
    } catch (err) {
      setBannerError(err instanceof Error ? err.message : 'VM action failed');
    } finally {
      setBusyAction(null);
    }
  };

  const handleRemoveBookmark = (device: RemoteDevice) => {
    removeBookmarkedPeer(device.peerId);
    void loadWorkspace(authuser, true);
  };

  if (activeConnection) {
    return (
      <RemoteViewer
        connection={activeConnection}
        onSwitchMode={(nextMode) => {
          setActiveConnection({
            ...activeConnection,
            targetMode: nextMode,
            hostNoticeActive: nextMode === 'host_os',
          });
        }}
        onDisconnect={() => {
          activeConnection.p2pHandle?.close();
          setActiveConnection(null);
        }}
      />
    );
  }

  const navItems: { id: NavTab; label: string; shortLabel: string; icon: typeof Monitor }[] = [
    { id: 'access', label: 'Remote Access', shortLabel: 'Access', icon: Monitor },
    { id: 'support', label: 'Remote Support', shortLabel: 'Support', icon: Share2 },
    { id: 'headless', label: 'Set up via PowerShell', shortLabel: 'PowerShell', icon: Terminal },
  ];

  const ownedDevice = devices.find((d) => d.role === 'owner') || null;

  return (
    <div className="flex min-h-screen flex-col bg-white text-neutral-900 dark:bg-[#212121] dark:text-neutral-100">
      <Header
        session={session}
        authuser={authuser}
        theme={theme}
        refreshing={refreshing}
        onToggleSidebar={() => setSidebarOpen((v) => !v)}
        onToggleTheme={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
        onRefresh={() => void loadWorkspace(authuser, true)}
        onSwitchAccount={handleSwitchAccount}
        onReloadSession={() => void loadWorkspace(authuser, true)}
      />

      {signinRedirectUrl ? (
        <main className="mx-auto flex flex-1 items-center justify-center px-4 py-16">
          <div className="w-full max-w-sm rounded-2xl border border-neutral-200 bg-white p-7 text-center dark:border-neutral-800 dark:bg-[#262626]">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0494f4]/10 text-[#0494f4]">
              <Monitor className="h-6 w-6" />
            </div>
            <h1 className="text-lg font-medium text-neutral-900 dark:text-neutral-100">
              Sign in to Remote Desktop
            </h1>
            <p className="mt-1.5 text-xs leading-relaxed text-neutral-500 dark:text-neutral-400">
              Access your Windows computers securely from your phone or another PC with your Gothwad
              Account.
            </p>
            <a
              href={signinRedirectUrl}
              className="mt-5 inline-flex w-full items-center justify-center rounded-full bg-[#0494f4] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-[#0382d6]"
            >
              Sign in with Gothwad
            </a>
          </div>
        </main>
      ) : (
        <div className="flex flex-1">
          {/* Desktop Chrome Remote Desktop left navigation rail */}
          <aside
            className={`hidden shrink-0 border-r border-neutral-200 bg-white py-3 transition-all md:flex md:flex-col dark:border-neutral-800 dark:bg-[#212121] ${
              sidebarOpen ? 'w-60 px-3' : 'w-16 items-center px-2'
            }`}
          >
            <nav className="space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActiveTab(item.id)}
                    title={item.label}
                    className={`flex w-full items-center gap-3 rounded-full px-3.5 py-2.5 text-left text-sm font-medium transition ${
                      active
                        ? 'bg-[#0494f4]/12 text-[#0494f4]'
                        : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800 dark:hover:text-white'
                    } ${!sidebarOpen ? 'justify-center px-0 h-10 w-10' : ''}`}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {sidebarOpen && <span className="truncate">{item.label}</span>}
                  </button>
                );
              })}
            </nav>
          </aside>

          {/* Main content area */}
          <main className="min-w-0 flex-1 px-4 pt-6 pb-24 sm:px-6 md:pb-12">
            {bannerError && (
              <div className="mx-auto mb-5 max-w-3xl rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
                {bannerError}
              </div>
            )}

            {activeTab === 'access' && (
              <div className="mx-auto max-w-3xl space-y-5">
                {/* Card 1: Remote devices */}
                <section className="overflow-hidden rounded-2xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-[#262626]">
                  <div className="flex items-center justify-between border-b border-neutral-200 px-4 py-3.5 sm:px-5 dark:border-neutral-800">
                    <h2 className="text-sm font-medium text-neutral-900 sm:text-base dark:text-neutral-100">
                      Remote devices
                    </h2>
                    <button
                      type="button"
                      onClick={() => setPairModalState({ open: true, tab: 'shared' })}
                      className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium text-[#0494f4] transition hover:bg-[#0494f4]/10"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Add shared PC
                    </button>
                  </div>

                  {loading ? (
                    <div className="space-y-3 p-5">
                      <div className="h-12 animate-pulse rounded-xl bg-neutral-100 dark:bg-neutral-800/70" />
                    </div>
                  ) : devices.length === 0 ? (
                    <div className="px-5 py-10 text-center">
                      <p className="text-sm font-medium text-neutral-700 dark:text-neutral-200">
                        No remote computers are online
                      </p>
                      <p className="mx-auto mt-1 max-w-md text-xs text-neutral-500 dark:text-neutral-400">
                        Turn on remote access on your Windows computer below, or add a computer
                        shared with your Gothwad Account.
                      </p>
                    </div>
                  ) : (
                    <div className="divide-y divide-neutral-200 dark:divide-neutral-800">
                      {devices.map((dev) => (
                        <DeviceCard
                          key={dev.id}
                          device={dev}
                          busyAction={busyAction}
                          onConnect={(device, mode) => {
                            setConnectError(null);
                            setPendingConnect({ device, mode });
                          }}
                          onVmPower={(device, act) => void handleVmPower(device, act)}
                          onOpenShare={(device) => setShareDevice(device)}
                          onRemoveBookmark={handleRemoveBookmark}
                        />
                      ))}
                    </div>
                  )}
                </section>

                {/* Card 2: Exact Chrome Remote Desktop inline setup card */}
                <SetupRemoteCard
                  currentUsername={session?.user.username || 'user'}
                  onFinished={() => void loadWorkspace(authuser, true)}
                />
              </div>
            )}

            {activeTab === 'support' && (
              <RemoteSupportView
                currentUsername={session?.user.username || 'user'}
                ownedDevice={ownedDevice}
                onOpenShareModal={(dev) => setShareDevice(dev)}
                onOpenSetup={() => setActiveTab('headless')}
                onConnectedBookmark={() => {
                  setActiveTab('access');
                  void loadWorkspace(authuser, true);
                }}
              />
            )}

            {activeTab === 'headless' && (
              <SetupWizard
                currentUsername={session?.user.username || 'user'}
                onFinish={() => {
                  setActiveTab('access');
                  void loadWorkspace(authuser, true);
                }}
              />
            )}
          </main>

          {/* Mobile fixed bottom navigation bar */}
          <nav
            aria-label="Primary navigation"
            className="fixed inset-x-0 bottom-0 z-30 flex h-16 items-center justify-around border-t border-neutral-200 bg-white px-2 md:hidden dark:border-neutral-800 dark:bg-[#212121]"
          >
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  className={`flex flex-1 flex-col items-center justify-center gap-1 py-1.5 text-[11px] font-medium transition ${
                    active
                      ? 'text-[#0494f4]'
                      : 'text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100'
                  }`}
                >
                  <span
                    className={`flex h-7 w-12 items-center justify-center rounded-full transition ${
                      active ? 'bg-[#0494f4]/15' : ''
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <span>{item.shortLabel}</span>
                </button>
              );
            })}
          </nav>
        </div>
      )}

      <PairDeviceModal
        open={pairModalState.open}
        initialTab={pairModalState.tab}
        currentUsername={session?.user.username || 'user'}
        onClose={() => setPairModalState((s) => ({ ...s, open: false }))}
        onOpenPowerShellSetup={() => setActiveTab('headless')}
        onPaired={() => void loadWorkspace(authuser, true)}
      />

      <ShareAccessModal device={shareDevice} onClose={() => setShareDevice(null)} />

      <PinPromptModal
        key={pendingConnect ? `${pendingConnect.device.id}:${pendingConnect.mode}` : 'closed'}
        device={pendingConnect?.device || null}
        targetMode={pendingConnect?.mode || 'host_os'}
        connecting={connecting}
        error={connectError}
        onChangeMode={(mode) =>
          setPendingConnect((prev) => (prev ? { ...prev, mode } : null))
        }
        onClose={() => setPendingConnect(null)}
        onConfirm={(pin) => void handleConfirmConnect(pin)}
      />
    </div>
  );
}
