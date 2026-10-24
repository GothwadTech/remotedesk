import { useState } from 'react';
import { CheckCircle2, Download } from 'lucide-react';

interface SetupRemoteCardProps {
  currentUsername: string;
  onFinished: () => void;
}

export const HOST_SETUP_EXE_URL =
  'https://github.com/GothwadTech/remotedesk/releases/latest/download/GothwadRemoteHostSetup.exe';

type InlineStep = 'download' | 'install' | 'name' | 'pin' | 'launched';

export function SetupRemoteCard({ currentUsername, onFinished }: SetupRemoteCardProps) {
  const [step, setStep] = useState<InlineStep>('download');
  const [pcName, setPcName] = useState('Home-Windows-PC');
  const [slot, setSlot] = useState(1);
  const [pin, setPin] = useState('');
  const [pinConfirm, setPinConfirm] = useState('');
  const [pinError, setPinError] = useState<string | null>(null);

  const triggerDownload = () => {
    const a = document.createElement('a');
    a.href = HOST_SETUP_EXE_URL;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setStep('install');
  };

  const handleLaunchProtocol = (e: React.FormEvent) => {
    e.preventDefault();
    const p1 = pin.trim();
    const p2 = pinConfirm.trim();
    if (!/^\d{6,12}$/.test(p1)) {
      setPinError('PIN must be 6 to 12 numeric digits.');
      return;
    }
    if (p1 !== p2) {
      setPinError('PIN entries do not match.');
      return;
    }
    setPinError(null);
    const params = new URLSearchParams({
      owner: currentUsername,
      slot: String(slot),
      name: pcName.trim() || 'Home-Windows-PC',
      pin: p1,
    });
    window.location.href = `gothwad-remote://setup?${params.toString()}`;
    setStep('launched');
    setTimeout(() => onFinished(), 2500);
  };

  return (
    <section className="overflow-hidden rounded-2xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-[#262626]">
      <div className="border-b border-neutral-200 px-4 py-3.5 sm:px-5 dark:border-neutral-800">
        <h2 className="text-sm font-medium text-neutral-900 sm:text-base dark:text-neutral-100">
          Set up remote access
        </h2>
      </div>

      {step === 'download' && (
        <div className="flex flex-col justify-between gap-4 p-4 sm:flex-row sm:items-center sm:p-5">
          <div className="flex items-start gap-3.5">
            <button
              type="button"
              onClick={triggerDownload}
              aria-label="Download Windows Host Installer"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#0494f4] text-white shadow-xs transition hover:bg-[#0382d6]"
            >
              <Download className="h-5 w-5" />
            </button>
            <div>
              <h3 className="text-sm font-medium text-neutral-900 sm:text-[15px] dark:text-neutral-100">
                Turn on remote access on this computer
              </h3>
              <p className="mt-0.5 text-xs leading-relaxed text-neutral-500 dark:text-neutral-400">
                Download and open <strong>GothwadRemoteHostSetup.exe</strong> on Windows 11 — just
                like Chrome Remote Desktop.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={triggerDownload}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-[#0494f4] px-4 py-2 text-xs font-medium text-white transition hover:bg-[#0382d6]"
          >
            <Download className="h-3.5 w-3.5" />
            Turn on
          </button>
        </div>
      )}

      {step === 'install' && (
        <div className="space-y-3.5 p-4 sm:p-5">
          <div className="space-y-1">
            <h3 className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
              1. Run GothwadRemoteHostSetup.exe
            </h3>
            <p className="text-xs leading-relaxed text-neutral-500 dark:text-neutral-400">
              Open <strong>GothwadRemoteHostSetup.exe</strong> from your browser downloads and
              approve the Windows Administrator prompt. You can complete setup inside the app window
              or click <strong>Accept &amp; Configure</strong> below.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <a
              href={HOST_SETUP_EXE_URL}
              target="_blank"
              rel="noreferrer"
              className="text-xs font-medium text-[#0494f4] hover:underline"
            >
              Download installer again
            </a>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setStep('download')}
                className="rounded-full px-4 py-1.5 text-xs font-medium text-neutral-600 transition hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => setStep('name')}
                className="rounded-full bg-[#0494f4] px-4 py-1.5 text-xs font-medium text-white transition hover:bg-[#0382d6]"
              >
                Accept &amp; Configure
              </button>
            </div>
          </div>
        </div>
      )}

      {step === 'name' && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setStep('pin');
          }}
          className="space-y-3.5 p-4 sm:p-5"
        >
          <h3 className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
            2. Choose a name
          </h3>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs text-neutral-500 dark:text-neutral-400">
                Computer name
              </label>
              <input
                type="text"
                required
                autoFocus
                value={pcName}
                onChange={(e) => setPcName(e.target.value)}
                className="w-full rounded-xl border border-neutral-300 bg-white px-3.5 py-2 text-sm text-neutral-900 focus:border-[#0494f4] focus:outline-hidden dark:border-neutral-700 dark:bg-[#1b1b1b] dark:text-white"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-neutral-500 dark:text-neutral-400">
                Slot
              </label>
              <select
                value={slot}
                onChange={(e) => setSlot(Number(e.target.value))}
                className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 focus:border-[#0494f4] focus:outline-hidden dark:border-neutral-700 dark:bg-[#1b1b1b] dark:text-white"
              >
                <option value={1}>Slot 1</option>
                <option value={2}>Slot 2</option>
                <option value={3}>Slot 3</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setStep('install')}
              className="rounded-full px-4 py-1.5 text-xs font-medium text-neutral-600 transition hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
            >
              Back
            </button>
            <button
              type="submit"
              className="rounded-full bg-[#0494f4] px-5 py-1.5 text-xs font-medium text-white transition hover:bg-[#0382d6]"
            >
              Next
            </button>
          </div>
        </form>
      )}

      {step === 'pin' && (
        <form onSubmit={handleLaunchProtocol} className="space-y-3.5 p-4 sm:p-5">
          <h3 className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
            3. Choose a PIN
          </h3>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            Choose a PIN of at least 6 numeric digits to protect access to{' '}
            <strong>{pcName || 'this computer'}</strong>.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs text-neutral-500 dark:text-neutral-400">
                Enter a PIN
              </label>
              <input
                type="password"
                inputMode="numeric"
                required
                autoFocus
                minLength={6}
                maxLength={12}
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="••••••"
                className="w-full rounded-xl border border-neutral-300 bg-white px-3.5 py-2 font-mono text-sm tracking-widest text-neutral-900 focus:border-[#0494f4] focus:outline-hidden dark:border-neutral-700 dark:bg-[#1b1b1b] dark:text-white"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-neutral-500 dark:text-neutral-400">
                Re-enter PIN
              </label>
              <input
                type="password"
                inputMode="numeric"
                required
                minLength={6}
                maxLength={12}
                value={pinConfirm}
                onChange={(e) => setPinConfirm(e.target.value)}
                placeholder="••••••"
                className="w-full rounded-xl border border-neutral-300 bg-white px-3.5 py-2 font-mono text-sm tracking-widest text-neutral-900 focus:border-[#0494f4] focus:outline-hidden dark:border-neutral-700 dark:bg-[#1b1b1b] dark:text-white"
              />
            </div>
          </div>

          {pinError && <p className="text-xs text-red-600 dark:text-red-400">{pinError}</p>}

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setStep('name')}
              className="rounded-full px-4 py-1.5 text-xs font-medium text-neutral-600 transition hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
            >
              Back
            </button>
            <button
              type="submit"
              className="rounded-full bg-[#0494f4] px-5 py-1.5 text-xs font-medium text-white transition hover:bg-[#0382d6]"
            >
              Start
            </button>
          </div>
        </form>
      )}

      {step === 'launched' && (
        <div className="flex flex-col justify-between gap-3 p-4 sm:flex-row sm:items-center sm:p-5">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" />
            <p className="text-xs leading-relaxed text-neutral-600 dark:text-neutral-300">
              Confirm <strong>Allow &amp; Turn On Remote Access</strong> in the Gothwad Remote
              Desktop window on your PC. Your computer will appear in Remote devices above.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setStep('download');
              onFinished();
            }}
            className="shrink-0 rounded-full border border-neutral-300 px-4 py-1.5 text-xs font-medium text-neutral-700 transition hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-800"
          >
            Done
          </button>
        </div>
      )}
    </section>
  );
}
