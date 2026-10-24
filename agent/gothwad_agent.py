#!/usr/bin/env python3
"""
Gothwad Remote Desktop Host (GothwadRemoteHostSetup.exe)
========================================================
Unified Windows Host Application:
1. Double-click EXE (no args)   -> Opens #212121 Native GUI Installer & Control Panel
2. Browser gothwad-remote://... -> Opens GUI pre-filled from remotedesktop.gothwadtech.com
3. Background --daemon / --run  -> Runs headless WebRTC P2P Host & Admin RPC Daemon
4. CLI --pair / --grant-user    -> Supports optional PowerShell headless setup
"""

from __future__ import annotations

import argparse
import asyncio
import sys

from installer_win import (
    build_peer_id,
    grant_shared_user,
    load_config,
    parse_protocol_url,
    register_and_start_background_service,
    sanitize_username,
    save_config,
    uninstall_windows_host,
)
from p2p_daemon import compute_expected_proof, run_p2p_daemon

__all__ = ["sanitize_username", "build_peer_id", "compute_expected_proof"]


def main() -> None:
    parser = argparse.ArgumentParser(description="Gothwad Remote Desktop Host")
    parser.add_argument("--gui", action="store_true", help="Open graphical installer & control panel")
    parser.add_argument("--url", default="", help="Handle gothwad-remote:// browser setup URL")
    parser.add_argument("--daemon", action="store_true", help="Run background WebRTC P2P host service")
    parser.add_argument("--run", action="store_true", help="Alias for --daemon")
    parser.add_argument("--pair", action="store_true", help="Headless CLI pairing")
    parser.add_argument("--uninstall", action="store_true", help="Disable and remove host service")
    parser.add_argument("--grant-user", default="", help="Grant access to another Gothwad username")
    parser.add_argument("--scope", default="host_and_vm", help="Access scope: host_and_vm or vm_only")
    parser.add_argument("--gothwad-user", default="", help="Owner Gothwad username")
    parser.add_argument("--slot", type=int, default=1, help="P2P slot (1..6)")
    parser.add_argument("--device-name", default="", help="Display name for this Windows PC")
    parser.add_argument("--vm-name", default="RemoteWorkVM", help="Optional Hyper-V VM name")
    parser.add_argument("--pin", default="", help="6 to 12 digit numeric PIN")
    parser.add_argument("--confirm-owner-consent", action="store_true", help="Confirm PC owner consent")
    args = parser.parse_args()

    # 1. Browser protocol launch: gothwad-remote://setup?owner=...&name=...&pin=...
    if args.url:
        from gui_app import launch_gui

        parsed = parse_protocol_url(args.url)
        launch_gui(prefill=parsed)
        return

    # 2. Headless CLI modes (PowerShell option)
    if args.uninstall:
        uninstall_windows_host()
        print("Gothwad Remote Desktop host removed.")
        return

    if args.pair:
        if not args.confirm_owner_consent:
            sys.exit("ERROR: Explicit PC owner consent (--confirm-owner-consent) is required.")
        cfg = save_config(
            owner_raw=args.gothwad_user,
            slot=args.slot,
            device_name=args.device_name,
            pin=args.pin,
            vm_name=args.vm_name,
        )
        register_and_start_background_service()
        print(f"Paired '{cfg['deviceName']}' on {cfg['peerId']} for {cfg['ownerUsername']}@gothwadtech.com")
        return

    if args.grant_user:
        cfg = grant_shared_user(args.grant_user, args.scope)
        print(f"Updated shared access for {args.grant_user}: {cfg['sharedUsers']}")
        return

    # 3. Background P2P daemon mode (Scheduled Task)
    if args.daemon or args.run:
        if not load_config():
            sys.exit("Host is not configured yet. Launch GothwadRemoteHostSetup.exe to configure.")
        asyncio.run(run_p2p_daemon())
        return

    # 4. Default when double-clicked on Windows (no arguments): open Native GUI!
    from gui_app import launch_gui

    launch_gui()


if __name__ == "__main__":
    main()
