import { useEffect, useState } from 'react';
import { Trash2, UserPlus, X } from 'lucide-react';
import type { AccessScope, RemoteDevice, ShareEntry } from '../types';
import { getDemoShares, removeDemoShare, upsertDemoShare } from '../lib/peerRegistry';
import { sanitizeGothwadUsername } from '../lib/protocol';
import { CopyCodeBlock } from './CopyCodeBlock';

interface ShareAccessModalProps {
  device: RemoteDevice | null;
  onClose: () => void;
}

export function ShareAccessModal({ device, onClose }: ShareAccessModalProps) {
  const [shares, setShares] = useState<ShareEntry[]>([]);
  const [username, setUsername] = useState('');
  const [scope, setScope] = useState<AccessScope>('host_and_vm');

  useEffect(() => {
    if (!device) return;
    setShares(device.isDemo ? getDemoShares() : []);
  }, [device]);

  if (!device) return null;

  const cleanTarget = sanitizeGothwadUsername(username) || 'friend';
  const shareCmd = `& "C:\\Program Files\\GothwadRemote\\GothwadRemoteAgent.exe" --grant-user "${cleanTarget}" --scope "${scope}"`;

  const handleGrantDemo = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = sanitizeGothwadUsername(username);
    if (!clean) return;
    upsertDemoShare(clean, scope);
    setShares(getDemoShares());
    setUsername('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-[2px]">
      <div className="w-full max-w-md rounded-2xl border border-neutral-200 bg-white p-5 shadow-xl dark:border-neutral-800 dark:bg-[#262626]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-medium text-neutral-900 dark:text-neutral-100">
              Share access
            </h2>
            <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">{device.name}</p>
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

        <form onSubmit={handleGrantDemo} className="mt-4 space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-700 dark:text-neutral-300">
              Gothwad username or email
            </label>
            <input
              type="text"
              placeholder="e.g. alex@gothwadtech.com"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full rounded-xl border border-neutral-300 bg-white px-3.5 py-2 text-sm text-neutral-900 focus:border-[#0494f4] focus:outline-hidden dark:border-neutral-700 dark:bg-[#1b1b1b] dark:text-white"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-700 dark:text-neutral-300">
              Permission level
            </label>
            <select
              value={scope}
              onChange={(e) => setScope(e.target.value as AccessScope)}
              className="w-full rounded-xl border border-neutral-300 bg-white px-3.5 py-2 text-sm text-neutral-900 focus:border-[#0494f4] focus:outline-hidden dark:border-neutral-700 dark:bg-[#1b1b1b] dark:text-white"
            >
              <option value="host_and_vm">Full access (Main Desktop + VM)</option>
              <option value="vm_only">Background VM only</option>
            </select>
          </div>

          {device.isDemo ? (
            <button
              type="submit"
              className="inline-flex w-full items-center justify-center gap-1.5 rounded-full bg-[#0494f4] px-4 py-2 text-xs font-medium text-white transition hover:bg-[#0382d6]"
            >
              <UserPlus className="h-3.5 w-3.5" />
              Grant access
            </button>
          ) : (
            <div className="space-y-2 pt-1">
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Run this command once on your Windows PC to grant access locally:
              </p>
              <CopyCodeBlock title="Grant access on Windows" language="powershell" code={shareCmd} />
            </div>
          )}
        </form>

        {device.isDemo && shares.length > 0 && (
          <div className="mt-4 space-y-1.5 border-t border-neutral-200 pt-3.5 dark:border-neutral-800">
            <h3 className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
              People with access
            </h3>
            {shares.map((s) => (
              <div
                key={s.username}
                className="flex items-center justify-between rounded-xl border border-neutral-200 px-3 py-2 dark:border-neutral-800"
              >
                <div>
                  <p className="text-xs font-medium text-neutral-900 dark:text-neutral-100">
                    {s.email}
                  </p>
                  <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                    {s.accessScope === 'vm_only' ? 'Background VM only' : 'Full access'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    removeDemoShare(s.username);
                    setShares(getDemoShares());
                  }}
                  aria-label={`Remove ${s.username}`}
                  className="rounded-full p-1.5 text-neutral-400 transition hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10 dark:hover:text-red-400"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
