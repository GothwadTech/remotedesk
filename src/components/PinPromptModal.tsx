import { useState, type FormEvent } from 'react';
import { KeyRound, Laptop, Server, X } from 'lucide-react';
import type { RemoteDevice, TargetMode } from '../types';

interface PinPromptModalProps {
  device: RemoteDevice;
  targetMode: TargetMode;
  error: string | null;
  connecting: boolean;
  onSubmit: (pin: string) => void;
  onClose: () => void;
}

export function PinPromptModal({
  device,
  targetMode,
  error,
  connecting,
  onSubmit,
  onClose,
}: PinPromptModalProps) {
  const [pin, setPin] = useState(device.id === 'dev_demo_win11' ? '123456' : '');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (pin.trim()) onSubmit(pin.trim());
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            {targetMode === 'host_os' ? (
              <Laptop className="h-5 w-5 text-sky-400" />
            ) : (
              <Server className="h-5 w-5 text-indigo-400" />
            )}
            <h3 className="text-base font-bold text-white">
              {targetMode === 'host_os'
                ? 'Connect to Main Windows 11 OS'
                : `Connect to Hyper-V VM (${device.vmName})`}
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

        <p className="mt-3 text-xs text-slate-400">
          {targetMode === 'host_os'
            ? 'Direct Host OS mode: Host screen par Chrome Remote Desktop jaisa "Shared with your Gothwad Account" banner dikhega.'
            : 'Headless Background VM mode: Dost ka desktop/mouse bilkul untouched rahega; aap seedha isolated Hyper-V VM me connect hoge.'}
        </p>

        <div className="mt-4">
          <label className="flex items-center justify-between text-xs font-medium text-slate-300">
            <span className="inline-flex items-center gap-1">
              <KeyRound className="h-3.5 w-3.5 text-indigo-400" />
              Enter 6-Digit Remote PIN
            </span>
            {device.id === 'dev_demo_win11' && (
              <span className="text-[11px] text-indigo-300">Demo PIN: 123456</span>
            )}
          </label>
          <input
            type="password"
            inputMode="numeric"
            autoFocus
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            placeholder="••••••"
            className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-center font-mono text-lg tracking-[0.4em] text-white focus:border-indigo-500 focus:outline-none"
          />
        </div>

        {error && <p className="mt-2 text-xs text-rose-400">{error}</p>}

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-700 px-4 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={connecting || pin.length < 6}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-indigo-500 disabled:opacity-40"
          >
            {connecting ? 'Verifying Gothwad Session + PIN...' : 'Start Encrypted Session'}
          </button>
        </div>
      </form>
    </div>
  );
}
