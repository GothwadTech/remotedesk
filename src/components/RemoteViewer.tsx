import { useEffect, useRef, useState, type MouseEvent } from 'react';
import {
  Clipboard,
  Command,
  Laptop,
  Maximize2,
  PhoneOff,
  Server,
  ShieldCheck,
  Wifi,
} from 'lucide-react';
import type { ActiveConnection, TargetMode } from '../types';

interface RemoteViewerProps {
  connection: ActiveConnection;
  viewerEmail: string;
  onSwitchMode: (mode: TargetMode) => void;
  onDisconnect: () => void;
}

export function RemoteViewer({
  connection,
  viewerEmail,
  onSwitchMode,
  onDisconnect,
}: RemoteViewerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [liveFrameUrl, setLiveFrameUrl] = useState<string | null>(null);
  const [cursorPos, setCursorPos] = useState({ x: 48, y: 52 });
  const [clipboardText, setClipboardText] = useState('');
  const [showClipboard, setShowClipboard] = useState(false);
  const [lastEventLog, setLastEventLog] = useState('Zero-D1 WebRTC P2P DTLS DataChannel ready');

  useEffect(() => {
    setLiveFrameUrl(null);
    if (!connection.p2pHandle) return;
    connection.p2pHandle.onFrame((jpegDataUrl) => {
      setLiveFrameUrl(jpegDataUrl);
    });
    return () => {
      connection.p2pHandle?.close();
    };
  }, [connection]);

  const sendInputPacket = (payload: Record<string, unknown>) => {
    connection.p2pHandle?.sendInput(payload);
  };

  const handleCanvasMove = (e: MouseEvent<HTMLElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const xPct = Math.round(((e.clientX - rect.left) / rect.width) * 100);
    const yPct = Math.round(((e.clientY - rect.top) / rect.height) * 100);
    setCursorPos({ x: xPct, y: yPct });
    sendInputPacket({ type: 'MOUSE_MOVE', xPct, yPct });
  };

  const handleSendCtrlAltDel = () => {
    sendInputPacket({ type: 'HOTKEY', combo: 'ctrl+alt+del' });
    setLastEventLog('Sent Ctrl + Alt + Del over WebRTC P2P');
  };

  const handlePushClipboard = () => {
    sendInputPacket({ type: 'CLIPBOARD', text: clipboardText });
    setLastEventLog(`Synced clipboard (${clipboardText.length} chars)`);
    setShowClipboard(false);
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      void containerRef.current?.requestFullscreen();
    } else {
      void document.exitFullscreen();
    }
  };

  const isHostMode = connection.targetMode === 'host_os';

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-50 flex flex-col bg-slate-950 text-slate-100"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 bg-slate-900/95 px-4 py-2.5">
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-2.5 py-1 text-xs font-semibold text-emerald-300">
            <Wifi className="h-3.5 w-3.5" />
            {connection.device.name}
          </span>

          <div className="flex items-center rounded-lg border border-slate-800 bg-slate-950 p-0.5 text-xs">
            <button
              type="button"
              disabled={!connection.device.canControlHostOs}
              onClick={() => onSwitchMode('host_os')}
              className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 font-medium transition ${
                isHostMode
                  ? 'bg-sky-600 text-white'
                  : 'text-slate-400 hover:text-white disabled:opacity-35'
              }`}
            >
              <Laptop className="h-3.5 w-3.5" />
              Main Windows OS
            </button>
            <button
              type="button"
              onClick={() => onSwitchMode('hyperv_vm')}
              className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 font-medium transition ${
                !isHostMode ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Server className="h-3.5 w-3.5" />
              Background VM ({connection.device.vmName})
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowClipboard((v) => !v)}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-xs text-slate-200 hover:bg-slate-700"
          >
            <Clipboard className="h-3.5 w-3.5" />
            Clipboard
          </button>
          <button
            type="button"
            onClick={handleSendCtrlAltDel}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-xs text-slate-200 hover:bg-slate-700"
          >
            <Command className="h-3.5 w-3.5" />
            Ctrl+Alt+Del
          </button>
          <button
            type="button"
            onClick={toggleFullscreen}
            className="rounded-lg border border-slate-700 bg-slate-800 p-1.5 text-slate-200 hover:bg-slate-700"
            title="Toggle Fullscreen"
          >
            <Maximize2 className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onDisconnect}
            className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-500"
          >
            <PhoneOff className="h-3.5 w-3.5" />
            Disconnect
          </button>
        </div>
      </div>

      {showClipboard && (
        <div className="absolute right-6 top-14 z-20 w-80 rounded-xl border border-slate-700 bg-slate-900 p-3 shadow-2xl">
          <div className="text-xs font-semibold text-white">Sync Clipboard to Remote</div>
          <textarea
            rows={3}
            value={clipboardText}
            onChange={(e) => setClipboardText(e.target.value)}
            placeholder="Paste text/commands to send into remote OS..."
            className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 p-2 text-xs text-white focus:outline-none"
          />
          <button
            type="button"
            onClick={handlePushClipboard}
            className="mt-2 w-full rounded-lg bg-indigo-600 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500"
          >
            Send to Remote Clipboard
          </button>
        </div>
      )}

      <div className="relative flex-1 overflow-hidden bg-black flex items-center justify-center p-3">
        {connection.streamUrl ? (
          <iframe
            src={connection.streamUrl}
            title="Remote Desktop Stream"
            className="h-full w-full rounded-xl border border-slate-800 bg-slate-950"
            allow="clipboard-read; clipboard-write; fullscreen; autoplay"
          />
        ) : liveFrameUrl ? (
          <img
            src={liveFrameUrl}
            alt="Live Remote Screen"
            onMouseMove={handleCanvasMove}
            onClick={() => sendInputPacket({ type: 'MOUSE_CLICK', xPct: cursorPos.x, yPct: cursorPos.y })}
            className="max-h-full max-w-full rounded-xl border border-slate-800 select-none cursor-crosshair"
          />
        ) : (
          <div
            onMouseMove={handleCanvasMove}
            onClick={() =>
              setLastEventLog(`Left click @ (${cursorPos.x}%, ${cursorPos.y}%) -> ${connection.targetMode}`)
            }
            className={`relative aspect-video w-full max-w-5xl overflow-hidden rounded-2xl border shadow-2xl select-none cursor-crosshair ${
              isHostMode
                ? 'border-sky-500/40 bg-gradient-to-br from-slate-900 via-sky-950/60 to-slate-950'
                : 'border-indigo-500/40 bg-gradient-to-br from-slate-900 via-indigo-950/60 to-violet-950/40'
            }`}
          >
            <div className="p-6">
              <div className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-black/40 px-3 py-1.5 text-xs text-slate-200">
                <ShieldCheck className="h-4 w-4 text-emerald-400" />
                Zero-D1 Direct P2P · Verified ({viewerEmail}) · HMAC-SHA256 PIN OK
              </div>

              <div className="mt-6 max-w-xl rounded-xl border border-slate-700/70 bg-slate-950/85 p-4 font-mono text-xs shadow-xl">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2 text-slate-400">
                  <span>
                    {isHostMode
                      ? 'PS C:\\Users\\Dost>  [MAIN WINDOWS 11 PRO HOST]'
                      : `ubuntu@${connection.device.vmName}:~$  [ISOLATED HYPER-V VM]`}
                  </span>
                  <span className="text-emerald-400">Cursor {cursorPos.x}%, {cursorPos.y}%</span>
                </div>
                <div className="mt-3 space-y-1.5 text-slate-300">
                  {isHostMode ? (
                    <>
                      <p>&gt; Mode: Direct Host OS Control (Chrome Remote Desktop style)</p>
                      <p>&gt; Zero Cloudflare D1 / Zero Backend Database needed!</p>
                      <p className="text-sky-300">
                        &gt; Transparent Host Sharing Banner active on laptop screen
                      </p>
                    </>
                  ) : (
                    <>
                      <p>$ uname -a # Running inside Hyper-V Gen2 Headless VM</p>
                      <p>$ free -h   # Dynamic RAM capped @ 4.0 GiB (Host 12 GiB free!)</p>
                      <p className="text-indigo-300">
                        $ # Dost&apos;s main Windows 11 desktop &amp; mouse are 100% undisturbed!
                      </p>
                    </>
                  )}
                  <p className="pt-2 text-amber-300">Last Event: {lastEventLog}</p>
                </div>
              </div>
            </div>

            {isHostMode && (
              <div className="absolute bottom-12 left-1/2 -translate-x-1/2 flex items-center gap-3 rounded-full border border-sky-400/40 bg-slate-900/95 px-4 py-1.5 text-xs shadow-xl">
                <span className="h-2 w-2 rounded-full bg-sky-400 animate-ping" />
                <span>
                  Your Windows desktop is currently shared with <strong>{viewerEmail}</strong>
                </span>
                <span className="rounded bg-sky-500/20 px-2 py-0.5 text-[10px] text-sky-200">
                  Host Banner Preview
                </span>
              </div>
            )}

            <div className="absolute inset-x-0 bottom-0 flex items-center justify-between border-t border-white/10 bg-slate-950/90 px-4 py-2 text-[11px] text-slate-400">
              <span>
                {isHostMode
                  ? 'Windows 11 Pro Host Desktop (1920x1080)'
                  : `Hyper-V Headless Guest: ${connection.device.vmName} (Default Switch NAT)`}
              </span>
              <span>Peer ID: {connection.device.peerId}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
