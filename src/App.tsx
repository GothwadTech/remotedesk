import { useCallback, useEffect, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Laptop,
  LogIn,
  Plus,
  Server,
  ShieldCheck,
  Terminal,
} from 'lucide-react';
import type { ActiveConnection, RemoteDevice, SessionPayload, TargetMode } from './types';
import { AuthRequiredError, resolveGothwadSession } from './lib/gothwadAuth';
import { startGothwadOAuthPkce } from './lib/oauthPkce';
import {
  connectP2PDevice,
  discoverDevicesForUser,
  removeBookmarkedPeer,
  triggerVmPowerOnHost,
} from './lib/peerRegistry';
import { Header, type NavTab } from './components/Header';
import { DeviceCard } from './components/DeviceCard';
import { PairDeviceModal } from './components/PairDeviceModal';
import { ShareAccessModal } from './components/ShareAccessModal';
import { PinPromptModal } from './components/PinPromptModal';
import { RemoteViewer } from './components/RemoteViewer';
import { SetupWizard } from './components/SetupWizard';

function readInitialAuthuser(): number {
  const pathMatch = window.location.pathname.match(/^\/u\/([0-5])(?:\b|\/)/);
  if (pathMatch) return Number(pathMatch[1]);
  const q = new URLSearchParams(window.location.search).get('authuser');
  const n = Number(q);
  return Number.isInteger(n) && n >= 0 && n <= 5 ? n : 0;
}

function readInitialTab(): NavTab {
  return window.location.pathname.endsWith('/setup') ? 'setup' : 'access';
}

export function App() {
  const [authuser, setAuthuser] = useState<number>(readInitialAuthuser);
  const [activeTab, setActiveTab] = useState<NavTab>(readInitialTab);
  const [session, setSession] = useState<SessionPayload | null>(null);
  const [devices, setDevices] = useState<RemoteDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [unauthSigninUrl, setUnauthSigninUrl] = useState<string | null>(null);
  const [serviceError, setServiceError] = useState<string | null>(null);

  const [showPairModal, setShowPairModal] = useState(false);
  const [shareDevice, setShareDevice] = useState<RemoteDevice | null>(null);
  const [pinTarget, setPinTarget] = useState<{ device: RemoteDevice; mode: TargetMode } | null>(
    null,
  );
  const [pinError, setPinError] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [lastVerifiedPin, setLastVerifiedPin] = useState<string>('');
  const [activeConnection, setActiveConnection] = useState<ActiveConnection | null>(null);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  const handleChangeTab = (tab: NavTab) => {
    setActiveTab(tab);
    const url = new URL(window.location.href);
    url.pathname = tab === 'setup' ? '/setup' : '/';
    window.history.replaceState({}, '', url.toString());
  };

  const loadAll = useCallback(async (slotIndex: number) => {
    setLoading(true);
    setServiceError(null);
    setUnauthSigninUrl(null);
    try {
      const sess = await resolveGothwadSession(slotIndex);
      setSession(sess);
      const list = await discoverDevicesForUser(sess.user.username);
      setDevices(list);
    } catch (err) {
      if (err instanceof AuthRequiredError) {
        setSession(null);
        setUnauthSigninUrl(err.signinUrl);
      } else {
        setServiceError(err instanceof Error ? err.message : 'Service temporarily unavailable');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAll(authuser);
  }, [authuser, loadAll]);

  const handleSwitchAccount = (nextIndex: number) => {
    const url = new URL(window.location.href);
    url.searchParams.set('authuser', String(nextIndex));
    window.history.replaceState({}, '', url.toString());
    setActiveConnection(null);
    setAuthuser(nextIndex);
  };

  const handlePinSubmit = async (pin: string) => {
    if (!pinTarget || !session) return;
    setConnecting(true);
    setPinError(null);
    try {
      const conn = await connectP2PDevice(
        pinTarget.device,
        pinTarget.mode,
        pin,
        session.user.username,
      );
      setLastVerifiedPin(pin);
      setPinTarget(null);
      setActiveConnection(conn);
    } catch (err) {
      setPinError(err instanceof Error ? err.message : 'Failed to connect');
    } finally {
      setConnecting(false);
    }
  };

  const handleHotSwitchMode = async (nextMode: TargetMode) => {
    if (!activeConnection || !session || activeConnection.targetMode === nextMode) return;
    try {
      activeConnection.p2pHandle?.close();
      const conn = await connectP2PDevice(
        activeConnection.device,
        nextMode,
        lastVerifiedPin,
        session.user.username,
      );
      setActiveConnection(conn);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Cannot switch target mode');
    }
  };

  const handleVmPower = async (
    device: RemoteDevice,
    action: 'start_vm' | 'save_vm' | 'restart_vm',
  ) => {
    setBusyAction(`${device.id}:${action}`);
    try {
      const vmState = await triggerVmPowerOnHost(device, action);
      showToast(`Sent '${action}' to Hyper-V (${device.vmName}) -> ${vmState}`);
      await loadAll(authuser);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Power action failed');
    } finally {
      setBusyAction(null);
    }
  };

  const handleUnlink = (device: RemoteDevice) => {
    if (device.isDemo) {
      showToast('Preview Demo PC resets automatically; real P2P slots unlink via Host CLI.');
      return;
    }
    if (!window.confirm(`Remove '${device.name}' bookmark from this browser?`)) return;
    removeBookmarkedPeer(device.peerId);
    void loadAll(authuser);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <Header
        session={session}
        authuser={authuser}
        activeTab={activeTab}
        loading={loading}
        onChangeTab={handleChangeTab}
        onRefresh={() => void loadAll(authuser)}
        onOpenPairModal={() => setShowPairModal(true)}
        onSwitchAccount={handleSwitchAccount}
      />

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        {unauthSigninUrl && (
          <div className="mx-auto max-w-md rounded-2xl border border-slate-800 bg-slate-900/80 p-8 text-center shadow-2xl">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600/20 text-indigo-400">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <h2 className="mt-4 text-xl font-bold text-white">Sign in with Gothwad Account</h2>
            <p className="mt-2 text-xs text-slate-400">
              100% Zero-Database Cloudflare Pages Portal. Uses your{' '}
              <strong>@gothwadtech.com</strong> SSO cookie + WebRTC P2P HMAC-SHA256 PIN verification.
            </p>
            <div className="mt-6 space-y-2.5">
              <a
                href={unauthSigninUrl}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-500"
              >
                <LogIn className="h-4 w-4" />
                Continue with Gothwad SSO (.gothwadtech.com)
              </a>
              <button
                type="button"
                onClick={() => void startGothwadOAuthPkce()}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-2 text-xs font-medium text-slate-300 hover:border-slate-600 hover:text-white"
              >
                Or Authorize via Gothwad OAuth 2.0 (PKCE S256)
              </button>
            </div>
          </div>
        )}

        {serviceError && (
          <div className="mx-auto max-w-lg rounded-2xl border border-amber-500/30 bg-amber-500/10 p-6 text-center">
            <AlertTriangle className="mx-auto h-7 w-7 text-amber-400" />
            <h3 className="mt-2 text-base font-bold text-white">Temporary Connection Issue</h3>
            <p className="mt-1 text-xs text-amber-200">{serviceError}</p>
            <button
              type="button"
              onClick={() => void loadAll(authuser)}
              className="mt-4 rounded-lg bg-amber-500 px-4 py-2 text-xs font-semibold text-slate-950"
            >
              Retry
            </button>
          </div>
        )}

        {session && !serviceError && activeTab === 'setup' && (
          <SetupWizard
            username={session.user.username}
            userEmail={session.user.email}
            onFinishToDashboard={() => {
              handleChangeTab('access');
              void loadAll(authuser);
            }}
          />
        )}

        {session && !serviceError && activeTab === 'access' && (
          <>
            <div className="mb-6 grid grid-cols-1 gap-3 rounded-2xl border border-slate-800 bg-gradient-to-r from-slate-900 via-indigo-950/30 to-slate-900 p-4 sm:grid-cols-2">
              <div className="flex items-start gap-3">
                <Laptop className="mt-0.5 h-5 w-5 shrink-0 text-sky-400" />
                <div>
                  <div className="text-xs font-bold text-white">
                    Option 1: Main Windows 11 OS Control
                  </div>
                  <p className="mt-0.5 text-[11px] text-slate-400">
                    Chrome Remote Desktop jaisa full system access. Host screen par transparent
                    sharing banner aur Stop button rehta hai.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Server className="mt-0.5 h-5 w-5 shrink-0 text-indigo-400" />
                <div>
                  <div className="text-xs font-bold text-white">
                    Option 2: Headless Hyper-V Background VM
                  </div>
                  <p className="mt-0.5 text-[11px] text-slate-400">
                    Dost apna laptop normal use karta rahe — aap background isolated VM me kaam
                    karo, dost ki screen/mouse bilkul touch nahi hogi!
                  </p>
                </div>
              </div>
            </div>

            {devices.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-900/40 p-10 text-center">
                <Laptop className="mx-auto h-10 w-10 text-slate-600" />
                <h3 className="mt-3 text-base font-bold text-white">
                  No Online Windows PCs Detected Yet
                </h3>
                <p className="mt-1 text-xs text-slate-400">
                  Open the Windows Setup Wizard for step-by-step PowerShell commands to link your
                  first PC via WebRTC P2P (Zero D1 Database!).
                </p>
                <button
                  type="button"
                  onClick={() => handleChangeTab('setup')}
                  className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500"
                >
                  <Plus className="h-4 w-4" />
                  Set Up Windows PC / Hyper-V VM
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {devices.map((dev) => (
                  <DeviceCard
                    key={dev.id}
                    device={dev}
                    busyAction={busyAction}
                    onConnect={(d, mode) => {
                      setPinError(null);
                      setPinTarget({ device: d, mode });
                    }}
                    onVmPower={handleVmPower}
                    onOpenShares={(d) => setShareDevice(d)}
                    onUnlink={handleUnlink}
                  />
                ))}
              </div>
            )}

            <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-600/20 text-indigo-400">
                  <Terminal className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">
                    Set up another Windows computer via PowerShell
                  </h3>
                  <p className="mt-0.5 text-xs text-slate-400">
                    Step-by-step Hyper-V VM builder, Gothwad Account P2P pairing command, aur{' '}
                    <code>.exe</code> installer seedha yahin se copy karein.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleChangeTab('setup')}
                className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-indigo-500"
              >
                Open Windows Setup &amp; Commands
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </>
        )}
      </main>

      {showPairModal && session && (
        <PairDeviceModal
          username={session.user.username}
          onOpenFullGuide={() => {
            setShowPairModal(false);
            handleChangeTab('setup');
          }}
          onClose={() => {
            setShowPairModal(false);
            void loadAll(authuser);
          }}
        />
      )}

      {shareDevice && (
        <ShareAccessModal device={shareDevice} onClose={() => setShareDevice(null)} />
      )}

      {pinTarget && (
        <PinPromptModal
          device={pinTarget.device}
          targetMode={pinTarget.mode}
          error={pinError}
          connecting={connecting}
          onSubmit={handlePinSubmit}
          onClose={() => setPinTarget(null)}
        />
      )}

      {activeConnection && session && (
        <RemoteViewer
          connection={activeConnection}
          viewerEmail={session.user.email}
          onSwitchMode={handleHotSwitchMode}
          onDisconnect={() => {
            activeConnection.p2pHandle?.close();
            setActiveConnection(null);
          }}
        />
      )}

      {toast && (
        <div className="fixed bottom-5 right-5 z-50 rounded-xl border border-indigo-500/40 bg-slate-900 px-4 py-2.5 text-xs font-medium text-white shadow-2xl">
          {toast}
        </div>
      )}
    </div>
  );
}
