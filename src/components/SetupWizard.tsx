import { useState } from 'react';
import { ArrowLeft, ArrowRight, CheckCircle2, HardDrive } from 'lucide-react';
import { buildHostPeerId } from '../lib/protocol';
import { CopyCodeBlock } from './CopyCodeBlock';

interface SetupWizardProps {
  currentUsername: string;
  onFinish: () => void;
}

export function SetupWizard({ currentUsername, onFinish }: SetupWizardProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [pcName, setPcName] = useState('Home-Windows-PC');
  const [pin, setPin] = useState('123456');
  const [slot, setSlot] = useState(1);
  const [includeVm, setIncludeVm] = useState(false);

  const safeName = pcName.trim().replace(/"/g, '') || 'Home-Windows-PC';
  const safePin = pin.trim().replace(/[^0-9]/g, '') || '123456';
  const peerId = buildHostPeerId(currentUsername, slot);

  const hostInstallCommand = `# Run in Administrator PowerShell on Windows 11
irm https://raw.githubusercontent.com/GothwadTech/remotedesk/main/scripts/install-gothwad-agent.ps1 -OutFile $env:TEMP\\install-gothwad-agent.ps1
powershell -ExecutionPolicy Bypass -File $env:TEMP\\install-gothwad-agent.ps1 -GothwadUser "${currentUsername}" -Slot ${slot} -DeviceName "${safeName}"`;

  const optionalVmCommand = `# Optional: Create an isolated Background VM (4 GB RAM cap, Wi-Fi NAT)
irm https://raw.githubusercontent.com/GothwadTech/remotedesk/main/scripts/host-setup-hyperv.ps1 -OutFile $env:TEMP\\host-setup-hyperv.ps1
powershell -ExecutionPolicy Bypass -File $env:TEMP\\host-setup-hyperv.ps1 -VMName "RemoteWorkVM" -IsoPath "C:\\HyperV\\ISO\\ubuntu-24.04.iso"`;

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-[#262626]">
        <div className="border-b border-neutral-200 px-5 py-4 sm:px-6 dark:border-neutral-800">
          <h1 className="text-base font-medium text-neutral-900 sm:text-lg dark:text-neutral-100">
            Set up another computer via PowerShell
          </h1>
          <p className="mt-1 text-xs text-neutral-500 sm:text-sm dark:text-neutral-400">
            Configure unattended remote access on Windows 11 without installing extra software
            manually.
          </p>
        </div>

        <div className="flex border-b border-neutral-200 px-5 py-3 text-xs font-medium sm:px-6 dark:border-neutral-800">
          {[
            { n: 1, label: 'Begin' },
            { n: 2, label: 'Configure' },
            { n: 3, label: 'Run command' },
          ].map((item, idx) => (
            <div key={item.n} className="flex items-center">
              {idx > 0 && (
                <span className="mx-2.5 text-neutral-300 sm:mx-4 dark:text-neutral-700">/</span>
              )}
              <button
                type="button"
                onClick={() => setStep(item.n as 1 | 2 | 3)}
                className={`inline-flex items-center gap-2 transition ${
                  step === item.n
                    ? 'text-[#0494f4]'
                    : step > item.n
                      ? 'text-neutral-700 dark:text-neutral-300'
                      : 'text-neutral-400 dark:text-neutral-500'
                }`}
              >
                <span
                  className={`flex h-5 w-5 items-center justify-center rounded-full text-[11px] ${
                    step === item.n
                      ? 'bg-[#0494f4] text-white'
                      : step > item.n
                        ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                        : 'bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400'
                  }`}
                >
                  {item.n}
                </span>
                {item.label}
              </button>
            </div>
          ))}
        </div>

        <div className="p-5 sm:p-6">
          {step === 1 && (
            <div className="space-y-4">
              <p className="text-sm leading-relaxed text-neutral-600 dark:text-neutral-300">
                You can set up remote access on any Windows 11 computer by running a single
                PowerShell command as Administrator. Once registered, the background host service
                starts automatically whenever the computer turns on and reconnects over Wi-Fi.
              </p>

              <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-3.5 text-xs text-neutral-600 dark:border-neutral-800 dark:bg-[#1e1e1e] dark:text-neutral-400">
                Signed in as{' '}
                <strong className="font-medium text-neutral-900 dark:text-neutral-100">
                  {currentUsername}@gothwadtech.com
                </strong>
                . Only you (and people you explicitly share with) can connect using your 6-digit
                PIN.
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="inline-flex items-center gap-1.5 rounded-full bg-[#0494f4] px-5 py-2 text-xs font-medium text-white transition hover:bg-[#0382d6]"
                >
                  Begin
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="sm:col-span-1">
                  <label className="mb-1.5 block text-xs font-medium text-neutral-700 dark:text-neutral-300">
                    Computer name
                  </label>
                  <input
                    type="text"
                    value={pcName}
                    onChange={(e) => setPcName(e.target.value)}
                    placeholder="Home-Windows-PC"
                    className="w-full rounded-xl border border-neutral-300 bg-white px-3.5 py-2 text-sm text-neutral-900 focus:border-[#0494f4] focus:outline-hidden dark:border-neutral-700 dark:bg-[#1b1b1b] dark:text-white"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-medium text-neutral-700 dark:text-neutral-300">
                    Choose a 6-digit PIN
                  </label>
                  <input
                    type="password"
                    inputMode="numeric"
                    minLength={6}
                    maxLength={12}
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    placeholder="••••••"
                    className="w-full rounded-xl border border-neutral-300 bg-white px-3.5 py-2 font-mono text-sm tracking-widest text-neutral-900 focus:border-[#0494f4] focus:outline-hidden dark:border-neutral-700 dark:bg-[#1b1b1b] dark:text-white"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-medium text-neutral-700 dark:text-neutral-300">
                    Computer slot
                  </label>
                  <select
                    value={slot}
                    onChange={(e) => setSlot(Number(e.target.value))}
                    className="w-full rounded-xl border border-neutral-300 bg-white px-3.5 py-2 text-sm text-neutral-900 focus:border-[#0494f4] focus:outline-hidden dark:border-neutral-700 dark:bg-[#1b1b1b] dark:text-white"
                  >
                    <option value={1}>Slot 1 ({buildHostPeerId(currentUsername, 1)})</option>
                    <option value={2}>Slot 2 ({buildHostPeerId(currentUsername, 2)})</option>
                    <option value={3}>Slot 3 ({buildHostPeerId(currentUsername, 3)})</option>
                  </select>
                </div>
              </div>

              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-neutral-200 bg-neutral-50 p-3.5 transition hover:border-neutral-300 dark:border-neutral-800 dark:bg-[#1e1e1e] dark:hover:border-neutral-700">
                <input
                  type="checkbox"
                  checked={includeVm}
                  onChange={(e) => setIncludeVm(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-neutral-300 accent-[#0494f4]"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 text-xs font-medium text-neutral-900 dark:text-neutral-100">
                    <HardDrive className="h-3.5 w-3.5 text-neutral-500" />
                    Also set up an isolated Background VM (optional)
                  </div>
                  <p className="mt-0.5 text-xs leading-relaxed text-neutral-500 dark:text-neutral-400">
                    Secondary feature: provisions a Hyper-V virtual machine capped at 4 GB RAM so
                    you can work privately in the background without disturbing anyone using the
                    main Windows desktop.
                  </p>
                </div>
              </label>

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-medium text-neutral-600 transition hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Back
                </button>
                <button
                  type="button"
                  disabled={safePin.length < 6}
                  onClick={() => setStep(3)}
                  className="inline-flex items-center gap-1.5 rounded-full bg-[#0494f4] px-5 py-2 text-xs font-medium text-white transition hover:bg-[#0382d6] disabled:opacity-50"
                >
                  Next
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <p className="text-xs leading-relaxed text-neutral-600 sm:text-sm dark:text-neutral-300">
                Copy and run this command in <strong>Administrator PowerShell</strong> on your
                Windows 11 computer (Host ID: <code className="font-mono text-xs">{peerId}</code>):
              </p>

              <CopyCodeBlock
                title="1. Install & start Remote Desktop host"
                language="powershell"
                code={hostInstallCommand}
              />

              {includeVm && (
                <CopyCodeBlock
                  title="2. Optional: Provision isolated Hyper-V Background VM"
                  language="powershell"
                  code={optionalVmCommand}
                />
              )}

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-medium text-neutral-600 transition hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Back
                </button>
                <button
                  type="button"
                  onClick={onFinish}
                  className="inline-flex items-center gap-1.5 rounded-full bg-[#0494f4] px-5 py-2 text-xs font-medium text-white transition hover:bg-[#0382d6]"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Done
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
