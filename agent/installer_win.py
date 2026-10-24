"""
Windows Host Self-Installer, Registry URL Protocol & Service Manager
====================================================================
Handles zero-PowerShell installation when a user opens GothwadRemoteHostSetup.exe:
- Copies binary to C:\\Program Files\\GothwadRemote\\GothwadRemoteHost.exe
- Registers gothwad-remote:// browser URL protocol handler (Chrome Remote Desktop style)
- Creates Windows Start Menu shortcut
- Registers & launches highest-privilege Scheduled Task ('GothwadRemoteHost')
"""

from __future__ import annotations

import json
import os
import platform
import shutil
import subprocess
import sys
from pathlib import Path
from typing import Any, Dict, Optional
from urllib.parse import parse_qs, urlparse

IS_WINDOWS = platform.system() == "Windows"

INSTALL_DIR = Path(os.environ.get("PROGRAMFILES", "C:\\Program Files")) / "GothwadRemote"
INSTALLED_EXE = INSTALL_DIR / "GothwadRemoteHost.exe"
CONFIG_DIR = Path(os.environ.get("PROGRAMDATA", "C:\\ProgramData")) / "GothwadRemote"
CONFIG_FILE = CONFIG_DIR / "agent-config.json"
TASK_NAME = "GothwadRemoteHost"
LEGACY_TASK_NAME = "GothwadRemoteAgent"


def sanitize_username(raw: str) -> str:
    clean = raw.strip().lower().split("@")[0]
    return "".join(c for c in clean if c.isalnum() or c in "._-")


def build_peer_id(username: str, slot: int = 1) -> str:
    safe_user = sanitize_username(username).replace(".", "-").replace("_", "-")
    safe_slot = max(1, min(6, int(slot)))
    return f"grd-{safe_user}-slot-{safe_slot}"


def load_config() -> Optional[Dict[str, Any]]:
    if not CONFIG_FILE.exists():
        return None
    try:
        return json.loads(CONFIG_FILE.read_text(encoding="utf-8"))
    except Exception:
        return None


def save_config(
    owner_raw: str,
    slot: int,
    device_name: str,
    pin: str,
    vm_name: str = "RemoteWorkVM",
) -> Dict[str, Any]:
    owner = sanitize_username(owner_raw)
    if not owner:
        raise ValueError("Please enter a valid Gothwad username or email.")
    if not pin.isdigit() or not (6 <= len(pin) <= 12):
        raise ValueError("PIN must be 6 to 12 numeric digits.")

    existing = load_config() or {}
    safe_slot = max(1, min(6, int(slot)))
    peer_id = build_peer_id(owner, safe_slot)
    CONFIG_DIR.mkdir(parents=True, exist_ok=True)
    cfg: Dict[str, Any] = {
        "ownerUsername": owner,
        "slot": safe_slot,
        "peerId": peer_id,
        "deviceName": device_name.strip() or platform.node() or "Windows-PC",
        "vmName": vm_name.strip() or "RemoteWorkVM",
        "pin": pin,
        "sharedUsers": existing.get("sharedUsers", {}),
    }
    CONFIG_FILE.write_text(json.dumps(cfg, indent=2), encoding="utf-8")
    return cfg


def grant_shared_user(username: str, scope: str) -> Dict[str, Any]:
    cfg = load_config()
    if not cfg:
        raise RuntimeError("Host is not configured yet.")
    target = sanitize_username(username)
    if not target:
        raise ValueError("Invalid Gothwad username.")
    cfg.setdefault("sharedUsers", {})[target] = "host_and_vm" if scope == "host_and_vm" else "vm_only"
    CONFIG_FILE.write_text(json.dumps(cfg, indent=2), encoding="utf-8")
    return cfg


def parse_protocol_url(raw_url: str) -> Dict[str, str]:
    parsed = urlparse(raw_url)
    qs = parse_qs(parsed.query)
    return {
        "action": (parsed.netloc or parsed.path or "").strip("/").lower(),
        "owner": (qs.get("owner") or [""])[0],
        "slot": (qs.get("slot") or ["1"])[0],
        "name": (qs.get("name") or [""])[0],
        "pin": (qs.get("pin") or [""])[0],
    }


def _target_exe_command() -> str:
    if getattr(sys, "frozen", False):
        return str(INSTALLED_EXE if INSTALLED_EXE.exists() else Path(sys.executable))
    return f'"{sys.executable}" "{Path(__file__).resolve().parent / "gothwad_agent.py"}"'


def register_url_protocol(exe_path: Path) -> None:
    if not IS_WINDOWS:
        return
    import winreg

    cmd_val = f'"{exe_path}" --url "%1"'
    for root_hive in (winreg.HKEY_CURRENT_USER, winreg.HKEY_LOCAL_MACHINE):
        try:
            with winreg.CreateKey(root_hive, r"Software\Classes\gothwad-remote") as key:
                winreg.SetValueEx(key, "", 0, winreg.REG_SZ, "URL:Gothwad Remote Desktop Protocol")
                winreg.SetValueEx(key, "URL Protocol", 0, winreg.REG_SZ, "")
            with winreg.CreateKey(root_hive, r"Software\Classes\gothwad-remote\DefaultIcon") as icon_k:
                winreg.SetValueEx(icon_k, "", 0, winreg.REG_SZ, f'"{exe_path}",0')
            with winreg.CreateKey(
                root_hive, r"Software\Classes\gothwad-remote\shell\open\command"
            ) as cmd_k:
                winreg.SetValueEx(cmd_k, "", 0, winreg.REG_SZ, cmd_val)
        except OSError:
            continue


def install_windows_binary_only() -> Path:
    if not IS_WINDOWS or not getattr(sys, "frozen", False):
        return Path(sys.executable)
    src = Path(sys.executable).resolve()
    INSTALL_DIR.mkdir(parents=True, exist_ok=True)
    if src != INSTALLED_EXE.resolve():
        subprocess.run(
            ["taskkill", "/F", "/IM", INSTALLED_EXE.name],
            capture_output=True,
        )
        shutil.copy2(src, INSTALLED_EXE)
    register_url_protocol(INSTALLED_EXE)
    _create_start_menu_shortcut(INSTALLED_EXE)
    return INSTALLED_EXE


def _create_start_menu_shortcut(exe_path: Path) -> None:
    if not IS_WINDOWS:
        return
    ps_script = (
        "$sm = [Environment]::GetFolderPath('CommonPrograms');"
        "if (-not $sm) { $sm = [Environment]::GetFolderPath('Programs') };"
        "$lnk = Join-Path $sm 'Gothwad Remote Desktop.lnk';"
        "$ws = New-Object -ComObject WScript.Shell;"
        "$s = $ws.CreateShortcut($lnk);"
        f"$s.TargetPath = '{exe_path}';"
        "$s.Description = 'Gothwad Remote Desktop Host Control Panel';"
        "$s.Save()"
    )
    subprocess.run(["powershell", "-NoProfile", "-Command", ps_script], capture_output=True)


def register_and_start_background_service() -> None:
    if not IS_WINDOWS:
        return
    exe_path = install_windows_binary_only()
    if getattr(sys, "frozen", False):
        exec_bin = str(exe_path)
        exec_args = "--daemon"
    else:
        script_path = Path(__file__).resolve().parent / "gothwad_agent.py"
        exec_bin = sys.executable
        exec_args = f'"{script_path}" --daemon'

    ps_cmd = f"""
$ErrorActionPreference = 'SilentlyContinue'
Unregister-ScheduledTask -TaskName '{LEGACY_TASK_NAME}' -Confirm:$false
Stop-ScheduledTask -TaskName '{TASK_NAME}'
$action = New-ScheduledTaskAction -Execute '{exec_bin}' -Argument '{exec_args}'
$tBoot = New-ScheduledTaskTrigger -AtStartup
$tLogon = New-ScheduledTaskTrigger -AtLogOn
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -ExecutionTimeLimit ([TimeSpan]::Zero) -RestartCount 99 -RestartInterval (New-TimeSpan -Minutes 1)
Register-ScheduledTask -TaskName '{TASK_NAME}' -Description 'Gothwad Remote Desktop Host Service' -Action $action -Trigger @($tBoot, $tLogon) -Settings $settings -RunLevel Highest -Force | Out-Null
Start-ScheduledTask -TaskName '{TASK_NAME}'
powercfg /change standby-timeout-ac 0
"""
    subprocess.run(["powershell", "-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", ps_cmd], capture_output=True)


def is_daemon_running() -> bool:
    if not IS_WINDOWS:
        return False
    res = subprocess.run(
        [
            "powershell",
            "-NoProfile",
            "-Command",
            f"(Get-ScheduledTask -TaskName '{TASK_NAME}' -ErrorAction SilentlyContinue).State",
        ],
        capture_output=True,
        text=True,
    )
    return res.stdout.strip().lower() in ("running", "ready")


def uninstall_windows_host() -> None:
    if IS_WINDOWS:
        ps_cmd = f"""
$ErrorActionPreference = 'SilentlyContinue'
Stop-ScheduledTask -TaskName '{TASK_NAME}'
Unregister-ScheduledTask -TaskName '{TASK_NAME}' -Confirm:$false
Unregister-ScheduledTask -TaskName '{LEGACY_TASK_NAME}' -Confirm:$false
Remove-Item -Recurse -Force 'HKCU:\\Software\\Classes\\gothwad-remote'
Remove-Item -Recurse -Force 'HKLM:\\Software\\Classes\\gothwad-remote'
"""
        subprocess.run(["powershell", "-NoProfile", "-Command", ps_cmd], capture_output=True)
    if CONFIG_FILE.exists():
        CONFIG_FILE.unlink(missing_ok=True)
