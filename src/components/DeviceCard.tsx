import { useEffect, useRef, useState } from 'react';
import {
  HardDrive,
  Monitor,
  MoreVertical,
  Pause,
  Play,
  RotateCcw,
  Share2,
  Trash2,
} from 'lucide-react';
import type { RemoteDevice, TargetMode } from '../types';

interface DeviceCardProps {
  device: RemoteDevice;
  busyAction: string | null;
  onConnect: (device: RemoteDevice, mode: TargetMode) => void;
  onVmPower: (device: RemoteDevice, action: 'start_vm' | 'save_vm' | 'restart_vm') => void;
  onOpenShare: (device: RemoteDevice) => void;
  onRemoveBookmark?: (device: RemoteDevice) => void;
}

export function DeviceCard({
  device,
  busyAction,
  onConnect,
  onVmPower,
  onOpenShare,
  onRemoveBookmark,
}: DeviceCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const handleOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [menuOpen]);

  const primaryMode: TargetMode = device.canControlHostOs ? 'host_os' : 'hyperv_vm';

  return (
    <div className="group flex items-center justify-between gap-3 px-4 py-3.5 transition hover:bg-neutral-50 sm:px-5 sm:py-4 dark:hover:bg-white/[0.03]">
      <button
        type="button"
        disabled={!device.online}
        onClick={() => onConnect(device, primaryMode)}
        className="flex min-w-0 flex-1 items-center gap-3.5 text-left disabled:cursor-not-allowed disabled:opacity-60"
      >
        <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-200">
          <Monitor className="h-5 w-5" />
          <span
            className={`absolute right-0 bottom-0 h-2.5 w-2.5 rounded-full ring-2 ring-white dark:ring-[#262626] ${
              device.online ? 'bg-emerald-500' : 'bg-neutral-400'
            }`}
          />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-sm font-medium text-neutral-900 sm:text-[15px] dark:text-neutral-100">
              {device.name}
            </span>
            {device.isDemo && (
              <span className="shrink-0 rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] font-medium text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400">
                Demo
              </span>
            )}
          </div>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-neutral-500 dark:text-neutral-400">
            <span className={device.online ? 'text-emerald-600 dark:text-emerald-400' : ''}>
              {device.online ? 'Online' : 'Offline'}
            </span>
            <span>·</span>
            <span className="truncate">{device.osInfo}</span>
            {device.role === 'shared' && (
              <>
                <span>·</span>
                <span>
                  Shared by @{device.ownerUsername}
                  {!device.canControlHostOs ? ' (VM only)' : ''}
                </span>
              </>
            )}
          </div>
        </div>
      </button>

      <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
        {device.canControlHostOs && device.canControlVm && (
          <button
            type="button"
            disabled={!device.online}
            onClick={() => onConnect(device, 'hyperv_vm')}
            title={`Open Background VM (${device.vmState})`}
            className="hidden items-center gap-1.5 rounded-full border border-neutral-200 px-3 py-1.5 text-xs font-medium text-neutral-700 transition hover:bg-neutral-100 disabled:opacity-40 sm:inline-flex dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
          >
            <HardDrive className="h-3.5 w-3.5 text-neutral-500 dark:text-neutral-400" />
            VM
          </button>
        )}

        <button
          type="button"
          disabled={!device.online}
          onClick={() => onConnect(device, primaryMode)}
          className="rounded-full bg-[#0494f4] px-3.5 py-1.5 text-xs font-medium text-white transition hover:bg-[#0382d6] disabled:opacity-40 sm:px-4"
        >
          {primaryMode === 'host_os' ? 'Connect' : 'Open VM'}
        </button>

        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="More options"
            className="inline-flex h-8 w-8 items-center justify-center rounded-full text-neutral-500 transition hover:bg-neutral-100 hover:text-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
          >
            <MoreVertical className="h-4 w-4" />
          </button>

          {menuOpen && (
            <div className="absolute right-0 z-40 mt-1.5 w-56 overflow-hidden rounded-xl border border-neutral-200 bg-white py-1 shadow-lg dark:border-neutral-800 dark:bg-[#2a2a2a]">
              {device.canControlHostOs && (
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    onConnect(device, 'host_os');
                  }}
                  className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-xs text-neutral-800 transition hover:bg-neutral-100 dark:text-neutral-200 dark:hover:bg-white/5"
                >
                  <Monitor className="h-3.5 w-3.5 text-neutral-500" />
                  Connect to Main Desktop
                </button>
              )}

              {device.canControlVm && (
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    onConnect(device, 'hyperv_vm');
                  }}
                  className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-xs text-neutral-800 transition hover:bg-neutral-100 dark:text-neutral-200 dark:hover:bg-white/5"
                >
                  <HardDrive className="h-3.5 w-3.5 text-neutral-500" />
                  Open Background VM ({device.vmState})
                </button>
              )}

              <div className="my-1 border-t border-neutral-100 dark:border-neutral-800" />

              <button
                type="button"
                disabled={busyAction !== null}
                onClick={() => {
                  setMenuOpen(false);
                  onVmPower(device, 'start_vm');
                }}
                className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-xs text-neutral-700 transition hover:bg-neutral-100 disabled:opacity-50 dark:text-neutral-300 dark:hover:bg-white/5"
              >
                <Play className="h-3.5 w-3.5 text-emerald-500" />
                Start Background VM
              </button>

              <button
                type="button"
                disabled={busyAction !== null}
                onClick={() => {
                  setMenuOpen(false);
                  onVmPower(device, 'save_vm');
                }}
                className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-xs text-neutral-700 transition hover:bg-neutral-100 disabled:opacity-50 dark:text-neutral-300 dark:hover:bg-white/5"
              >
                <Pause className="h-3.5 w-3.5 text-amber-500" />
                Save VM state
              </button>

              <button
                type="button"
                disabled={busyAction !== null}
                onClick={() => {
                  setMenuOpen(false);
                  onVmPower(device, 'restart_vm');
                }}
                className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-xs text-neutral-700 transition hover:bg-neutral-100 disabled:opacity-50 dark:text-neutral-300 dark:hover:bg-white/5"
              >
                <RotateCcw className="h-3.5 w-3.5 text-neutral-500" />
                Restart VM
              </button>

              {device.role === 'owner' && (
                <>
                  <div className="my-1 border-t border-neutral-100 dark:border-neutral-800" />
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      onOpenShare(device);
                    }}
                    className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-xs text-neutral-800 transition hover:bg-neutral-100 dark:text-neutral-200 dark:hover:bg-white/5"
                  >
                    <Share2 className="h-3.5 w-3.5 text-neutral-500" />
                    Share access...
                  </button>
                </>
              )}

              {device.role === 'shared' && !device.isDemo && onRemoveBookmark && (
                <>
                  <div className="my-1 border-t border-neutral-100 dark:border-neutral-800" />
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      onRemoveBookmark(device);
                    }}
                    className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-xs text-red-600 transition hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Remove computer
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
