import { useState } from 'react';
import { ArrowRight, BatteryWarning, CheckCircle2, Layers, Laptop, Server } from 'lucide-react';
import { CopyCodeBlock } from './CopyCodeBlock';
import { HeadlessPairStep } from './HeadlessPairStep';

interface SetupWizardProps {
  username: string;
  userEmail: string;
  onFinishToDashboard: () => void;
}

type SetupFlavor = 'dual' | 'host_only' | 'vm_only';

export function SetupWizard({ username, userEmail, onFinishToDashboard }: SetupWizardProps) {
  const [flavor, setFlavor] = useState<SetupFlavor>('dual');
  const [vmName, setVmName] = useState('RemoteWorkVM');
  const [guestType, setGuestType] = useState<'Linux' | 'Windows'>('Linux');
  const [maxRamMb, setMaxRamMb] = useState(4096);
  const [diskGb, setDiskGb] = useState(50);
  const [isoPath, setIsoPath] = useState('C:\\HyperV\\ISO\\ubuntu-24.04-desktop-amd64.iso');

  const needsHyperV = flavor !== 'host_only';

  const enableHyperVCmd =
    'Enable-WindowsOptionalFeature -Online -FeatureName Microsoft-Hyper-V -All';

  const createVmCmd = `irm https://raw.githubusercontent.com/GothwadTech/remotedesktop/main/scripts/host-setup-hyperv.ps1 -OutFile host-setup-hyperv.ps1; .\\host-setup-hyperv.ps1 -VMName "${vmName}" -GuestType "${guestType}" -MaxRamMB ${maxRamMb} -DiskSizeGB ${diskGb} -IsoPath "${isoPath}"`;

  const powerSafetyCmd = `# Charger (AC) par laptop sleep band rakhein, lekin Battery (DC) par 15-min sleep ON rakhein (Bag overheating safety!)
powercfg /change standby-timeout-ac 0
powercfg /change standby-timeout-dc 15
powercfg /change monitor-timeout-ac 10`;

  return (
    <div className="space-y-6">
      {/* Intro & Mode Picker */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 shadow-xl">
        <h2 className="text-lg font-bold text-white">
          Set Up Windows Computer on <span className="text-indigo-400">remotedesktop.gothwadtech.com</span>
        </h2>
        <p className="mt-1 text-xs text-slate-400">
          Apne ya dost ke Windows 11 PC (with owner permission) par one-time setup karne ke liye
          pehle apna mode select karein — neeche exact copy-paste commands aa jayengi:
        </p>

        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
          <button
            type="button"
            onClick={() => setFlavor('dual')}
            className={`rounded-xl border p-3.5 text-left transition ${
              flavor === 'dual'
                ? 'border-indigo-500 bg-indigo-950/35'
                : 'border-slate-800 bg-slate-950/60 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center gap-2 text-xs font-bold text-white">
              <Layers className="h-4 w-4 text-indigo-400" />
              Main OS + Background VM
            </div>
            <p className="mt-1 text-[11px] text-slate-400">
              Recommended: Chrome Remote Desktop jaisa Main OS + Isolated Hyper-V VM dono!
            </p>
          </button>

          <button
            type="button"
            onClick={() => setFlavor('host_only')}
            className={`rounded-xl border p-3.5 text-left transition ${
              flavor === 'host_only'
                ? 'border-sky-500 bg-sky-950/30'
                : 'border-slate-800 bg-slate-950/60 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center gap-2 text-xs font-bold text-white">
              <Laptop className="h-4 w-4 text-sky-400" />
              Main Windows OS Only
            </div>
            <p className="mt-1 text-[11px] text-slate-400">
              2-Minute Fast Setup: Bina Hyper-V VM banaye seedha Main Windows PC access karein.
            </p>
          </button>

          <button
            type="button"
            onClick={() => setFlavor('vm_only')}
            className={`rounded-xl border p-3.5 text-left transition ${
              flavor === 'vm_only'
                ? 'border-violet-500 bg-violet-950/30'
                : 'border-slate-800 bg-slate-950/60 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center gap-2 text-xs font-bold text-white">
              <Server className="h-4 w-4 text-violet-400" />
              Background Hyper-V VM Only
            </div>
            <p className="mt-1 text-[11px] text-slate-400">
              Dost ki screen touch kiye bina sirf headless isolated VM auto-boot par chalayein.
            </p>
          </button>
        </div>
      </div>

      {/* Step 1: Enable Hyper-V (Only when VM is needed) */}
      {needsHyperV && (
        <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 shadow-xl">
          <div className="flex items-center gap-2.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-800 text-xs font-bold text-indigo-300 border border-indigo-500/40">
              1
            </span>
            <h3 className="text-base font-bold text-white">
              Enable Built-in Hyper-V (Windows 11 Pro One-Time Step)
            </h3>
          </div>
          <p className="mt-2 text-xs text-slate-400">
            Windows 11 Pro PC par <code>Win + X</code> dabayein &rarr;{' '}
            <strong>Terminal (Admin)</strong> kholein aur yeh command run karein (agar pehle se
            enabled nahi hai toh ek baar restart maangega):
          </p>
          <CopyCodeBlock label="PowerShell (Admin) — Enable Hyper-V" command={enableHyperVCmd} />
        </section>
      )}

      {/* Step 2: Provision Safe Resource-Capped Hyper-V VM */}
      {needsHyperV && (
        <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 shadow-xl">
          <div className="flex items-center gap-2.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-800 text-xs font-bold text-indigo-300 border border-indigo-500/40">
              2
            </span>
            <h3 className="text-base font-bold text-white">
              Create Auto-Boot Background VM (`Default Switch` Wi-Fi NAT + Safe Limits)
            </h3>
          </div>
          <p className="mt-2 text-xs text-slate-400">
            Pehle Ubuntu 24.04 ya Windows ISO download karke folder me rakhein, phir apni pasand ke
            hisaab se neeche settings customize karein — command automatic update ho jayegi:
          </p>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="block text-[11px] font-medium text-slate-400">VM Name</label>
              <input
                type="text"
                value={vmName}
                onChange={(e) => setVmName(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-xs text-white"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-400">Guest OS Type</label>
              <select
                value={guestType}
                onChange={(e) => {
                  const next = e.target.value as 'Linux' | 'Windows';
                  setGuestType(next);
                  setIsoPath(
                    next === 'Linux'
                      ? 'C:\\HyperV\\ISO\\ubuntu-24.04-desktop-amd64.iso'
                      : 'C:\\HyperV\\ISO\\Win11.iso',
                  );
                }}
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-xs text-white"
              >
                <option value="Linux">Linux (Ubuntu — Lightest)</option>
                <option value="Windows">Windows 10 / 11 Pro</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-400">
                Max Dynamic RAM (MB)
              </label>
              <input
                type="number"
                min={2048}
                max={8192}
                step={512}
                value={maxRamMb}
                onChange={(e) => setMaxRamMb(Number(e.target.value) || 4096)}
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-xs text-white"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-400">
                Dynamic Disk Max (GB)
              </label>
              <input
                type="number"
                min={25}
                max={200}
                value={diskGb}
                onChange={(e) => setDiskGb(Number(e.target.value) || 50)}
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-xs text-white"
              />
            </div>
          </div>

          <div className="mt-3">
            <label className="block text-[11px] font-medium text-slate-400">
              Local ISO File Path on Windows PC
            </label>
            <input
              type="text"
              value={isoPath}
              onChange={(e) => setIsoPath(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1.5 font-mono text-xs text-white"
            />
          </div>

          <CopyCodeBlock
            label="PowerShell (Admin) — Create 1080p Auto-Start VM with 60% CPU Cap"
            command={createVmCmd}
          />
        </section>
      )}

      {/* Step 3 (or Step 1 in host_only): Authorize & Pair via Gothwad Account */}
      <HeadlessPairStep
        username={username}
        userEmail={userEmail}
        vmName={vmName}
        stepNumber={needsHyperV ? 3 : 1}
      />

      {/* Final Step: Laptop Power Safety */}
      <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 shadow-xl">
        <div className="flex items-center gap-2.5">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-800 text-xs font-bold text-indigo-300 border border-indigo-500/40">
            {needsHyperV ? 4 : 2}
          </span>
          <h3 className="text-base font-bold text-white">
            Safe Laptop Power Config (Charger Awake · Battery Protected)
          </h3>
        </div>

        <div className="mt-2.5 flex items-start gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-200">
          <BatteryWarning className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />
          <span>
            <strong>Laptop Bag Safety:</strong> Yeh command sirf <strong>Charger (Plugged-In)</strong>{' '}
            hone par laptop ko sleep se rokega. Battery par 15-min sleep ON rahega taaki bag ke andar
            laptop kabhi garm na ho!
          </span>
        </div>

        <CopyCodeBlock label="PowerShell (Admin) — Safe AC Power Settings" command={powerSafetyCmd} />

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 pt-4">
          <div className="flex items-center gap-2 text-xs text-emerald-300">
            <CheckCircle2 className="h-4 w-4" />
            <span>Commands run hote hi aapka PC 10 seconds me Online aa jayega!</span>
          </div>
          <button
            type="button"
            onClick={onFinishToDashboard}
            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-emerald-500"
          >
            Open Remote Access Dashboard
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </section>
    </div>
  );
}
