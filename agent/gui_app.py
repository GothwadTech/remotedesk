"""
Native Windows GUI Installer & Host Control Panel (#212121 Dark Theme)
======================================================================
Opens when a user double-clicks GothwadRemoteHostSetup.exe (like an Android APK)
or when launched from https://remotedesktop.gothwadtech.com via gothwad-remote://.
"""

from __future__ import annotations

import platform
import threading
import webbrowser
from typing import Dict, Optional

from installer_win import (
    grant_shared_user,
    install_windows_binary_only,
    is_daemon_running,
    load_config,
    register_and_start_background_service,
    save_config,
    uninstall_windows_host,
)

PORTAL_URL = "https://remotedesktop.gothwadtech.com"


def launch_gui(prefill: Optional[Dict[str, str]] = None) -> None:
    import tkinter as tk
    from tkinter import messagebox

    # Pre-install binary & URL protocol handler silently as soon as installer opens
    threading.Thread(target=install_windows_binary_only, daemon=True).start()

    existing = load_config() or {}
    from_browser = bool(prefill and prefill.get("owner"))

    root = tk.Tk()
    root.title("Gothwad Remote Desktop Host")
    root.geometry("470x560")
    root.resizable(False, False)
    root.configure(bg="#212121")

    # Center window on screen
    root.update_idletasks()
    x_pos = (root.winfo_screenwidth() - 470) // 2
    y_pos = max(40, (root.winfo_screenheight() - 560) // 2)
    root.geometry(f"470x560+{x_pos}+{y_pos}")

    header = tk.Frame(root, bg="#212121", padx=24, pady=18)
    header.pack(fill=tk.X)

    tk.Label(
        header,
        text="Gothwad Remote Desktop",
        fg="#ffffff",
        bg="#212121",
        font=("Segoe UI", 15, "bold"),
    ).pack(anchor="w")

    subtitle_text = (
        f"Browser setup request for {prefill['owner']}@gothwadtech.com"
        if from_browser and prefill
        else "Install & manage unattended remote access for this Windows PC"
    )
    tk.Label(
        header,
        text=subtitle_text,
        fg="#a3a3a3",
        bg="#212121",
        font=("Segoe UI", 9),
    ).pack(anchor="w", pady=(2, 0))

    status_var = tk.StringVar()

    def refresh_status_label() -> None:
        cfg = load_config()
        if cfg and (is_daemon_running() or not platform.system() == "Windows"):
            status_var.set(f"● Active — {cfg['ownerUsername']}@gothwadtech.com ({cfg['peerId']})")
            status_lbl.configure(fg="#34d399")
        elif cfg:
            status_var.set(f"○ Configured ({cfg['peerId']}) — Starting background service...")
            status_lbl.configure(fg="#fbbf24")
        else:
            status_var.set("○ Not configured yet — Enter your Gothwad Account & PIN below")
            status_lbl.configure(fg="#a3a3a3")

    status_card = tk.Frame(
        root, bg="#2a2a2a", padx=14, pady=10, highlightthickness=1, highlightbackground="#3a3a3a"
    )
    status_card.pack(fill=tk.X, padx=24, pady=(0, 14))
    status_lbl = tk.Label(
        status_card,
        textvariable=status_var,
        fg="#a3a3a3",
        bg="#2a2a2a",
        font=("Segoe UI", 9, "bold"),
    )
    status_lbl.pack(anchor="w")

    form = tk.Frame(
        root, bg="#262626", padx=18, pady=16, highlightthickness=1, highlightbackground="#363636"
    )
    form.pack(fill=tk.BOTH, expand=True, padx=24, pady=(0, 16))

    def add_field(label: str, default_val: str = "", secret: bool = False) -> tk.Entry:
        tk.Label(form, text=label, fg="#d4d4d4", bg="#262626", font=("Segoe UI", 9)).pack(
            anchor="w", pady=(6, 3)
        )
        entry = tk.Entry(
            form,
            bg="#191919",
            fg="#ffffff",
            insertbackground="#ffffff",
            relief=tk.FLAT,
            highlightthickness=1,
            highlightbackground="#404040",
            highlightcolor="#0494f4",
            font=("Segoe UI", 10),
            show="•" if secret else "",
        )
        entry.insert(0, default_val)
        entry.pack(fill=tk.X, ipady=6)
        return entry

    init_owner = (prefill.get("owner") if prefill else "") or existing.get("ownerUsername", "")
    init_name = (
        (prefill.get("name") if prefill else "")
        or existing.get("deviceName", "")
        or platform.node()
        or "Home-Windows-PC"
    )
    init_pin = (prefill.get("pin") if prefill else "") or existing.get("pin", "")
    init_slot = int((prefill.get("slot") if prefill and prefill.get("slot") else 0) or existing.get("slot", 1))

    owner_entry = add_field("Gothwad Username or Email (e.g. name@gothwadtech.com)", init_owner)
    name_entry = add_field("Computer Name", init_name)

    pin_row = tk.Frame(form, bg="#262626")
    pin_row.pack(fill=tk.X, pady=(6, 0))

    pin_left = tk.Frame(pin_row, bg="#262626")
    pin_left.pack(side=tk.LEFT, fill=tk.X, expand=True, padx=(0, 6))
    tk.Label(pin_left, text="6-Digit PIN", fg="#d4d4d4", bg="#262626", font=("Segoe UI", 9)).pack(
        anchor="w", pady=(0, 3)
    )
    pin_entry = tk.Entry(
        pin_left,
        bg="#191919",
        fg="#ffffff",
        insertbackground="#ffffff",
        relief=tk.FLAT,
        highlightthickness=1,
        highlightbackground="#404040",
        highlightcolor="#0494f4",
        font=("Consolas", 11),
        show="•",
    )
    pin_entry.insert(0, init_pin)
    pin_entry.pack(fill=tk.X, ipady=6)

    pin_right = tk.Frame(pin_row, bg="#262626")
    pin_right.pack(side=tk.LEFT, fill=tk.X, expand=True, padx=(6, 0))
    tk.Label(pin_right, text="Confirm PIN", fg="#d4d4d4", bg="#262626", font=("Segoe UI", 9)).pack(
        anchor="w", pady=(0, 3)
    )
    pin2_entry = tk.Entry(
        pin_right,
        bg="#191919",
        fg="#ffffff",
        insertbackground="#ffffff",
        relief=tk.FLAT,
        highlightthickness=1,
        highlightbackground="#404040",
        highlightcolor="#0494f4",
        font=("Consolas", 11),
        show="•",
    )
    pin2_entry.insert(0, init_pin)
    pin2_entry.pack(fill=tk.X, ipady=6)

    consent_var = tk.BooleanVar(value=bool(existing))
    tk.Checkbutton(
        form,
        text="I am this PC's owner (or have explicit owner consent) to enable remote access.",
        variable=consent_var,
        bg="#262626",
        fg="#d4d4d4",
        selectcolor="#191919",
        activebackground="#262626",
        activeforeground="#ffffff",
        font=("Segoe UI", 8),
        wraplength=390,
        justify=tk.LEFT,
    ).pack(anchor="w", pady=(12, 10))

    def on_install_and_start() -> None:
        if not consent_var.get():
            messagebox.showwarning(
                "Owner Consent Required",
                "Please confirm explicit PC owner consent before enabling remote access.",
            )
            return
        p1 = pin_entry.get().strip()
        p2 = pin2_entry.get().strip()
        if p1 != p2:
            messagebox.showerror("PIN Mismatch", "The two PIN entries do not match.")
            return
        try:
            cfg = save_config(
                owner_raw=owner_entry.get(),
                slot=init_slot,
                device_name=name_entry.get(),
                pin=p1,
            )
            install_btn.configure(text="Installing & Starting...", state=tk.DISABLED)
            root.update_idletasks()
            register_and_start_background_service()
            refresh_status_label()
            install_btn.configure(text="Update Settings & Restart Host", state=tk.NORMAL)
            messagebox.showinfo(
                "Remote Access Enabled",
                f"This Windows PC ('{cfg['deviceName']}') is now linked to "
                f"{cfg['ownerUsername']}@gothwadtech.com.\n\n"
                f"Open {PORTAL_URL} on your phone or another PC to connect.",
            )
        except Exception as exc:
            install_btn.configure(text="Install & Turn On Remote Access", state=tk.NORMAL)
            messagebox.showerror("Setup Error", str(exc))

    primary_label = (
        "Allow & Turn On Remote Access"
        if from_browser
        else ("Update Settings & Restart Host" if existing else "Install & Turn On Remote Access")
    )
    install_btn = tk.Button(
        form,
        text=primary_label,
        command=on_install_and_start,
        bg="#0494f4",
        fg="#ffffff",
        activebackground="#0382d6",
        activeforeground="#ffffff",
        relief=tk.FLAT,
        cursor="hand2",
        font=("Segoe UI", 10, "bold"),
        pady=9,
    )
    install_btn.pack(fill=tk.X, pady=(2, 8))

    bottom_row = tk.Frame(form, bg="#262626")
    bottom_row.pack(fill=tk.X)

    tk.Button(
        bottom_row,
        text="Open Web Portal",
        command=lambda: webbrowser.open(PORTAL_URL),
        bg="#333333",
        fg="#e5e5e5",
        activebackground="#404040",
        activeforeground="#ffffff",
        relief=tk.FLAT,
        font=("Segoe UI", 9),
        padx=12,
        pady=5,
    ).pack(side=tk.LEFT)

    def on_share_quick() -> None:
        share_win = tk.Toplevel(root)
        share_win.title("Share Access")
        share_win.geometry("340x180")
        share_win.configure(bg="#262626")
        tk.Label(
            share_win,
            text="Grant access to another @gothwadtech.com user:",
            fg="#e5e5e5",
            bg="#262626",
            font=("Segoe UI", 9),
        ).pack(anchor="w", padx=16, pady=(14, 4))
        u_ent = tk.Entry(share_win, bg="#191919", fg="#ffffff", insertbackground="#ffffff", relief=tk.FLAT)
        u_ent.pack(fill=tk.X, padx=16, ipady=5)

        def save_share() -> None:
            try:
                grant_shared_user(u_ent.get(), "host_and_vm")
                messagebox.showinfo("Shared", f"Granted full access to {u_ent.get().strip()}.")
                share_win.destroy()
            except Exception as exc:
                messagebox.showerror("Error", str(exc))

        tk.Button(
            share_win,
            text="Grant Access",
            command=save_share,
            bg="#0494f4",
            fg="#ffffff",
            relief=tk.FLAT,
            pady=6,
        ).pack(fill=tk.X, padx=16, pady=14)

    tk.Button(
        bottom_row,
        text="Share PC...",
        command=on_share_quick,
        bg="#333333",
        fg="#e5e5e5",
        activebackground="#404040",
        activeforeground="#ffffff",
        relief=tk.FLAT,
        font=("Segoe UI", 9),
        padx=12,
        pady=5,
    ).pack(side=tk.LEFT, padx=8)

    def on_uninstall() -> None:
        if messagebox.askyesno(
            "Disable Remote Access",
            "Turn off Gothwad Remote Desktop and remove background startup from this PC?",
        ):
            uninstall_windows_host()
            refresh_status_label()
            messagebox.showinfo("Removed", "Remote access has been turned off on this computer.")

    tk.Button(
        bottom_row,
        text="Turn Off",
        command=on_uninstall,
        bg="#3b1d1d",
        fg="#fca5a5",
        activebackground="#522222",
        activeforeground="#ffffff",
        relief=tk.FLAT,
        font=("Segoe UI", 9),
        padx=12,
        pady=5,
    ).pack(side=tk.RIGHT)

    refresh_status_label()
    root.mainloop()
