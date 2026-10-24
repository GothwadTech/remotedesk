"""
Native Windows Win32 Input & Clipboard Engine (ctypes SendInput)
================================================================
Executes low-latency mouse movements, clicks, scroll wheel events, Unicode text,
and virtual-key shortcuts on Windows without external binary dependencies.
"""

from __future__ import annotations

import platform
import subprocess
from typing import Any, Dict, List

IS_WINDOWS = platform.system() == "Windows"

if IS_WINDOWS:
    import ctypes
    from ctypes import wintypes

    user32 = ctypes.WinDLL("user32", use_last_error=True)

    INPUT_MOUSE = 0
    INPUT_KEYBOARD = 1

    MOUSEEVENTF_MOVE = 0x0001
    MOUSEEVENTF_LEFTDOWN = 0x0002
    MOUSEEVENTF_LEFTUP = 0x0004
    MOUSEEVENTF_RIGHTDOWN = 0x0008
    MOUSEEVENTF_RIGHTUP = 0x0010
    MOUSEEVENTF_MIDDLEDOWN = 0x0020
    MOUSEEVENTF_MIDDLEUP = 0x0040
    MOUSEEVENTF_WHEEL = 0x0800
    MOUSEEVENTF_ABSOLUTE = 0x8000
    MOUSEEVENTF_VIRTUALDESK = 0x4000

    KEYEVENTF_KEYUP = 0x0002
    KEYEVENTF_UNICODE = 0x0004

    ULONG_PTR = wintypes.WPARAM

    class MOUSEINPUT(ctypes.Structure):
        _fields_ = [
            ("dx", wintypes.LONG),
            ("dy", wintypes.LONG),
            ("mouseData", wintypes.DWORD),
            ("dwFlags", wintypes.DWORD),
            ("time", wintypes.DWORD),
            ("dwExtraInfo", ULONG_PTR),
        ]

    class KEYBDINPUT(ctypes.Structure):
        _fields_ = [
            ("wVk", wintypes.WORD),
            ("wScan", wintypes.WORD),
            ("dwFlags", wintypes.DWORD),
            ("time", wintypes.DWORD),
            ("dwExtraInfo", ULONG_PTR),
        ]

    class _INPUTunion(ctypes.Union):
        _fields_ = [("mi", MOUSEINPUT), ("ki", KEYBDINPUT)]

    class INPUT(ctypes.Structure):
        _fields_ = [("type", wintypes.DWORD), ("union", _INPUTunion)]

    VK_MAP: Dict[str, int] = {
        "backspace": 0x08,
        "tab": 0x09,
        "enter": 0x0D,
        "shift": 0x10,
        "control": 0x11,
        "ctrl": 0x11,
        "alt": 0x12,
        "escape": 0x1B,
        "esc": 0x1B,
        " ": 0x20,
        "space": 0x20,
        "pageup": 0x21,
        "pagedown": 0x22,
        "end": 0x23,
        "home": 0x24,
        "arrowleft": 0x25,
        "arrowup": 0x26,
        "arrowright": 0x27,
        "arrowdown": 0x28,
        "insert": 0x2D,
        "delete": 0x2E,
        "meta": 0x5B,
        "win": 0x5B,
        "f1": 0x70,
        "f2": 0x71,
        "f3": 0x72,
        "f4": 0x73,
        "f5": 0x74,
        "f6": 0x75,
        "f7": 0x76,
        "f8": 0x77,
        "f9": 0x78,
        "f10": 0x79,
        "f11": 0x7A,
        "f12": 0x7B,
    }

    def _send_inputs(items: List[INPUT]) -> None:
        if not items:
            return
        arr = (INPUT * len(items))(*items)
        user32.SendInput(len(items), ctypes.byref(arr), ctypes.sizeof(INPUT))

    def _make_mouse(flags: int, dx: int = 0, dy: int = 0, data: int = 0) -> INPUT:
        inp = INPUT(type=INPUT_MOUSE)
        inp.union.mi = MOUSEINPUT(dx=dx, dy=dy, mouseData=data, dwFlags=flags, time=0, dwExtraInfo=0)
        return inp

    def _make_vk(vk: int, up: bool = False) -> INPUT:
        inp = INPUT(type=INPUT_KEYBOARD)
        inp.union.ki = KEYBDINPUT(
            wVk=vk,
            wScan=0,
            dwFlags=KEYEVENTF_KEYUP if up else 0,
            time=0,
            dwExtraInfo=0,
        )
        return inp

    def _make_unicode(ch: str, up: bool = False) -> INPUT:
        inp = INPUT(type=INPUT_KEYBOARD)
        flags = KEYEVENTF_UNICODE | (KEYEVENTF_KEYUP if up else 0)
        inp.union.ki = KEYBDINPUT(wVk=0, wScan=ord(ch), dwFlags=flags, time=0, dwExtraInfo=0)
        return inp


def handle_mouse_packet(pkt: Dict[str, Any]) -> None:
    if not IS_WINDOWS:
        return
    try:
        x_norm = max(0.0, min(1.0, float(pkt.get("x", 0.5))))
        y_norm = max(0.0, min(1.0, float(pkt.get("y", 0.5))))
        abs_x = int(x_norm * 65535)
        abs_y = int(y_norm * 65535)
        move_flags = MOUSEEVENTF_MOVE | MOUSEEVENTF_ABSOLUTE | MOUSEEVENTF_VIRTUALDESK

        action = str(pkt.get("action", "move"))
        events: List[Any] = [_make_mouse(move_flags, abs_x, abs_y)]

        if action == "click":
            events.append(_make_mouse(MOUSEEVENTF_LEFTDOWN))
            events.append(_make_mouse(MOUSEEVENTF_LEFTUP))
        elif action == "right_click":
            events.append(_make_mouse(MOUSEEVENTF_RIGHTDOWN))
            events.append(_make_mouse(MOUSEEVENTF_RIGHTUP))
        elif action == "double_click":
            events.extend(
                [
                    _make_mouse(MOUSEEVENTF_LEFTDOWN),
                    _make_mouse(MOUSEEVENTF_LEFTUP),
                    _make_mouse(MOUSEEVENTF_LEFTDOWN),
                    _make_mouse(MOUSEEVENTF_LEFTUP),
                ]
            )
        elif action == "down":
            events.append(_make_mouse(MOUSEEVENTF_LEFTDOWN))
        elif action == "up":
            events.append(_make_mouse(MOUSEEVENTF_LEFTUP))
        elif action == "wheel":
            delta = int(pkt.get("deltaY", -120))
            events.append(_make_mouse(MOUSEEVENTF_WHEEL, data=delta & 0xFFFFFFFF))

        _send_inputs(events)
    except Exception:
        pass


def send_unicode_text(text: str) -> None:
    if not IS_WINDOWS or not text:
        return
    try:
        events: List[Any] = []
        for ch in text[:256]:
            if ch == "\n":
                events.extend([_make_vk(0x0D, False), _make_vk(0x0D, True)])
            else:
                events.extend([_make_unicode(ch, False), _make_unicode(ch, True)])
        _send_inputs(events)
    except Exception:
        pass


def handle_key_packet(pkt: Dict[str, Any]) -> None:
    if not IS_WINDOWS:
        return
    try:
        key_name = str(pkt.get("key", ""))
        if not key_name:
            return
        lower = key_name.lower()
        if lower in VK_MAP:
            vk = VK_MAP[lower]
            _send_inputs([_make_vk(vk, False), _make_vk(vk, True)])
        elif len(key_name) == 1:
            send_unicode_text(key_name)
    except Exception:
        pass


def handle_key_combo(keys: List[str]) -> None:
    if not IS_WINDOWS or not keys:
        return
    try:
        normalized = [k.lower() for k in keys]
        # Note: Windows Secure Attention Sequence (Ctrl+Alt+Del) requires a signed SAS policy;
        # fall back to Ctrl+Shift+Esc (Task Manager) if SAS is restricted.
        if set(normalized) == {"control", "alt", "delete"}:
            vks = [0x11, 0x10, 0x1B]
        else:
            vks = []
            for k in normalized:
                if k in VK_MAP:
                    vks.append(VK_MAP[k])
                elif len(k) == 1 and k.isalnum():
                    vks.append(ord(k.upper()))
        downs = [_make_vk(vk, False) for vk in vks]
        ups = [_make_vk(vk, True) for vk in reversed(vks)]
        _send_inputs(downs + ups)
    except Exception:
        pass


def set_host_clipboard(text: str) -> None:
    if not IS_WINDOWS or not text:
        return
    try:
        subprocess.run(
            ["powershell", "-NoProfile", "-Command", "Set-Clipboard -Value $input"],
            input=text,
            text=True,
            capture_output=True,
            timeout=4,
        )
    except Exception:
        pass
