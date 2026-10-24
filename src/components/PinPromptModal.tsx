import { useState } from 'react';
import { HardDrive, Lock, Monitor, X } from 'lucide-react';
import type { RemoteDevice, TargetMode } from '../types';

interface PinPromptModalProps {
  device: RemoteDevice | null;
  targetMode: TargetMode;
  connecting: boolean;
  error: string | null;
  onChangeMode: (mode: TargetMode) => void;
  onClose: () => void;
  onConfirm: (pin: string) => void;
}

export function PinPromptModal({
  device,
  targetMode,
  connecting,
  error,
  onChangeMode,
  onClose,
  onConfirm,
}: PinPromptModalProps) {
  const [pin, setPin] = useState(device?.isDemo ? '123456' : '');

  if (!device) return null;

  const canSwitchMode = device.canControlHostOs && device.canControlVm;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-[2px]">
      <div className="w-full max-w-sm rounded-2xl border border-neutral-200 bg-white p-5 shadow-xl dark:border-neutral-800 dark:bg-[#262626]">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#0494f4]/10 text-[#0494f4]">
              <Lock className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-base font-medium text-neutral-900 dark:text-neutral-100">
                Enter PIN
              </h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">{device.name}</p>
            </div>
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

        {canSwitchMode && (
          <div className="mt-4 grid grid-cols-2 gap-1.5 rounded-xl bg-neutral-100 p-1 dark:bg-[#1b1b1b]">
            <button
              type="button"
              onClick={() => onChangeMode('host_os')}
              className={`flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-medium transition ${
                targetMode === 'host_os'
                  ? 'bg-white text-neutral-900 shadow-xs dark:bg-[#2d2d2d] dark:text-white'
                  : 'text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-200'
              }`}
            >
              <Monitor className="h-3.5 w-3.5" />
              Main Desktop
            </button>
            <button
              type="button"
              onClick={() => onChangeMode('hyperv_vm')}
              className={`flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-medium transition ${
                targetMode === 'hyperv_vm'
                  ? 'bg-white text-neutral-900 shadow-xs dark:bg-[#2d2d2d] dark:text-white'
                  : 'text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-200'
              }`}
            >
              <HardDrive className="h-3.5 w-3.5" />
              Background VM
            </button>
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            onConfirm(pin);
          }}
          className="mt-4 space-y-4"
        >
          <div>
            <label className="mb-1.5 block text-xs font-medium text-neutral-600 dark:text-neutral-300">
              6-digit PIN {device.isDemo ? '(Demo: 123456)' : ''}
            </label>
            <input
              type="password"
              inputMode="numeric"
              autoFocus
              required
              minLength={6}
              maxLength={12}
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="••••••"
              className="w-full rounded-xl border border-neutral-300 bg-white px-4 py-2.5 text-center font-mono text-lg tracking-[0.35em] text-neutral-900 focus:border-[#0494f4] focus:outline-hidden dark:border-neutral-700 dark:bg-[#1b1b1b] dark:text-white"
            />
          </div>

          {targetMode === 'host_os' && (
            <p className="text-[11px] leading-relaxed text-neutral-500 dark:text-neutral-400">
              A visible banner will appear on the remote Windows screen while you are connected.
            </p>
          )}

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
              {error}
            </div>
          )}

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
              disabled={connecting || pin.trim().length < 6}
              className="rounded-full bg-[#0494f4] px-5 py-2 text-xs font-medium text-white transition hover:bg-[#0382d6] disabled:opacity-50"
            >
              {connecting ? 'Connecting...' : 'Connect'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
