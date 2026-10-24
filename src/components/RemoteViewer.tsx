import { useEffect, useRef, useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Clipboard,
  Command,
  FolderOpen,
  Hand,
  HardDrive,
  Keyboard,
  Maximize2,
  Minimize2,
  Monitor,
  MousePointer,
  X,
} from 'lucide-react';
import type { ActiveConnection, TargetMode } from '../types';
import { RemoteAdminDrawer } from './RemoteAdminDrawer';

interface RemoteViewerProps {
  connection: ActiveConnection;
  onSwitchMode: (mode: TargetMode) => void;
  onDisconnect: () => void;
}

export function RemoteViewer({ connection, onSwitchMode, onDisconnect }: RemoteViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const mobileInputRef = useRef<HTMLInputElement>(null);

  const [barOpen, setBarOpen] = useState(true);
  const [adminOpen, setAdminOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [touchMode, setTouchMode] = useState<'touch' | 'trackpad'>('touch');
  const [cursor, setCursor] = useState({ x: 50, y: 50 });
  const [liveFrame, setLiveFrame] = useState<string | null>(null);
  const [typedPreview, setTypedPreview] = useState('');
  const [toast, setToast] = useState<string | null>(null);

  const dragRef = useRef<{ lastX: number; lastY: number } | null>(null);
  const isHostOs = connection.targetMode === 'host_os';
  const canSwitch = connection.device.canControlHostOs && connection.device.canControlVm;

  useEffect(() => {
    connection.p2pHandle?.onFrame((jpegUrl) => setLiveFrame(jpegUrl));
  }, [connection]);

  useEffect(() => {
    const onFsChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  const flashToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 1800);
  };

  const toggleFullscreen = async () => {
    if (!document.fullscreenElement && containerRef.current) {
      await containerRef.current.requestFullscreen().catch(() => undefined);
    } else if (document.fullscreenElement) {
      await document.exitFullscreen().catch(() => undefined);
    }
  };

  const sendPointer = (
    type: 'move' | 'click' | 'right_click' | 'double_click' | 'wheel',
    xPct: number,
    yPct: number,
    deltaY?: number,
  ) => {
    const clampedX = Math.max(0, Math.min(100, xPct));
    const clampedY = Math.max(0, Math.min(100, yPct));
    setCursor({ x: clampedX, y: clampedY });
    connection.p2pHandle?.sendInput({
      type: 'MOUSE',
      action: type,
      x: Number((clampedX / 100).toFixed(4)),
      y: Number((clampedY / 100).toFixed(4)),
      deltaY,
    });
  };

  const coordsFromMouse = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return {
      xPct: ((e.clientX - rect.left) / rect.width) * 100,
      yPct: ((e.clientY - rect.top) / rect.height) * 100,
    };
  };

  const handleStageClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (touchMode === 'trackpad') {
      sendPointer('click', cursor.x, cursor.y);
      return;
    }
    const { xPct, yPct } = coordsFromMouse(e);
    sendPointer('click', xPct, yPct);
  };

  const handleStageContextMenu = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    const { xPct, yPct } = coordsFromMouse(e);
    sendPointer('right_click', xPct, yPct);
  };

  const handleStageDoubleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const { xPct, yPct } = coordsFromMouse(e);
    sendPointer('double_click', xPct, yPct);
  };

  const handleStageWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    sendPointer('wheel', cursor.x, cursor.y, e.deltaY > 0 ? -120 : 120);
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (touchMode !== 'trackpad' || e.touches.length !== 1) return;
    dragRef.current = { lastX: e.touches[0].clientX, lastY: e.touches[0].clientY };
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (touchMode !== 'trackpad' || !dragRef.current || e.touches.length !== 1 || !stageRef.current)
      return;
    const rect = stageRef.current.getBoundingClientRect();
    const dx = ((e.touches[0].clientX - dragRef.current.lastX) / rect.width) * 125;
    const dy = ((e.touches[0].clientY - dragRef.current.lastY) / rect.height) * 125;
    dragRef.current = { lastX: e.touches[0].clientX, lastY: e.touches[0].clientY };
    sendPointer('move', cursor.x + dx, cursor.y + dy);
  };

  const handleSendCtrlAltDel = () => {
    connection.p2pHandle?.sendInput({ type: 'KEY_COMBO', keys: ['Control', 'Alt', 'Delete'] });
    flashToast('Sent Task Manager shortcut');
  };

  const handleSyncClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        connection.p2pHandle?.sendInput({ type: 'CLIPBOARD', text });
        flashToast('Clipboard sent to remote computer');
      } else {
        flashToast('Clipboard is empty');
      }
    } catch {
      flashToast('Clipboard permission denied by browser');
    }
  };

  const openMobileKeyboard = () => {
    mobileInputRef.current?.focus();
    flashToast('Keyboard active');
  };

  const handleHiddenKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    connection.p2pHandle?.sendInput({ type: 'KEY', key: e.key });
    if (e.key === 'Backspace') {
      setTypedPreview((prev) => prev.slice(0, -1));
    } else if (e.key.length === 1) {
      setTypedPreview((prev) => (prev + e.key).slice(-48));
    }
  };

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      onKeyDown={(e) => {
        if (adminOpen || document.activeElement === mobileInputRef.current) return;
        connection.p2pHandle?.sendInput({ type: 'KEY', key: e.key });
      }}
      className="fixed inset-0 z-50 flex flex-col bg-black text-white select-none focus:outline-hidden"
    >
      {/* Hidden input to summon virtual keyboard on Android / iOS */}
      <input
        ref={mobileInputRef}
        type="text"
        aria-label="Remote keyboard input"
        autoCapitalize="off"
        autoCorrect="off"
        spellCheck={false}
        value=""
        onChange={(e) => {
          const val = e.target.value;
          if (val) {
            connection.p2pHandle?.sendInput({ type: 'TEXT', text: val });
            setTypedPreview((prev) => (prev + val).slice(-48));
          }
        }}
        onKeyDown={handleHiddenKeyDown}
        className="pointer-events-none fixed -top-20 left-0 h-1 w-1 opacity-0"
      />

      {/* Collapsible Chrome Remote Desktop floating top control bar */}
      <div className="pointer-events-none fixed inset-x-0 top-0 z-30 flex flex-col items-center px-2 pt-2">
        {!barOpen ? (
          <button
            type="button"
            onClick={() => setBarOpen(true)}
            aria-label="Show session controls"
            className="pointer-events-auto flex h-7 w-14 items-center justify-center rounded-b-xl border border-t-0 border-neutral-700 bg-[#212121]/90 text-neutral-300 shadow-lg backdrop-blur-md transition hover:text-white"
          >
            <ChevronDown className="h-4 w-4" />
          </button>
        ) : (
          <div className="pointer-events-auto flex max-w-full flex-wrap items-center justify-center gap-1 rounded-2xl border border-neutral-700/90 bg-[#212121]/95 px-2.5 py-1.5 shadow-2xl backdrop-blur-md sm:gap-1.5 sm:px-3">
            <div className="flex items-center gap-2 pr-1.5 text-xs">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              <span className="max-w-[110px] truncate font-medium text-neutral-100 sm:max-w-[170px]">
                {connection.device.name}
              </span>
              <span className="hidden rounded-md bg-neutral-800 px-1.5 py-0.5 text-[10px] text-neutral-300 sm:inline">
                {isHostOs ? 'Main Desktop' : 'Background VM'}
              </span>
            </div>

            <div className="h-4 w-px bg-neutral-700" />

            <button
              type="button"
              onClick={openMobileKeyboard}
              title="Open keyboard"
              className="inline-flex h-8 items-center gap-1 rounded-lg px-2 text-xs text-neutral-200 transition hover:bg-neutral-800"
            >
              <Keyboard className="h-4 w-4" />
              <span className="hidden md:inline">Keyboard</span>
            </button>

            <button
              type="button"
              onClick={() => setTouchMode((m) => (m === 'touch' ? 'trackpad' : 'touch'))}
              title={touchMode === 'touch' ? 'Direct touch mode' : 'Trackpad cursor mode'}
              className="inline-flex h-8 items-center gap-1 rounded-lg px-2 text-xs text-neutral-200 transition hover:bg-neutral-800"
            >
              {touchMode === 'touch' ? (
                <Hand className="h-4 w-4" />
              ) : (
                <MousePointer className="h-4 w-4" />
              )}
              <span className="hidden lg:inline">
                {touchMode === 'touch' ? 'Touch' : 'Trackpad'}
              </span>
            </button>

            {connection.adminEnabled && (
              <button
                type="button"
                onClick={() => setAdminOpen((v) => !v)}
                title="Files, PowerShell & Task Manager"
                className={`inline-flex h-8 items-center gap-1 rounded-lg px-2 text-xs transition ${
                  adminOpen
                    ? 'bg-[#0494f4] text-white'
                    : 'text-neutral-200 hover:bg-neutral-800'
                }`}
              >
                <FolderOpen className="h-4 w-4" />
                <span className="hidden sm:inline">Tools</span>
              </button>
            )}

            {canSwitch && (
              <button
                type="button"
                onClick={() => onSwitchMode(isHostOs ? 'hyperv_vm' : 'host_os')}
                title={isHostOs ? 'Switch to Background VM' : 'Switch to Main Desktop'}
                className="inline-flex h-8 items-center gap-1 rounded-lg px-2 text-xs text-neutral-200 transition hover:bg-neutral-800"
              >
                {isHostOs ? <HardDrive className="h-4 w-4" /> : <Monitor className="h-4 w-4" />}
                <span className="hidden md:inline">{isHostOs ? 'VM' : 'Desktop'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleSendCtrlAltDel}
              title="Open remote Task Manager"
              className="inline-flex h-8 items-center gap-1 rounded-lg px-2 text-xs text-neutral-200 transition hover:bg-neutral-800"
            >
              <Command className="h-4 w-4" />
            </button>

            <button
              type="button"
              onClick={() => void handleSyncClipboard()}
              title="Send clipboard"
              className="inline-flex h-8 items-center gap-1 rounded-lg px-2 text-xs text-neutral-200 transition hover:bg-neutral-800"
            >
              <Clipboard className="h-4 w-4" />
            </button>

            <button
              type="button"
              onClick={() => void toggleFullscreen()}
              title="Toggle fullscreen"
              className="hidden h-8 items-center justify-center rounded-lg px-2 text-neutral-200 transition hover:bg-neutral-800 sm:inline-flex"
            >
              {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </button>

            <button
              type="button"
              onClick={onDisconnect}
              title="Disconnect"
              className="inline-flex h-8 items-center gap-1 rounded-lg bg-red-600 px-2.5 text-xs font-medium text-white transition hover:bg-red-500"
            >
              <X className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Disconnect</span>
            </button>

            <button
              type="button"
              onClick={() => setBarOpen(false)}
              aria-label="Hide toolbar"
              className="inline-flex h-8 w-7 items-center justify-center rounded-lg text-neutral-400 transition hover:bg-neutral-800 hover:text-white"
            >
              <ChevronUp className="h-4 w-4" />
            </button>
          </div>
        )}

        {toast && (
          <div className="mt-2 rounded-full bg-neutral-900/95 px-3.5 py-1 text-xs text-neutral-200 shadow-lg ring-1 ring-neutral-700">
            {toast}
          </div>
        )}
      </div>

      {/* Main remote screen canvas */}
      <div
        ref={stageRef}
        onClick={handleStageClick}
        onContextMenu={handleStageContextMenu}
        onDoubleClick={handleStageDoubleClick}
        onWheel={handleStageWheel}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        className="relative flex flex-1 items-center justify-center overflow-hidden bg-black"
      >
        {connection.streamUrl ? (
          <iframe
            src={connection.streamUrl}
            title={connection.device.name}
            className="h-full w-full border-0"
            allow="clipboard-read; clipboard-write; fullscreen"
          />
        ) : liveFrame ? (
          <img
            src={liveFrame}
            alt={connection.device.name}
            className="max-h-full max-w-full object-contain"
            draggable={false}
          />
        ) : (
          /* Interactive preview desktop when testing with the built-in Demo computer */
          <div
            className={`relative flex aspect-video w-full max-w-6xl flex-col justify-between overflow-hidden rounded-lg border border-neutral-800 p-4 sm:p-8 ${
              isHostOs
                ? 'bg-gradient-to-br from-[#0f2942] via-[#102033] to-[#1a1a2e]'
                : 'bg-gradient-to-br from-[#1f2421] via-[#182026] to-[#141414]'
            }`}
          >
            {isHostOs && (
              <div className="mx-auto flex items-center gap-2 rounded-full border border-white/15 bg-black/50 px-3.5 py-1 text-[11px] text-neutral-200 backdrop-blur-xs">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                Your desktop is currently shared with Remote Desktop.
              </div>
            )}

            <div className="my-auto mx-auto max-w-md rounded-2xl border border-white/10 bg-black/40 p-5 text-center backdrop-blur-md">
              <p className="text-sm font-medium text-white">
                {isHostOs ? 'Windows 11 Main Desktop (Preview)' : 'Isolated Background VM (Preview)'}
              </p>
              <p className="mt-1 text-xs text-neutral-300">
                Tap anywhere to click, or open Tools in the top bar for Files, PowerShell &amp;
                Tasks.
              </p>
              {typedPreview && (
                <div className="mt-3 rounded-lg bg-black/60 px-3 py-1.5 font-mono text-xs text-emerald-300">
                  {typedPreview}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between rounded-xl border border-white/10 bg-black/55 px-4 py-2 text-xs text-neutral-300 backdrop-blur-md">
              <span>{isHostOs ? 'Windows 11 Pro' : `VM: ${connection.device.vmName} (4 GB RAM)`}</span>
              <span className="font-mono text-[11px] text-neutral-400">
                {Math.round(cursor.x)}%, {Math.round(cursor.y)}%
              </span>
            </div>

            <div
              style={{ left: `${cursor.x}%`, top: `${cursor.y}%` }}
              className="pointer-events-none absolute -translate-x-1 -translate-y-1 transition-all duration-75"
            >
              <div className="h-3.5 w-3.5 rounded-full border-2 border-white bg-[#0494f4] shadow-md" />
            </div>
          </div>
        )}
      </div>

      <RemoteAdminDrawer
        open={adminOpen}
        p2pHandle={connection.p2pHandle}
        onClose={() => setAdminOpen(false)}
      />
    </div>
  );
}
