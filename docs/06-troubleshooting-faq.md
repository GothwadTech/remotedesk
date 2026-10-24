# 06 — Troubleshooting & Frequently Asked Questions

Common diagnostics for **Gothwad Remote Desktop (`remotedesktop.gothwadtech.com`)**.

---

## 1. Computer Shows Offline After Boot

- Verify the Windows PC has an active Wi-Fi or hotspot internet connection.
- On the Windows PC, check that the scheduled task is running:
  ```powershell
  Get-ScheduledTask -TaskName "GothwadRemoteAgent" | Select-Object TaskName, State
  Start-ScheduledTask -TaskName "GothwadRemoteAgent"
  ```
- Confirm `C:\ProgramData\GothwadRemote\agent-config.json` contains your exact Gothwad username (`ownerUsername`) and slot (`1..6`).

---

## 2. Incorrect PIN or 5-Minute Lockout

- After **5 consecutive failed PIN attempts**, `gothwad_agent.py` enforces an automatic **5-minute lockout** to prevent brute-force guessing.
- Wait 5 minutes or update the PIN locally on the Windows PC by re-running `--pair` with owner confirmation.

---

## 3. Mobile Keyboard or Cursor Control

- Tap the **Keyboard** icon in the floating top viewer bar to open the Android or iOS on-screen keyboard.
- Tap the **Touch / Trackpad** icon to switch between direct tap-to-click mode and laptop-style relative trackpad cursor dragging.

---

## 4. Removing Gothwad Remote Desktop Completely

To remove the host service and configuration cleanly from a Windows PC at any time:

```powershell
Unregister-ScheduledTask -TaskName "GothwadRemoteAgent" -Confirm:$false
Stop-Process -Name "GothwadRemoteAgent*" -Force -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force "C:\Program Files\GothwadRemote", "C:\ProgramData\GothwadRemote"
```
