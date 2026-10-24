import {
  Cpu,
  HardDrive,
  Laptop,
  Lock,
  Play,
  RotateCcw,
  Save,
  Server,
  Share2,
  Trash2,
} from 'lucide-react';
import type { RemoteDevice, TargetMode } from '../types';

interface DeviceCardProps {
  device: RemoteDevice;
  busyAction: string | null;
  onConnect: (device: RemoteDevice, mode: TargetMode) => void;
  onVmPower: (device: RemoteDevice, action: 'start_vm' | 'save_vm' | 'restart_vm') => void;
  onOpenShares: (device: RemoteDevice) => void;
  onUnlink: (device: RemoteDevice) => void;
}

export function DeviceCard({
  device,
  busyAction,
  onConnect,
  onVmPower,
  onOpenShares,
  onUnlink,
}: DeviceCardProps) {
  const ramPct = Math.min(
    100,
    Math.round((device.hostRamUsedMb / Math.max(1024, device.hostRamTotalMb)) * 100),
  );
  const ramUsedGb = (device.hostRamUsedMb / 1024).toFixed(1);
  const ramTotalGb = (device.hostRamTotalMb / 1024).toFixed(0);

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 shadow-xl transition hover:border-slate-700">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-700 bg-slate-800/80 text-indigo-400">
            <Laptop className="h-5 w-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-bold text-white">{device.name}</h2>
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  device.online
                    ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                    : 'bg-slate-800 text-slate-400 border border-slate-700'
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    device.online ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'
                  }`}
                />
                {device.online ? 'Online via Wi-Fi' : 'Offline'}
              </span>
              <span className="rounded-md bg-slate-800 px-2 py-0.5 text-[11px] font-medium text-slate-300">
                {device.role === 'owner'
                  ? `Owner: ${device.ownerUsername}`
                  : `Shared (${device.accessScope === 'host_and_vm' ? 'Host + VM' : 'VM Only'})`}
              </span>
            </div>
            <p className="mt-0.5 text-xs text-slate-400">{device.osInfo}</p>
          </div>
        </div>

        {device.role === 'owner' && (
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => onOpenShares(device)}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-800/80 px-2.5 py-1.5 text-xs font-medium text-slate-200 transition hover:border-indigo-500/60 hover:text-white"
            >
              <Share2 className="h-3.5 w-3.5 text-indigo-400" />
              Share Access
            </button>
            <button
              type="button"
              onClick={() => onUnlink(device)}
              title="Unlink remote PC"
              className="rounded-lg border border-slate-800 bg-slate-900 p-1.5 text-slate-400 transition hover:border-rose-500/50 hover:text-rose-400"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      {/* Host Telemetry Bar */}
      <div className="mt-4 grid grid-cols-1 gap-2.5 rounded-xl border border-slate-800/90 bg-slate-950/60 p-3 sm:grid-cols-3">
        <div className="flex items-center gap-2 text-xs text-slate-300">
          <HardDrive className="h-4 w-4 text-indigo-400 shrink-0" />
          <div className="w-full">
            <div className="flex justify-between">
              <span className="text-slate-400">Host RAM</span>
              <span className="font-medium">
                {ramUsedGb} / {ramTotalGb} GB ({ramPct}%)
              </span>
            </div>
            <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
              <div
                className="h-full rounded-full bg-indigo-500 transition-all"
                style={{ width: `${ramPct}%` }}
              />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-300">
          <Cpu className="h-4 w-4 text-violet-400 shrink-0" />
          <div>
            <span className="text-slate-400">Host CPU: </span>
            <span className="font-semibold text-white">{device.hostCpuPercent}%</span>
            <span className="ml-1 text-[11px] text-slate-500">(VM cap 60%)</span>
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 text-xs">
          <span className="text-slate-400">Hyper-V `{device.vmName}`:</span>
          <span
            className={`rounded-md px-2 py-0.5 font-semibold ${
              device.vmState === 'Running'
                ? 'bg-emerald-500/15 text-emerald-300'
                : 'bg-amber-500/15 text-amber-300'
            }`}
          >
            {device.vmState}
          </span>
        </div>
      </div>

      {/* Dual-Mode Remote Launch Cards */}
      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
        {/* Mode 1: Main Windows 11 Host OS */}
        <div className="flex flex-col justify-between rounded-xl border border-slate-800 bg-slate-950/70 p-3.5">
          <div>
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-white">
                <Laptop className="h-4 w-4 text-sky-400" />
                Mode 1: Main Windows 11 OS
              </span>
              <span className="rounded bg-sky-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-sky-300">
                Full System
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-400">
              Chrome Remote Desktop jaisa direct Host screen, mouse &amp; files control (Host par
              transparent sharing banner dikhega).
            </p>
          </div>

          <div className="mt-3">
            {device.canControlHostOs ? (
              <button
                type="button"
                disabled={!device.online}
                onClick={() => onConnect(device, 'host_os')}
                className="w-full rounded-lg bg-sky-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Control Main Windows OS
              </button>
            ) : (
              <div className="flex items-center justify-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-slate-400">
                <Lock className="h-3.5 w-3.5 text-amber-400" />
                Restricted to Owner (`vm_only` share)
              </div>
            )}
          </div>
        </div>

        {/* Mode 2: Isolated Background Hyper-V VM */}
        <div className="flex flex-col justify-between rounded-xl border border-indigo-500/30 bg-indigo-950/20 p-3.5">
          <div>
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-white">
                <Server className="h-4 w-4 text-indigo-400" />
                Mode 2: Background Hyper-V VM
              </span>
              <span className="rounded bg-indigo-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-300">
                Headless Isolated
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-400">
              Dost ki screen/mouse bilkul disturb nahi hogi. 100% isolated background VM (`Max 4GB`
              RAM, auto-boot).
            </p>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={!device.online}
              onClick={() => onConnect(device, 'hyperv_vm')}
              className="flex-1 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Control Background VM
            </button>

            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={busyAction !== null}
                onClick={() => onVmPower(device, 'start_vm')}
                title="Start / Resume Hyper-V VM"
                className="rounded-lg border border-slate-700 bg-slate-800 p-2 text-emerald-400 hover:border-emerald-500/50"
              >
                <Play className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                disabled={busyAction !== null}
                onClick={() => onVmPower(device, 'save_vm')}
                title="Save Hyper-V VM State"
                className="rounded-lg border border-slate-700 bg-slate-800 p-2 text-amber-300 hover:border-amber-500/50"
              >
                <Save className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                disabled={busyAction !== null}
                onClick={() => onVmPower(device, 'restart_vm')}
                title="Restart Hyper-V VM"
                className="rounded-lg border border-slate-700 bg-slate-800 p-2 text-slate-300 hover:border-slate-500"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
