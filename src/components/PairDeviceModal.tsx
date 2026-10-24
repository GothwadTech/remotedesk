import { useState } from 'react';
import { Download, Plus, Terminal, X } from 'lucide-react';
import { addBookmarkedPeer } from '../lib/peerRegistry';
import { buildHostPeerId, sanitizeGothwadUsername } from '../lib/protocol';

interface PairDeviceModalProps {
  open: boolean;
  initialTab?: 'setup' | 'shared';
  currentUsername: string;
  onClose: () => void;
  onOpenPowerShellSetup: () => void;
  onPaired: () => void;
}

const RELEASE_EXE_URL =
  'https://github.com/GothwadTech/remotedesk/releases/latest/download/GothwadRemoteHostSetup.exe';

export function PairDeviceModal({
  open,
  initialTab = 'setup',
  currentUsername,
  onClose,
  onOpenPowerShellSetup,
  onPaired,
}: PairDeviceModalProps) {
  const [tab, setTab] = useState<'setup' | 'shared'>(initialTab);
  const [ownerUsername, setOwnerUsername] = useState('');
  const [slot, setSlot] = useState(1);

  if (!open) return null;

  const myPeerId = buildHostPeerId(currentUsername, 1);

  const handleBookmark = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = sanitizeGothwadUsername(ownerUsername);
    if (!clean) return;
    addBookmarkedPeer(clean, slot);
    setOwnerUsername('');
    onPaired();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-[2px]">
      <div className="w-full max-w-md rounded-2xl border border-neutral-200 bg-white p-5 shadow-xl dark:border-neutral-800 dark:bg-[#262626]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-medium text-neutral-900 dark:text-neutral-100">
              {tab === 'setup' ? 'Set up remote access' : 'Add shared computer'}
            </h2>
            <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
              {tab === 'setup'
                ? 'Install the lightweight host service on your Windows 11 PC.'
                : 'Bookmark a computer that another Gothwad user shared with you.'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-full p-1.5 text-neutral-400 transition hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-1.5 rounded-xl bg-neutral-100 p-1 dark:bg-[#1b1b1b]">
          <button
            type="button"
            onClick={() => setTab('setup')}
            className={`rounded-lg py-1.5 text-xs font-medium transition ${
              tab === 'setup'
                ? 'bg-white text-neutral-900 shadow-xs dark:bg-[#2d2d2d] dark:text-white'
                : 'text-neutral-600 dark:text-neutral-400'
            }`}
          >
            My Windows PC
          </button>
          <button
            type="button"
            onClick={() => setTab('shared')}
            className={`rounded-lg py-1.5 text-xs font-medium transition ${
              tab === 'shared'
                ? 'bg-white text-neutral-900 shadow-xs dark:bg-[#2d2d2d] dark:text-white'
                : 'text-neutral-600 dark:text-neutral-400'
            }`}
          >
            Shared computer
          </button>
        </div>

        {tab === 'setup' ? (
          <div className="mt-4 space-y-3">
            <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-3.5 dark:border-neutral-800 dark:bg-[#1e1e1e]">
              <p className="text-xs leading-relaxed text-neutral-600 dark:text-neutral-300">
                Download and run the installer on your Windows PC, or use the one-line PowerShell
                setup. Once registered under{' '}
                <strong className="font-medium text-neutral-900 dark:text-white">
                  {currentUsername}@gothwadtech.com
                </strong>{' '}
                (Host ID <code className="font-mono text-[11px]">{myPeerId}</code>), it appears here
                automatically.
              </p>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <a
                href={RELEASE_EXE_URL}
                target="_blank"
                rel="noreferrer"
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-[#0494f4] px-4 py-2.5 text-xs font-medium text-white transition hover:bg-[#0382d6]"
              >
                <Download className="h-4 w-4" />
                Download Host (.exe)
              </a>

              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenPowerShellSetup();
                }}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-full border border-neutral-300 px-4 py-2.5 text-xs font-medium text-neutral-700 transition hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-800"
              >
                <Terminal className="h-4 w-4" />
                Set up via PowerShell
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleBookmark} className="mt-4 space-y-3.5">
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-700 dark:text-neutral-300">
                Owner username or email
              </label>
              <input
                type="text"
                required
                placeholder="e.g. alex or alex@gothwadtech.com"
                value={ownerUsername}
                onChange={(e) => setOwnerUsername(e.target.value)}
                className="w-full rounded-xl border border-neutral-300 bg-white px-3.5 py-2 text-sm text-neutral-900 focus:border-[#0494f4] focus:outline-hidden dark:border-neutral-700 dark:bg-[#1b1b1b] dark:text-white"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-700 dark:text-neutral-300">
                Computer slot
              </label>
              <select
                value={slot}
                onChange={(e) => setSlot(Number(e.target.value))}
                className="w-full rounded-xl border border-neutral-300 bg-white px-3.5 py-2 text-sm text-neutral-900 focus:border-[#0494f4] focus:outline-hidden dark:border-neutral-700 dark:bg-[#1b1b1b] dark:text-white"
              >
                <option value={1}>Slot 1 (Default)</option>
                <option value={2}>Slot 2</option>
                <option value={3}>Slot 3</option>
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="rounded-full px-4 py-2 text-xs font-medium text-neutral-600 transition hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 rounded-full bg-[#0494f4] px-4 py-2 text-xs font-medium text-white transition hover:bg-[#0382d6]"
              >
                <Plus className="h-3.5 w-3.5" />
                Save computer
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
