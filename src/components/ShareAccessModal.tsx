import { useState } from 'react';
import { Shield, Trash2, UserPlus, X } from 'lucide-react';
import type { AccessScope, RemoteDevice, ShareEntry } from '../types';
import { getDemoShares, removeDemoShare, upsertDemoShare } from '../lib/peerRegistry';
import { sanitizeGothwadUsername } from '../lib/protocol';
import { CopyCodeBlock } from './CopyCodeBlock';

interface ShareAccessModalProps {
  device: RemoteDevice;
  onClose: () => void;
}

export function ShareAccessModal({ device, onClose }: ShareAccessModalProps) {
  const [shares, setShares] = useState<ShareEntry[]>(() =>
    device.isDemo ? getDemoShares() : [],
  );
  const [username, setUsername] = useState('');
  const [scope, setScope] = useState<AccessScope>('vm_only');

  const cleanInput = sanitizeGothwadUsername(username);

  const handleAdd = () => {
    if (!cleanInput || cleanInput === device.ownerUsername) return;
    if (device.isDemo) {
      upsertDemoShare(cleanInput, scope);
      setShares(getDemoShares());
    } else {
      setShares((prev) => [
        ...prev.filter((s) => s.username !== cleanInput),
        { username: cleanInput, email: `${cleanInput}@gothwadtech.com`, accessScope: scope },
      ]);
    }
    setUsername('');
  };

  const handleRevoke = (targetUser: string) => {
    if (device.isDemo) {
      removeDemoShare(targetUser);
      setShares(getDemoShares());
    } else {
      setShares((prev) => prev.filter((s) => s.username !== targetUser));
    }
  };

  const cliShareCmd = `C:\\"Program Files"\\GothwadRemote\\GothwadRemoteAgent.exe --grant-user "${
    cleanInput || 'dost'
  }" --scope "${scope}"`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-indigo-400" />
            <h3 className="text-base font-bold text-white">
              Gothwad Account ACL · {device.name}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-4 space-y-3">
          <p className="text-xs text-slate-400">
            Zero-D1 Architecture: Permissions seedha Windows Host ke encrypted{' '}
            <code>agent-config.json</code> me rehti hain. Kisi dusre{' '}
            <strong>@gothwadtech.com</strong> user ko <strong>VM-Only</strong> ya{' '}
            <strong>Host + VM</strong> allow karein:
          </p>

          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Gothwad username (e.g. dost)"
              className="flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white focus:border-indigo-500 focus:outline-none"
            />
            <select
              value={scope}
              onChange={(e) => setScope(e.target.value as AccessScope)}
              className="rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-2 text-xs text-slate-200"
            >
              <option value="vm_only">VM Only (Host Protected)</option>
              <option value="host_and_vm">Main Host OS + VM</option>
            </select>
            <button
              type="button"
              disabled={!cleanInput}
              onClick={handleAdd}
              className="inline-flex items-center justify-center gap-1 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-40"
            >
              <UserPlus className="h-3.5 w-3.5" />
              Grant
            </button>
          </div>

          <CopyCodeBlock label="Host CLI ACL Command (Optional)" command={cliShareCmd} />

          <div className="mt-3 rounded-xl border border-slate-800 bg-slate-950/60 p-3">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Authorized Gothwad Accounts
            </div>
            {shares.length === 0 ? (
              <p className="mt-2 text-xs text-slate-400">
                Private to owner ({device.ownerUsername}@gothwadtech.com).
              </p>
            ) : (
              <div className="mt-2 divide-y divide-slate-800/80">
                {shares.map((s) => (
                  <div key={s.username} className="flex items-center justify-between py-2 text-xs">
                    <div>
                      <div className="font-medium text-white">{s.email}</div>
                      <div className="text-[11px] text-slate-400">
                        Scope:{' '}
                        {s.accessScope === 'host_and_vm'
                          ? 'Main Windows OS + Hyper-V VM'
                          : 'Isolated Background VM Only'}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRevoke(s.username)}
                      className="rounded p-1.5 text-slate-400 hover:bg-rose-500/10 hover:text-rose-400"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
