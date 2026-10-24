import { useEffect, useState } from 'react';
import {
  Activity,
  ArrowUp,
  Download,
  FileText,
  Folder,
  Play,
  RefreshCw,
  Terminal,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import type { P2PSessionHandle } from '../types';

interface RemoteAdminDrawerProps {
  open: boolean;
  p2pHandle: P2PSessionHandle | null;
  onClose: () => void;
}

interface FsEntry {
  name: string;
  path: string;
  isDir: boolean;
  size: number;
}

interface ProcEntry {
  pid: number;
  name: string;
  ramMb: number;
  cpu: number;
}

export function RemoteAdminDrawer({ open, p2pHandle, onClose }: RemoteAdminDrawerProps) {
  const [tab, setTab] = useState<'files' | 'shell' | 'tasks'>('files');
  const [busy, setBusy] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  // Files state
  const [currentPath, setCurrentPath] = useState('');
  const [parentPath, setParentPath] = useState('__roots__');
  const [entries, setEntries] = useState<FsEntry[]>([]);

  // PowerShell state
  const [cmdInput, setCmdInput] = useState('Get-ComputerInfo | Select-Object CsName, WindowsProductName');
  const [cmdLog, setCmdLog] = useState('Administrator PowerShell ready.\n');

  // Task manager state
  const [sysInfo, setSysInfo] = useState<{
    cpuPercent: number;
    ramUsedMb: number;
    ramTotalMb: number;
    batteryPercent: number | null;
    powerPlugged: boolean | null;
    processes: ProcEntry[];
  } | null>(null);

  const loadFolder = async (pathReq = '__roots__') => {
    if (!p2pHandle) return;
    setBusy(true);
    setStatusMsg(null);
    try {
      const res = await p2pHandle.requestAdmin({ op: 'FS_LIST', path: pathReq });
      if (res.error) {
        setStatusMsg(String(res.error));
      } else {
        setCurrentPath(String(res.path || ''));
        setParentPath(String(res.parent || '__roots__'));
        setEntries((res.entries as FsEntry[]) || []);
      }
    } catch (err) {
      setStatusMsg(err instanceof Error ? err.message : 'Failed to list folder');
    } finally {
      setBusy(false);
    }
  };

  const loadTasks = async () => {
    if (!p2pHandle) return;
    setBusy(true);
    try {
      const res = await p2pHandle.requestAdmin({ op: 'SYS_SNAPSHOT' });
      setSysInfo({
        cpuPercent: Number(res.cpuPercent || 0),
        ramUsedMb: Number(res.ramUsedMb || 0),
        ramTotalMb: Number(res.ramTotalMb || 16384),
        batteryPercent: typeof res.batteryPercent === 'number' ? res.batteryPercent : null,
        powerPlugged: typeof res.powerPlugged === 'boolean' ? res.powerPlugged : null,
        processes: (res.processes as ProcEntry[]) || [],
      });
    } catch (err) {
      setStatusMsg(err instanceof Error ? err.message : 'Failed to load tasks');
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (!open || !p2pHandle) return;
    if (tab === 'files') void loadFolder(currentPath || '__roots__');
    if (tab === 'tasks') void loadTasks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, tab]);

  if (!open) return null;

  const handleDownloadFile = async (entry: FsEntry) => {
    if (!p2pHandle) return;
    setBusy(true);
    try {
      const res = await p2pHandle.requestAdmin({ op: 'FS_READ', path: entry.path });
      if (res.error) {
        setStatusMsg(String(res.error));
        return;
      }
      const b64 = String(res.dataBase64 || '');
      const bin = atob(b64);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      const blob = new Blob([bytes]);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = String(res.name || entry.name);
      a.click();
      URL.revokeObjectURL(url);
      setStatusMsg(`Downloaded ${entry.name}`);
    } finally {
      setBusy(false);
    }
  };

  const handleUploadFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !p2pHandle) return;
    setBusy(true);
    try {
      const buf = new Uint8Array(await file.arrayBuffer());
      let bin = '';
      for (let i = 0; i < buf.length; i++) bin += String.fromCharCode(buf[i]);
      const res = await p2pHandle.requestAdmin({
        op: 'FS_WRITE',
        dir: currentPath,
        name: file.name,
        dataBase64: btoa(bin),
      });
      if (res.error) setStatusMsg(String(res.error));
      else {
        setStatusMsg(`Uploaded to ${String(res.path)}`);
        await loadFolder(currentPath || '__roots__');
      }
    } finally {
      setBusy(false);
      e.target.value = '';
    }
  };

  const handleRunCmd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!p2pHandle || !cmdInput.trim()) return;
    const toRun = cmdInput.trim();
    setBusy(true);
    setCmdLog((prev) => `${prev}\n> ${toRun}\n`);
    try {
      const res = await p2pHandle.requestAdmin({ op: 'EXEC_CMD', command: toRun });
      setCmdLog((prev) => `${prev}${String(res.output || '(completed with no output)')}\n`);
    } catch (err) {
      setCmdLog((prev) => `${prev}Error: ${err instanceof Error ? err.message : 'Failed'}\n`);
    } finally {
      setBusy(false);
    }
  };

  const handleKillProc = async (pid: number) => {
    if (!p2pHandle) return;
    await p2pHandle.requestAdmin({ op: 'PROC_KILL', pid });
    await loadTasks();
  };

  return (
    <div className="fixed inset-y-0 right-0 z-40 flex w-full max-w-md flex-col border-l border-neutral-800 bg-[#212121] text-neutral-100 shadow-2xl">
      <div className="flex items-center justify-between border-b border-neutral-800 px-4 py-3">
        <div className="flex items-center gap-1 rounded-xl bg-[#181818] p-1">
          <button
            type="button"
            onClick={() => setTab('files')}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
              tab === 'files' ? 'bg-[#0494f4] text-white' : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Folder className="h-3.5 w-3.5" />
            Files
          </button>
          <button
            type="button"
            onClick={() => setTab('shell')}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
              tab === 'shell' ? 'bg-[#0494f4] text-white' : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Terminal className="h-3.5 w-3.5" />
            PowerShell
          </button>
          <button
            type="button"
            onClick={() => setTab('tasks')}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
              tab === 'tasks' ? 'bg-[#0494f4] text-white' : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Activity className="h-3.5 w-3.5" />
            Tasks
          </button>
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label="Close admin panel"
          className="rounded-full p-1.5 text-neutral-400 transition hover:bg-neutral-800 hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {statusMsg && (
        <div className="border-b border-neutral-800 bg-neutral-900 px-4 py-2 text-xs text-neutral-300">
          {statusMsg}
        </div>
      )}

      {tab === 'files' && (
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="flex items-center justify-between gap-2 border-b border-neutral-800 px-4 py-2.5">
            <div className="flex min-w-0 items-center gap-1.5">
              {currentPath && (
                <button
                  type="button"
                  onClick={() => void loadFolder(parentPath)}
                  className="rounded-lg bg-neutral-800 p-1.5 text-neutral-300 hover:text-white"
                  title="Up one folder"
                >
                  <ArrowUp className="h-3.5 w-3.5" />
                </button>
              )}
              <span className="truncate font-mono text-xs text-neutral-300">
                {currentPath || 'Drives & Quick Folders'}
              </span>
            </div>

            <label className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full bg-[#0494f4] px-3 py-1 text-xs font-medium text-white hover:bg-[#0382d6]">
              <Upload className="h-3.5 w-3.5" />
              Upload
              <input type="file" onChange={(e) => void handleUploadFile(e)} className="hidden" />
            </label>
          </div>

          <div className="flex-1 divide-y divide-neutral-800/80 overflow-y-auto">
            {entries.map((item) => (
              <div
                key={item.path}
                className="flex items-center justify-between gap-2 px-4 py-2.5 hover:bg-white/[0.03]"
              >
                <button
                  type="button"
                  onClick={() => item.isDir && void loadFolder(item.path)}
                  className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
                >
                  {item.isDir ? (
                    <Folder className="h-4 w-4 shrink-0 text-[#0494f4]" />
                  ) : (
                    <FileText className="h-4 w-4 shrink-0 text-neutral-400" />
                  )}
                  <span className="truncate text-xs text-neutral-200">{item.name}</span>
                </button>
                {!item.isDir && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void handleDownloadFile(item)}
                    className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-800 hover:text-white"
                    title="Download file"
                  >
                    <Download className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'shell' && (
        <div className="flex min-h-0 flex-1 flex-col p-4">
          <pre className="flex-1 overflow-y-auto rounded-xl border border-neutral-800 bg-[#141414] p-3 font-mono text-xs leading-relaxed whitespace-pre-wrap text-emerald-300">
            {cmdLog}
          </pre>
          <form onSubmit={(e) => void handleRunCmd(e)} className="mt-3 flex gap-2">
            <input
              type="text"
              value={cmdInput}
              onChange={(e) => setCmdInput(e.target.value)}
              placeholder="Enter PowerShell command..."
              className="min-w-0 flex-1 rounded-xl border border-neutral-700 bg-[#181818] px-3 py-2 font-mono text-xs text-white focus:border-[#0494f4] focus:outline-hidden"
            />
            <button
              type="submit"
              disabled={busy}
              className="inline-flex items-center gap-1 rounded-xl bg-[#0494f4] px-3.5 py-2 text-xs font-medium text-white hover:bg-[#0382d6] disabled:opacity-50"
            >
              <Play className="h-3.5 w-3.5" />
              Run
            </button>
          </form>
        </div>
      )}

      {tab === 'tasks' && (
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="flex items-center justify-between border-b border-neutral-800 px-4 py-3 text-xs">
            <div className="flex flex-wrap gap-3 text-neutral-300">
              <span>CPU: {sysInfo?.cpuPercent ?? 0}%</span>
              <span>
                RAM: {sysInfo?.ramUsedMb ?? 0} / {sysInfo?.ramTotalMb ?? 0} MB
              </span>
              {sysInfo?.batteryPercent !== null && sysInfo?.batteryPercent !== undefined && (
                <span>
                  Battery: {sysInfo.batteryPercent}% {sysInfo.powerPlugged ? '(AC)' : ''}
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={() => void loadTasks()}
              className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-800 hover:text-white"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${busy ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <div className="flex-1 divide-y divide-neutral-800/80 overflow-y-auto">
            {(sysInfo?.processes || []).map((proc) => (
              <div key={proc.pid} className="flex items-center justify-between px-4 py-2 text-xs">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-neutral-200">{proc.name}</p>
                  <p className="text-[11px] text-neutral-400">
                    PID {proc.pid} · {proc.ramMb} MB · {proc.cpu}% CPU
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void handleKillProc(proc.pid)}
                  title="End process"
                  className="rounded-lg p-1.5 text-neutral-400 hover:bg-red-500/15 hover:text-red-400"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
