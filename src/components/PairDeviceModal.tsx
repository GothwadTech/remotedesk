import { useState } from 'react';
import { ArrowRight, KeyRound, ShieldAlert, Users, X } from 'lucide-react';
import { addBookmarkedPeer } from '../lib/peerRegistry';
import { CopyCodeBlock } from './CopyCodeBlock';

interface PairDeviceModalProps {
  username: string;
  onOpenFullGuide: () => void;
  onClose: () => void;
}

export function PairDeviceModal({ username, onOpenFullGuide, onClose }: PairDeviceModalProps) {
  const [slot, setSlot] = useState(1);
  const [friendUsername, setFriendUsername] = useState('');
  const [friendSlot, setFriendSlot] = useState(1);
  const [addedPeer, setAddedPeer] = useState<string | null>(null);

  const psCommand = `irm https://raw.githubusercontent.com/GothwadTech/remotedesktop/main/scripts/install-gothwad-agent.ps1 -OutFile setup.ps1; .\\setup.ps1 -GothwadUser "${username}" -Slot ${slot}`;

  const handleBookmarkFriend = () => {
    if (!friendUsername.trim()) return;
    const peerId = addBookmarkedPeer(friendUsername, friendSlot);
    setAddedPeer(peerId);
    setFriendUsername('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-indigo-400" />
            <h3 className="text-base font-bold text-white">
              Add / Connect Windows PC (Zero-D1 P2P)
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

        <div className="mt-4 flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
          <span>
            <strong>Explicit Owner Consent Required:</strong> Kisi bhi PC par setup sirf owner ki
            permission ke saath Admin PowerShell me karein.
          </span>
        </div>

        <div className="mt-4 space-y-4">
          <div>
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-white">
                1. Apne Gothwad Account ({username}@gothwadtech.com) se naya PC jodein:
              </label>
              <select
                value={slot}
                onChange={(e) => setSlot(Number(e.target.value))}
                className="rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 text-xs text-white"
              >
                {[1, 2, 3, 4, 5, 6].map((n) => (
                  <option key={n} value={n}>
                    Slot {n}
                  </option>
                ))}
              </select>
            </div>
            <CopyCodeBlock label="Run Once in Windows 11 Admin PowerShell" command={psCommand} />
          </div>

          <div className="border-t border-slate-800 pt-4">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-white">
              <Users className="h-3.5 w-3.5 text-emerald-400" />
              2. Ya kisi dost ka Shared PC connect karein:
            </div>
            <p className="mt-0.5 text-[11px] text-slate-400">
              Agar kisi dusre Gothwad user ne aapko apne PC/VM par allow kiya hai, toh unka username
              daalein:
            </p>
            <div className="mt-2 flex gap-2">
              <input
                type="text"
                value={friendUsername}
                onChange={(e) => setFriendUsername(e.target.value)}
                placeholder="Friend's Gothwad username"
                className="flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs text-white"
              />
              <select
                value={friendSlot}
                onChange={(e) => setFriendSlot(Number(e.target.value))}
                className="rounded-lg border border-slate-700 bg-slate-950 px-2 py-1.5 text-xs text-white"
              >
                {[1, 2, 3, 4, 5, 6].map((n) => (
                  <option key={n} value={n}>
                    Slot {n}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={handleBookmarkFriend}
                className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500"
              >
                Add
              </button>
            </div>
            {addedPeer && (
              <p className="mt-1.5 text-[11px] text-emerald-300">
                Added <code>{addedPeer}</code> to discovery list!
              </p>
            )}
          </div>
        </div>

        <div className="mt-5 border-t border-slate-800 pt-3 text-center">
          <button
            type="button"
            onClick={onOpenFullGuide}
            className="inline-flex items-center gap-1 text-xs font-medium text-indigo-400 hover:text-indigo-300"
          >
            Need Hyper-V VM setup commands too? Open Full Windows Setup Wizard
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
