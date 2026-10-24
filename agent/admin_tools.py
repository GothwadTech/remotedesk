"""
Administrator Remote Management Tools (Files, PowerShell, Processes & System Health)
====================================================================================
Provides authenticated P2P handlers for browsing files, uploading/downloading files,
running Administrator PowerShell commands, and managing running Windows processes.
"""

from __future__ import annotations

import base64
import os
import platform
import string
import subprocess
from pathlib import Path
from typing import Any, Dict, List

try:
    import psutil
except ImportError:  # pragma: no cover
    psutil = None  # type: ignore[assignment]

MAX_TRANSFER_BYTES = 8 * 1024 * 1024  # 8 MB per single P2P file transfer


def list_roots() -> List[Dict[str, Any]]:
    if platform.system() == "Windows":
        drives: List[Dict[str, Any]] = []
        for letter in string.ascii_uppercase:
            root = f"{letter}:\\"
            if os.path.exists(root):
                try:
                    usage = psutil.disk_usage(root)
                    drives.append(
                        {
                            "name": f"{letter}: Drive",
                            "path": root,
                            "isDir": True,
                            "size": usage.total,
                            "free": usage.free,
                        }
                    )
                except Exception:
                    drives.append({"name": f"{letter}: Drive", "path": root, "isDir": True, "size": 0})
        home = str(Path.home())
        for folder in ("Desktop", "Downloads", "Documents"):
            p = os.path.join(home, folder)
            if os.path.isdir(p):
                drives.insert(0, {"name": folder, "path": p, "isDir": True, "size": 0})
        return drives
    return [{"name": "Home", "path": str(Path.home()), "isDir": True, "size": 0}]


def handle_fs_list(req_path: str) -> Dict[str, Any]:
    if not req_path or req_path == "__roots__":
        return {"type": "ADMIN_RES", "op": "FS_LIST", "path": "", "entries": list_roots()}
    target = Path(req_path).expanduser().resolve()
    if not target.exists() or not target.is_dir():
        return {"type": "ADMIN_RES", "op": "FS_LIST", "error": f"Folder not found: {req_path}"}

    entries: List[Dict[str, Any]] = []
    try:
        for item in sorted(target.iterdir(), key=lambda x: (not x.is_dir(), x.name.lower()))[:250]:
            try:
                st = item.stat()
                entries.append(
                    {
                        "name": item.name,
                        "path": str(item),
                        "isDir": item.is_dir(),
                        "size": 0 if item.is_dir() else st.st_size,
                        "mtime": int(st.st_mtime),
                    }
                )
            except Exception:
                continue
    except PermissionError:
        return {"type": "ADMIN_RES", "op": "FS_LIST", "error": f"Access denied: {target}"}

    parent = str(target.parent) if target.parent != target else "__roots__"
    return {
        "type": "ADMIN_RES",
        "op": "FS_LIST",
        "path": str(target),
        "parent": parent,
        "entries": entries,
    }


def handle_fs_read(file_path: str) -> Dict[str, Any]:
    target = Path(file_path).expanduser().resolve()
    if not target.is_file():
        return {"type": "ADMIN_RES", "op": "FS_READ", "error": "File not found"}
    size = target.stat().st_size
    if size > MAX_TRANSFER_BYTES:
        return {"type": "ADMIN_RES", "op": "FS_READ", "error": "File exceeds 8 MB transfer limit"}
    data_b64 = base64.b64encode(target.read_bytes()).decode("ascii")
    return {
        "type": "ADMIN_RES",
        "op": "FS_READ",
        "name": target.name,
        "size": size,
        "dataBase64": data_b64,
    }


def handle_fs_write(dest_dir: str, filename: str, data_b64: str) -> Dict[str, Any]:
    safe_name = os.path.basename(filename.strip()) or "uploaded.bin"
    folder = Path(dest_dir).expanduser().resolve() if dest_dir else (Path.home() / "Downloads")
    folder.mkdir(parents=True, exist_ok=True)
    raw = base64.b64decode(data_b64)
    if len(raw) > MAX_TRANSFER_BYTES:
        return {"type": "ADMIN_RES", "op": "FS_WRITE", "error": "Upload exceeds 8 MB limit"}
    out_file = folder / safe_name
    out_file.write_bytes(raw)
    return {"type": "ADMIN_RES", "op": "FS_WRITE", "path": str(out_file), "size": len(raw)}


def handle_exec_cmd(command: str) -> Dict[str, Any]:
    if not command.strip():
        return {"type": "ADMIN_RES", "op": "EXEC_CMD", "output": "", "exitCode": 0}
    try:
        if platform.system() == "Windows":
            proc = subprocess.run(
                ["powershell", "-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", command],
                capture_output=True,
                text=True,
                timeout=25,
            )
        else:
            proc = subprocess.run(
                command,
                shell=True,
                capture_output=True,
                text=True,
                timeout=25,
            )
        combined = (proc.stdout or "") + (("\n" + proc.stderr) if proc.stderr else "")
        return {
            "type": "ADMIN_RES",
            "op": "EXEC_CMD",
            "output": combined.strip()[-12000:],
            "exitCode": proc.returncode,
        }
    except subprocess.TimeoutExpired:
        return {"type": "ADMIN_RES", "op": "EXEC_CMD", "output": "Command timed out after 25s.", "exitCode": 124}
    except Exception as exc:
        return {"type": "ADMIN_RES", "op": "EXEC_CMD", "output": str(exc), "exitCode": 1}


def handle_sys_snapshot() -> Dict[str, Any]:
    if psutil is None:
        return {
            "type": "ADMIN_RES",
            "op": "SYS_SNAPSHOT",
            "cpuPercent": 0,
            "ramUsedMb": 0,
            "ramTotalMb": 16384,
            "batteryPercent": None,
            "powerPlugged": None,
            "processes": [],
        }
    mem = psutil.virtual_memory()
    bat = getattr(psutil, "sensors_battery", lambda: None)()
    procs: List[Dict[str, Any]] = []
    for p in psutil.process_iter(["pid", "name", "memory_info", "cpu_percent"]):
        try:
            info = p.info
            rss_mb = round((info["memory_info"].rss if info.get("memory_info") else 0) / (1024 * 1024), 1)
            procs.append(
                {
                    "pid": info["pid"],
                    "name": info["name"] or "process",
                    "ramMb": rss_mb,
                    "cpu": round(float(info.get("cpu_percent") or 0.0), 1),
                }
            )
        except Exception:
            continue
    procs.sort(key=lambda x: x["ramMb"], reverse=True)
    return {
        "type": "ADMIN_RES",
        "op": "SYS_SNAPSHOT",
        "cpuPercent": round(psutil.cpu_percent(interval=None), 1),
        "ramUsedMb": round(mem.used / (1024 * 1024)),
        "ramTotalMb": round(mem.total / (1024 * 1024)),
        "batteryPercent": round(bat.percent) if bat else None,
        "powerPlugged": bool(bat.power_plugged) if bat else None,
        "processes": procs[:35],
    }


def handle_proc_kill(pid: int) -> Dict[str, Any]:
    try:
        psutil.Process(int(pid)).terminate()
        return {"type": "ADMIN_RES", "op": "PROC_KILL", "pid": pid, "ok": True}
    except Exception as exc:
        return {"type": "ADMIN_RES", "op": "PROC_KILL", "pid": pid, "ok": False, "error": str(exc)}
