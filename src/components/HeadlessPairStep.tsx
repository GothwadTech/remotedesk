import { useState } from 'react';
import { Download, KeyRound, ShieldAlert } from 'lucide-react';
import { buildHostPeerId } from '../lib/protocol';
import { CopyCodeBlock } from './CopyCodeBlock';

interface HeadlessPairStepProps {
  username: string;
  userEmail: string;
  vmName: string;
  stepNumber: number;
}

const RELEASE_EXE_URL =
  'https://github.com/GothwadTech/remotedesktop/releases/latest/download/GothwadRemoteAgent-win64.exe';
const RELEASE_ZIP_URL =
  'https://github.com/GothwadTech/remotedesktop/releases/latest/download/GothwadRemoteSetup-win64.zip';

export function HeadlessPairStep({
  username,
  userEmail,
  vmName,
  stepNumber,
}: HeadlessPairStepProps) {
  const [slot, setSlot] = useState(1);
  const [deviceLabel, setDeviceLabel] = useState('Dost-Win11Pro-Laptop');

  const peerId = buildHostPeerId(username, slot);

  const oneLinePs = `irm https://raw.githubusercontent.com/GothwadTech/remotedesktop/main/scripts/install-gothwad-agent.ps1 -OutFile setup.ps1; .\\setup.ps1 -GothwadUser "${username}" -Slot ${slot} -DeviceName "${deviceLabel}" -VMName "${vmName}"`;

  const manualExeCmd = `.\\GothwadRemoteAgent-win64.exe --pair --gothwad-user "${username}" --slot ${slot} --device-name "${deviceLabel}" --vm-name "${vmName}" --pin 123456 --confirm-owner-consent`;

  return (
    <section className="rounded-2xl border border-indigo-500/30 bg-slate-900/80 p-5 shadow-xl">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white">
            {stepNumber}
          </span>
          <h3 className="text-base font-bold text-white">
            Link Windows PC to Your Gothwad Account (Zero-Database WebRTC P2P)
          </h3>
        </div>
        <span className="rounded-full bg-indigo-500/15 px-2.5 py-0.5 text-[11px] font-medium text-indigo-300">
          Peer ID: {peerId}
        </span>
      </div>

      <p className="mt-2 text-xs text-slate-300">
        Koi cloud database ki zaroorat nahi! Windows Agent seedha aapke Gothwad Account (
        <strong>{userEmail}</strong>) ke P2P slot (<code>{peerId}</code>) par encrypted WebRTC se
        connect hota hai aur <strong>HMAC-SHA256 6-digit PIN</strong> verify karta hai.
      </p>

      <div className="mt-3 flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200">
        <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
        <span>
          <strong>Consent Rule:</strong> Yeh command sirf PC owner ki permission se Admin PowerShell
          me run karein. Script aapse <code>YES</code> consent aur aapka <strong>6-digit PIN</strong>{' '}
          set karne ko kahega (PIN sirf us PC par encrypted rehta hai).
        </span>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="block text-xs font-medium text-slate-300">
            Computer Name (Dashboard Label)
          </label>
          <input
            type="text"
            value={deviceLabel}
            onChange={(e) => setDeviceLabel(e.target.value)}
            placeholder="e.g. Dost-Win11Pro-Laptop"
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white focus:border-indigo-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-300">
            PC Slot Number (Har alag PC ke liye 1..6 chunein)
          </label>
          <select
            value={slot}
            onChange={(e) => setSlot(Number(e.target.value))}
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white"
          >
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <option key={n} value={n}>
                Slot {n} ({buildHostPeerId(username, n)})
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-4 space-y-4">
        <div>
          <div className="flex items-center gap-1.5 text-xs font-semibold text-white">
            <KeyRound className="h-3.5 w-3.5 text-indigo-400" />
            Method A (Recommended): 1-Command Auto Download + Install + Startup Service
          </div>
          <p className="text-[11px] text-slate-400">
            Windows par <code>Win + X</code> &rarr; <strong>Terminal (Admin)</strong> kholkar yeh
            single command paste karein:
          </p>
          <CopyCodeBlock label="Windows PowerShell (Run as Administrator)" command={oneLinePs} />
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="text-xs font-semibold text-slate-200">
                Method B: Manual EXE / ZIP Download (GitHub Releases)
              </div>
              <p className="text-[11px] text-slate-400">
                Standalone <code>.exe</code> download karke manually pair karne ke liye:
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <a
                href={RELEASE_EXE_URL}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-medium text-white hover:border-indigo-500"
              >
                <Download className="h-3.5 w-3.5 text-indigo-400" />
                Agent .EXE
              </a>
              <a
                href={RELEASE_ZIP_URL}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-200 hover:border-indigo-500"
              >
                <Download className="h-3.5 w-3.5 text-emerald-400" />
                Full Bundle .ZIP
              </a>
            </div>
          </div>
          <CopyCodeBlock
            label="Manual EXE Pairing (Replace 123456 with your PIN)"
            command={manualExeCmd}
          />
        </div>
      </div>
    </section>
  );
}
