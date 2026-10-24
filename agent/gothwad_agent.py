#!/usr/bin/env python3
"""
Gothwad Remote Desktop — Zero-D1 WebRTC P2P Host & Hyper-V Agent
================================================================
- Zero cloud database required! Registers on WebRTC P2P slot `grd-<user>-slot-<n>`.
- Requires explicit PC owner consent during one-time pairing.
- Verifies viewer Gothwad username ACL + constant-time HMAC-SHA256 6-digit PIN proof.
- Displays a visible Chrome-Remote-Desktop-style "Desktop Shared [Stop Sharing]"
  banner whenever Main Windows OS screen sharing is active.
"""

from __future__ import annotations

import argparse
import asyncio
import base64
import hashlib
import hmac
import io
import json
import os
import platform
import secrets
import subprocess
import sys
import threading
import time
from pathlib import Path
from typing import Any, Dict

import psutil

CONFIG_DIR = Path(os.environ.get("PROGRAMDATA", "C:\\ProgramData")) / "GothwadRemote"
CONFIG_FILE = CONFIG_DIR / "agent-config.json"
PEERJS_WS = "wss://0.peerjs.com/peerjs?key=peerjs&id={peer_id}&token={token}&version=1.5.5"


def sanitize_username(raw: str) -> str:
    clean = raw.strip().lower().split("@")[0]
    return "".join(c for c in clean if c.isalnum() or c in "._-")


def build_peer_id(username: str, slot: int) -> str:
    safe_user = sanitize_username(username).replace(".", "-").replace("_", "-")
    safe_slot = max(1, min(6, int(slot)))
    return f"grd-{safe_user}-slot-{safe_slot}"


def compute_expected_proof(pin: str, nonce: str, viewer: str, mode: str) -> str:
    msg = f"{nonce}:{sanitize_username(viewer)}:{mode}".encode("utf-8")
    return hmac.new(pin.encode("utf-8"), msg, hashlib.sha256).hexdigest()


def query_hyperv_state(vm_name: str) -> str:
    if platform.system() != "Windows":
        return "Running"
    try:
        res = subprocess.run(
            ["powershell", "-NoProfile", "-Command", f"(Get-VM -Name '{vm_name}' -ErrorAction SilentlyContinue).State"],
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
        root.configure(bg="#0f172a")

        frame = tk.Frame(root, bg="#0f172a", padx=14, pady=8, highlightthickness=1, highlightbackground="#38bdf8")
        frame.pack()
        tk.Label(
            frame,
            text=f"Your desktop is shared with {viewer_username}@gothwadtech.com",
            fg="#f8fafc",
            bg="#0f172a",
            font=("Segoe UI", 10, "bold"),
        ).pack(side=tk.LEFT, padx=(0, 12))

        def on_stop() -> None:
            stop_event.set()
            root.destroy()

        tk.Button(frame, text="Stop Sharing", command=on_stop, bg="#0284c7", fg="white", relief=tk.FLAT, padx=10).pack(
            side=tk.LEFT
        )
        root.update_idletasks()
        root.geometry(f"+{(root.winfo_screenwidth() - root.winfo_width()) // 2}+18")

        def check_stop() -> None:
            if stop_event.is_set():
                root.destroy()
            else:
                root.after(500, check_stop)

        root.after(500, check_stop)
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
            img.thumbnail((1280, 720))
            buf = io.BytesIO()
            img.save(buf, format="JPEG", quality=62)
            return base64.b64encode(buf.getvalue()).decode("ascii")
    except Exception:
        return None


def pair_local(user: str, slot: int, name: str, vm_name: str, pin: str, consent: bool) -> None:
    if not consent:
        print("ERROR: Explicit PC owner consent (--confirm-owner-consent) is mandatory.")
        sys.exit(1)
    if not pin.isdigit() or not (6 <= len(pin) <= 12):
        print("ERROR: PIN must be 6 to 12 digits.")
        sys.exit(1)

    owner = sanitize_username(user)
    peer_id = build_peer_id(owner, slot)
    CONFIG_DIR.mkdir(parents=True, exist_ok=True)
    cfg = {
        "ownerUsername": owner,
        "slot": slot,
        "peerId": peer_id,
        "deviceName": name or platform.node() or "Windows-11-PC",
        "vmName": vm_name,
        "pin": pin,
        "sharedUsers": {},
    }
    CONFIG_FILE.write_text(json.dumps(cfg, indent=2), encoding="utf-8")
    print(f"Paired! Peer ID '{peer_id}' ready for {owner}@gothwadtech.com (Zero-D1 P2P).")


def grant_share(username: str, scope: str) -> None:
    if not CONFIG_FILE.exists():
        sys.exit("Run --pair first.")
    cfg = json.loads(CONFIG_FILE.read_text(encoding="utf-8"))
    target = sanitize_username(username)
    cfg.setdefault("sharedUsers", {})[target] = "host_and_vm" if scope == "host_and_vm" else "vm_only"
    CONFIG_FILE.write_text(json.dumps(cfg, indent=2), encoding="utf-8")
    print(f"Granted {target}@gothwadtech.com -> {cfg['sharedUsers'][target]}")


async def p2p_loop(cfg: Dict[str, Any]) -> None:
    import websockets
    from aiortc import RTCConfiguration, RTCIceServer, RTCPeerConnection, RTCSessionDescription

    peer_id = cfg["peerId"]
    failed_attempts = 0
    lockout_until = 0.0

    while True:
        token = secrets.token_hex(8)
        ws_url = PEERJS_WS.format(peer_id=peer_id, token=token)
        try:
            async with websockets.connect(ws_url, ping_interval=15) as ws:
                print(f"[Online] Listening on P2P slot: {peer_id}")

                async def heartbeat_sender() -> None:
                    while True:
                        await asyncio.sleep(5)
                        await ws.send(json.dumps({"type": "HEARTBEAT"}))

                hb_task = asyncio.create_task(heartbeat_sender())
                try:
                    async for raw in ws:
                        msg = json.loads(raw)
                        if msg.get("type") != "OFFER":
                            continue
                        src = msg["src"]
                        payload = msg["payload"]
                        conn_id = payload.get("connectionId")
                        pc = RTCPeerConnection(
                            RTCConfiguration([RTCIceServer(urls=["stun:stun.l.google.com:19302"])])
                        )
                        nonce = secrets.token_hex(16)
                        stop_banner = threading.Event()
                        authed_mode: list[str] = []

                        @pc.on("datachannel")
                        def on_dc(channel: Any) -> None:
                            mem = psutil.virtual_memory()
                            hello = {
                                "type": "HELLO",
                                "nonce": nonce,
                                "device": {
                                    "slot": cfg["slot"],
                                    "name": cfg["deviceName"],
                                    "ownerUsername": cfg["ownerUsername"],
                                    "sharedUsers": cfg.get("sharedUsers", {}),
                                    "osInfo": f"{platform.system()} {platform.release()} · {round(mem.total / (1024**3))}GB RAM",
                                    "vmName": cfg["vmName"],
                                    "vmState": query_hyperv_state(cfg["vmName"]),
                                    "hostRamTotalMb": round(mem.total / (1024 * 1024)),
                                    "hostRamUsedMb": round(mem.used / (1024 * 1024)),
                                    "hostCpuPercent": round(psutil.cpu_percent()),
                                },
                            }
                            channel.send(json.dumps(hello))

                            @channel.on("message")
                            def on_message(pkt_raw: Any) -> None:
                                nonlocal failed_attempts, lockout_until
                                pkt = json.loads(pkt_raw) if isinstance(pkt_raw, str) else pkt_raw
                                if pkt.get("type") == "AUTH":
                                    if time.time() < lockout_until:
                                        channel.send(json.dumps({"type": "AUTH_ERR", "error": "Too many wrong PIN attempts. Wait 5 min."}))
                                        return
                                    viewer = sanitize_username(str(pkt.get("viewerUsername", "")))
                                    mode = str(pkt.get("targetMode", "hyperv_vm"))
                                    proof = str(pkt.get("proof", ""))
                                    is_owner = viewer == cfg["ownerUsername"]
                                    shared_scope = cfg.get("sharedUsers", {}).get(viewer)
                                    if not is_owner and not shared_scope:
                                        channel.send(json.dumps({"type": "AUTH_ERR", "error": "Gothwad Account not authorized"}))
                                        return
                                    if mode == "host_os" and not is_owner and shared_scope != "host_and_vm":
                                        channel.send(json.dumps({"type": "AUTH_ERR", "error": "Restricted to Background VM only"}))
                                        return
                                    expected = compute_expected_proof(cfg["pin"], nonce, viewer, mode)
                                    if not hmac.compare_digest(expected, proof):
                                        failed_attempts += 1
                                        if failed_attempts >= 5:
                                            lockout_until = time.time() + 300
                                        channel.send(json.dumps({"type": "AUTH_ERR", "error": "Incorrect 6-digit PIN"}))
                                        return
                                    failed_attempts = 0
                                    authed_mode.append(mode)
                                    channel.send(json.dumps({"type": "AUTH_OK", "targetMode": mode}))
                                    if mode == "host_os":
                                        threading.Thread(target=show_host_sharing_banner, args=(viewer, stop_banner), daemon=True).start()

                                        async def stream_frames() -> None:
                                            while not stop_banner.is_set() and channel.readyState == "open":
                                                b64 = capture_screen_jpeg_b64()
                                                if b64:
                                                    channel.send(json.dumps({"type": "FRAME", "jpegBase64": b64}))
                                                await asyncio.sleep(0.12)

                                        asyncio.create_task(stream_frames())
                                elif authed_mode and pkt.get("type") == "POWER":
                                    run_hyperv_action(cfg["vmName"], str(pkt.get("action", "")))

                        await pc.setRemoteDescription(RTCSessionDescription(sdp=payload["sdp"]["sdp"], type="offer"))
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
        except Exception as exc:
            print(f"[Reconnecting P2P signaling in 5s] {exc}")
            await asyncio.sleep(5)


def main() -> None:
    p = argparse.ArgumentParser(description="Gothwad Remote Desktop Zero-D1 P2P Agent")
    p.add_argument("--pair", action="store_true")
    p.add_argument("--run", action="store_true")
    p.add_argument("--grant-user", default="")
    p.add_argument("--scope", default="vm_only")
    p.add_argument("--gothwad-user", default="")
    p.add_argument("--slot", type=int, default=1)
    p.add_argument("--device-name", default="")
    p.add_argument("--vm-name", default="RemoteWorkVM")
    p.add_argument("--pin", default="")
    p.add_argument("--confirm-owner-consent", action="store_true")
    args = p.parse_args()

    if args.pair:
        pair_local(args.gothwad_user, args.slot, args.device_name, args.vm_name, args.pin, args.confirm_owner_consent)
    elif args.grant_user:
        grant_share(args.grant_user, args.scope)
    elif args.run:
        if not CONFIG_FILE.exists():
            sys.exit("Config missing. Run --pair first.")
        asyncio.run(p2p_loop(json.loads(CONFIG_FILE.read_text(encoding="utf-8"))))
    else:
        p.print_help()


if __name__ == "__main__":
    main()
