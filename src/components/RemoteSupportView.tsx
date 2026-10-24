import { useState } from 'react';
import { ArrowRight, Check, Copy, MonitorUp, Share2 } from 'lucide-react';
import type { RemoteDevice } from '../types';
import { addBookmarkedPeer } from '../lib/peerRegistry';
import { buildHostPeerId, sanitizeGothwadUsername } from '../lib/protocol';

interface RemoteSupportViewProps {
  currentUsername: string;
  ownedDevice: RemoteDevice | null;
  onOpenShareModal: (device: RemoteDevice) => void;
  onOpenSetup: () => void;
  onConnectedBookmark: () => void;
}

export function RemoteSupportView({
  currentUsername,
  ownedDevice,
  onOpenShareModal,
  onOpenSetup,
  onConnectedBookmark,
}: RemoteSupportViewProps) {
  const [remoteInput, setRemoteInput] = useState('');
  const [copiedId, setCopiedId] = useState(false);

  const myHostId = buildHostPeerId(currentUsername, 1);

  const handleCopyId = async () => {
    await navigator.clipboard.writeText(myHostId);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const handleConnectRemote = (e: React.FormEvent) => {
    e.preventDefault();
    const raw = remoteInput.trim().toLowerCase();
    if (!raw) return;

    // Accept either a Peer ID ("grd-alex-slot-2") or a Gothwad username/email ("alex")
    const slotMatch = raw.match(/^grd-([a-z0-9-]+)-slot-([1-6])$/);
    if (slotMatch) {
      addBookmarkedPeer(slotMatch[1], Number(slotMatch[2]));
    } else {
      const clean = sanitizeGothwadUsername(raw);
      if (!clean) return;
      addBookmarkedPeer(clean, 1);
    }
    setRemoteInput('');
    onConnectedBookmark();
  };

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      {/* Card 1: Share this screen */}
      <section className="overflow-hidden rounded-2xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-[#262626]">
        <div className="border-b border-neutral-200 px-5 py-4 sm:px-6 dark:border-neutral-800">
          <h2 className="text-base font-medium text-neutral-900 dark:text-neutral-100">
            Share this screen
          </h2>
          <p className="mt-0.5 text-xs text-neutral-500 sm:text-sm dark:text-neutral-400">
            Allow another Gothwad user to view and control your Windows computer or isolated
            Background VM.
          </p>
        </div>

        <div className="flex flex-col justify-between gap-4 p-5 sm:flex-row sm:items-center sm:px-6">
          <div className="space-y-1">
            <span className="text-xs text-neutral-500 dark:text-neutral-400">Your Host ID</span>
            <div className="flex items-center gap-2">
              <code className="rounded-lg bg-neutral-100 px-2.5 py-1 font-mono text-xs text-neutral-900 dark:bg-[#1b1b1b] dark:text-neutral-100">
                {myHostId}
              </code>
              <button
                type="button"
                onClick={() => void handleCopyId()}
                className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-[#0494f4] transition hover:bg-[#0494f4]/10"
              >
                {copiedId ? (
                  <>
                    <Check className="h-3.5 w-3.5" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" />
                    Copy
                  </>
                )}
              </button>
            </div>
          </div>

          {ownedDevice ? (
            <button
              type="button"
              onClick={() => onOpenShareModal(ownedDevice)}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-[#0494f4] px-4 py-2 text-xs font-medium text-white transition hover:bg-[#0382d6]"
            >
              <Share2 className="h-3.5 w-3.5" />
              Manage shared access
            </button>
          ) : (
            <button
              type="button"
              onClick={onOpenSetup}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-neutral-300 px-4 py-2 text-xs font-medium text-neutral-700 transition hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-800"
            >
              <MonitorUp className="h-3.5 w-3.5" />
              Set up host first
            </button>
          )}
        </div>
      </section>

      {/* Card 2: Connect to another computer */}
      <section className="overflow-hidden rounded-2xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-[#262626]">
        <div className="border-b border-neutral-200 px-5 py-4 sm:px-6 dark:border-neutral-800">
          <h2 className="text-base font-medium text-neutral-900 dark:text-neutral-100">
            Connect to another computer
          </h2>
          <p className="mt-0.5 text-xs text-neutral-500 sm:text-sm dark:text-neutral-400">
            Enter the Host ID or Gothwad username of the computer shared with you.
          </p>
        </div>

        <form
          onSubmit={handleConnectRemote}
          className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:px-6"
        >
          <input
            type="text"
            required
            value={remoteInput}
            onChange={(e) => setRemoteInput(e.target.value)}
            placeholder="Host ID or username (e.g. grd-alex-slot-1 or alex)"
            className="min-w-0 flex-1 rounded-xl border border-neutral-300 bg-white px-3.5 py-2 text-sm text-neutral-900 focus:border-[#0494f4] focus:outline-hidden dark:border-neutral-700 dark:bg-[#1b1b1b] dark:text-white"
          />
          <button
            type="submit"
            disabled={!remoteInput.trim()}
            className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-full bg-[#0494f4] px-5 py-2 text-xs font-medium text-white transition hover:bg-[#0382d6] disabled:opacity-40"
          >
            Connect
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </form>
      </section>
    </div>
  );
}
