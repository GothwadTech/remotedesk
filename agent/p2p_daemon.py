"""
Zero-D1 WebRTC P2P Host Daemon (Screen Stream, Win32 Input & Admin RPC)
=======================================================================
Connects to PeerJS signaling with STUN + OpenRelay TURN (CGNAT traversal),
verifies HMAC-SHA256 6-digit PIN proofs, streams the desktop, executes native
Win32 mouse/keyboard input, and handles authenticated Administrator tools.
"""

from __future__ import annotations

import asyncio
import base64
import hashlib
import hmac
import io
import json
import platform
import secrets
import subprocess
import threading
import time
from typing import Any, Dict, List

try:
    import psutil
except ImportError:  # pragma: no cover
    psutil = None  # type: ignore[assignment]

from admin_tools import (
    handle_exec_cmd,
    handle_fs_list,
    handle_fs_read,
    handle_fs_write,
    handle_proc_kill,
    handle_sys_snapshot,
)
from installer_win import load_config, sanitize_username
from win_input import (
    handle_key_combo,
    handle_key_packet,
    handle_mouse_packet,
    send_unicode_text,
    set_host_clipboard,
)

PEERJS_WS = "wss://0.peerjs.com/peerjs?key=peerjs&id={peer_id}&token={token}&version=1.5.5"


def compute_expected_proof(pin: str, nonce: str, viewer: str, mode: str) -> str:
    msg = f"{nonce}:{sanitize_username(viewer)}:{mode}".encode("utf-8")
    return hmac.new(pin.encode("utf-8"), msg, hashlib.sha256).hexdigest()


def query_hyperv_state(vm_name: str) -> str:
    if platform.system() != "Windows":
        return "Off"
    try:
        res = subprocess.run(
            [
                "powershell",
                "-NoProfile",
                "-Command",
                f"(Get-VM -Name '{vm_name}' -ErrorAction SilentlyContinue).State",
            ],
            capture_output=True,
            text=True,
            timeout=5,
        )
        st = res.stdout.strip()
        return st if st in ("Running", "Saved", "Paused", "Off") else "Off"
    except Exception:
        return "Off"


def run_hyperv_action(vm_name: str, action: str) -> None:
    if platform.system() != "Windows":
        return
    mapping = {
        "start_vm": f"Start-VM -Name '{vm_name}'",
        "save_vm": f"Save-VM -Name '{vm_name}'",
        "restart_vm": f"Restart-VM -Name '{vm_name}' -Force",
    }
    cmd = mapping.get(action)
    if cmd:
        subprocess.run(["powershell", "-NoProfile", "-Command", cmd], capture_output=True, timeout=30)


def show_host_sharing_banner(viewer_username: str, stop_event: threading.Event) -> None:
    try:
        import tkinter as tk

        root = tk.Tk()
        root.title("Gothwad Remote Desktop")
        root.attributes("-topmost", True)
        root.overrideredirect(True)
        root.configure(bg="#212121")

        frame = tk.Frame(
            root,
            bg="#212121",
            padx=14,
            pady=7,
            highlightthickness=1,
            highlightbackground="#404040",
        )
        frame.pack()
        tk.Label(
            frame,
            text=f"Your desktop is currently shared with {viewer_username}@gothwadtech.com",
            fg="#f5f5f5",
            bg="#212121",
            font=("Segoe UI", 9),
        ).pack(side=tk.LEFT, padx=(0, 12))

        def on_stop() -> None:
            stop_event.set()
            root.destroy()

        tk.Button(
            frame,
            text="Stop Sharing",
            command=on_stop,
            bg="#0494f4",
            fg="white",
            activebackground="#0382d6",
            activeforeground="white",
            relief=tk.FLAT,
            padx=10,
            pady=2,
            font=("Segoe UI", 9, "bold"),
        ).pack(side=tk.LEFT)

        root.update_idletasks()
        root.geometry(f"+{(root.winfo_screenwidth() - root.winfo_width()) // 2}+12")

        def check_stop() -> None:
            if stop_event.is_set():
                root.destroy()
            else:
                root.after(400, check_stop)

        root.after(400, check_stop)
        root.mainloop()
    except Exception:
        pass


def capture_screen_jpeg_b64() -> str | None:
    try:
        import mss
        from PIL import Image

        with mss.mss() as sct:
            mon = sct.monitors[1]
            shot = sct.grab(mon)
            img = Image.frombytes("RGB", shot.size, shot.bgra, "raw", "BGRX")
            img.thumbnail((1366, 768))
            buf = io.BytesIO()
            img.save(buf, format="JPEG", quality=65, optimize=True)
            return base64.b64encode(buf.getvalue()).decode("ascii")
    except Exception:
        return None


def _dispatch_admin_req(pkt: Dict[str, Any]) -> Dict[str, Any]:
    op = str(pkt.get("op", ""))
    req_id = pkt.get("reqId")
    if op == "FS_LIST":
        res = handle_fs_list(str(pkt.get("path", "")))
    elif op == "FS_READ":
        res = handle_fs_read(str(pkt.get("path", "")))
    elif op == "FS_WRITE":
        res = handle_fs_write(
            str(pkt.get("dir", "")),
            str(pkt.get("name", "")),
            str(pkt.get("dataBase64", "")),
        )
    elif op == "EXEC_CMD":
        res = handle_exec_cmd(str(pkt.get("command", "")))
    elif op == "SYS_SNAPSHOT":
        res = handle_sys_snapshot()
    elif op == "PROC_KILL":
        res = handle_proc_kill(int(pkt.get("pid", 0)))
    else:
        res = {"type": "ADMIN_RES", "op": op, "error": f"Unsupported operation: {op}"}
    if req_id is not None:
        res["reqId"] = req_id
    return res


async def run_p2p_daemon() -> None:
    import websockets
    from aiortc import RTCConfiguration, RTCIceServer, RTCPeerConnection, RTCSessionDescription

    failed_attempts = 0
    lockout_until = 0.0

    ice_servers = [
        RTCIceServer(urls=["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"]),
        RTCIceServer(
            urls=[
                "turn:openrelay.metered.ca:80",
                "turn:openrelay.metered.ca:443",
                "turn:openrelay.metered.ca:443?transport=tcp",
            ],
            username="openrelay",
            credential="openrelay",
        ),
    ]

    while True:
        cfg = load_config()
        if not cfg:
            await asyncio.sleep(3)
            continue

        peer_id = cfg["peerId"]
        token = secrets.token_hex(8)
        ws_url = PEERJS_WS.format(peer_id=peer_id, token=token)

        try:
            async with websockets.connect(ws_url, ping_interval=15) as ws:

                async def heartbeat_sender() -> None:
                    while True:
                        await asyncio.sleep(5)
                        await ws.send(json.dumps({"type": "HEARTBEAT"}))

                hb_task = asyncio.create_task(heartbeat_sender())
                try:
                    async for raw in ws:
                        fresh_cfg = load_config() or cfg
                        msg = json.loads(raw)
                        if msg.get("type") != "OFFER":
                            continue
                        src = msg["src"]
                        payload = msg["payload"]
                        conn_id = payload.get("connectionId")
                        pc = RTCPeerConnection(RTCConfiguration(iceServers=ice_servers))
                        nonce = secrets.token_hex(16)
                        stop_banner = threading.Event()
                        session_state: Dict[str, Any] = {"authed": False, "admin": False, "mode": ""}

                        @pc.on("datachannel")
                        def on_dc(channel: Any) -> None:
                            total_mb = round(psutil.virtual_memory().total / (1024 * 1024)) if psutil else 16384
                            used_mb = round(psutil.virtual_memory().used / (1024 * 1024)) if psutil else 4096
                            cpu_pct = round(psutil.cpu_percent()) if psutil else 10
                            hello = {
                                "type": "HELLO",
                                "nonce": nonce,
                                "device": {
                                    "slot": fresh_cfg["slot"],
                                    "name": fresh_cfg["deviceName"],
                                    "ownerUsername": fresh_cfg["ownerUsername"],
                                    "sharedUsers": fresh_cfg.get("sharedUsers", {}),
                                    "osInfo": f"{platform.system()} {platform.release()} · {round(total_mb / 1024)} GB RAM",
                                    "vmName": fresh_cfg["vmName"],
                                    "vmState": query_hyperv_state(fresh_cfg["vmName"]),
                                    "hostRamTotalMb": total_mb,
                                    "hostRamUsedMb": used_mb,
                                    "hostCpuPercent": cpu_pct,
                                },
                            }
                            channel.send(json.dumps(hello))

                            @channel.on("close")
                            def on_close() -> None:
                                stop_banner.set()

                            @channel.on("message")
                            def on_message(pkt_raw: Any) -> None:
                                nonlocal failed_attempts, lockout_until
                                pkt = json.loads(pkt_raw) if isinstance(pkt_raw, str) else pkt_raw
                                ptype = pkt.get("type")

                                if ptype == "AUTH":
                                    if time.time() < lockout_until:
                                        channel.send(
                                            json.dumps(
                                                {
                                                    "type": "AUTH_ERR",
                                                    "error": "Too many failed PIN attempts. Try again in 5 minutes.",
                                                }
                                            )
                                        )
                                        return
                                    viewer = sanitize_username(str(pkt.get("viewerUsername", "")))
                                    mode = str(pkt.get("targetMode", "host_os"))
                                    proof = str(pkt.get("proof", ""))
                                    is_owner = viewer == fresh_cfg["ownerUsername"]
                                    shared_scope = fresh_cfg.get("sharedUsers", {}).get(viewer)
                                    if not is_owner and not shared_scope:
                                        channel.send(
                                            json.dumps(
                                                {
                                                    "type": "AUTH_ERR",
                                                    "error": "Your Gothwad Account is not authorized on this computer.",
                                                }
                                            )
                                        )
                                        return
                                    if mode == "host_os" and not is_owner and shared_scope != "host_and_vm":
                                        channel.send(
                                            json.dumps(
                                                {
                                                    "type": "AUTH_ERR",
                                                    "error": "Your account only has Background VM access.",
                                                }
                                            )
                                        )
                                        return
                                    expected = compute_expected_proof(fresh_cfg["pin"], nonce, viewer, mode)
                                    if not hmac.compare_digest(expected, proof):
                                        failed_attempts += 1
                                        if failed_attempts >= 5:
                                            lockout_until = time.time() + 300
                                        channel.send(
                                            json.dumps({"type": "AUTH_ERR", "error": "Incorrect 6-digit PIN."})
                                        )
                                        return

                                    failed_attempts = 0
                                    session_state["authed"] = True
                                    session_state["admin"] = bool(is_owner or shared_scope == "host_and_vm")
                                    session_state["mode"] = mode
                                    channel.send(
                                        json.dumps(
                                            {
                                                "type": "AUTH_OK",
                                                "targetMode": mode,
                                                "adminEnabled": session_state["admin"],
                                            }
                                        )
                                    )
                                    if mode == "host_os":
                                        threading.Thread(
                                            target=show_host_sharing_banner,
                                            args=(viewer, stop_banner),
                                            daemon=True,
                                        ).start()

                                        async def stream_frames() -> None:
                                            while not stop_banner.is_set() and channel.readyState == "open":
                                                b64 = capture_screen_jpeg_b64()
                                                if b64:
                                                    channel.send(json.dumps({"type": "FRAME", "jpegBase64": b64}))
                                                await asyncio.sleep(0.09)

                                        asyncio.create_task(stream_frames())
                                    return

                                if not session_state["authed"]:
                                    return

                                if ptype == "MOUSE" and session_state["admin"]:
                                    handle_mouse_packet(pkt)
                                elif ptype == "KEY" and session_state["admin"]:
                                    handle_key_packet(pkt)
                                elif ptype == "TEXT" and session_state["admin"]:
                                    send_unicode_text(str(pkt.get("text", "")))
                                elif ptype == "KEY_COMBO" and session_state["admin"]:
                                    keys: List[str] = [str(k) for k in (pkt.get("keys") or [])]
                                    handle_key_combo(keys)
                                elif ptype == "CLIPBOARD" and session_state["admin"]:
                                    set_host_clipboard(str(pkt.get("text", "")))
                                elif ptype == "POWER":
                                    run_hyperv_action(fresh_cfg["vmName"], str(pkt.get("action", "")))
                                elif ptype == "ADMIN_REQ" and session_state["admin"]:

                                    async def _handle_admin(req_pkt: Dict[str, Any]) -> None:
                                        res = await asyncio.to_thread(_dispatch_admin_req, req_pkt)
                                        if channel.readyState == "open":
                                            channel.send(json.dumps(res))

                                    asyncio.create_task(_handle_admin(pkt))

                        await pc.setRemoteDescription(
                            RTCSessionDescription(sdp=payload["sdp"]["sdp"], type="offer")
                        )
                        ans = await pc.createAnswer()
                        await pc.setLocalDescription(ans)
                        await ws.send(
                            json.dumps(
                                {
                                    "type": "ANSWER",
                                    "dst": src,
                                    "payload": {
                                        "sdp": {"type": "answer", "sdp": pc.localDescription.sdp},
                                        "type": payload.get("type", "data"),
                                        "connectionId": conn_id,
                                    },
                                }
                            )
                        )
                finally:
                    hb_task.cancel()
        except Exception:
            await asyncio.sleep(4)
