# Gothwad Remote Desktop (`remotedesktop.gothwadtech.com`)

**Simple, fast browser-based Remote Desktop for phone and desktop — powered by Gothwad Accounts (`@gothwadtech.com`), Zero-D1 Cloudflare Pages, and WebRTC P2P.**

Modeled on Google Chrome Remote Desktop (`remotedesktop.google.com`), `GothwadTech/remotedesk` lets you connect to your **Windows 11 Main Desktop** in one tap from any mobile phone or desktop browser, with an optional secondary **Isolated Hyper-V Background VM** mode when you want a separate workspace without disturbing the physical screen.

---

## Key Features

- **Simple Chrome Remote Desktop UI (Phone & Desktop):**
  - Clean three-section layout: **Remote Access**, **Remote Support**, and **Set up via PowerShell** (desktop left navigation rail + mobile bottom navigation bar).
  - Exact ecosystem theme palette: **`#212121`** in Dark mode and **`#ffffff`** in Light mode with instant theme switching.
  - **Universal Gothwad Account Menu** (`https://accounts.gothwadtech.com/widget/account-menu.js`) with multi-account (`u/0..5`) switching and `+n` avatar badge.
- **Chrome Remote Desktop Installation Flow + Native GUI `.exe`:**
  - Click **Turn on** inside `remotedesktop.gothwadtech.com` -> downloads **`GothwadRemoteHostSetup.exe`** -> choose Computer Name & 6-digit PIN -> launches `gothwad-remote://setup` directly into the Windows app.
  - Or simply double-click **`GothwadRemoteHostSetup.exe`** on Windows (like an Android APK) to configure your Gothwad Account and 6-digit PIN inside the `#212121` native graphical installer with zero PowerShell commands.
- **Mobile-Ready Full-Screen Viewer + Administrator Tools:**
  - Collapsible floating top toolbar handle so 100% of your phone screen stays unobstructed.
  - Dedicated mobile **Keyboard** button, **Direct Touch / Trackpad** cursor toggle, and a slide-over **Tools** drawer with **File Transfer (Upload/Download)**, **Administrator PowerShell**, and **Live Task Manager**.
- **Main Desktop First, Background VM Optional:**
  - Primary click connects straight to your Windows 11 Main Desktop (with a visible Chrome Remote Desktop-style `"Your desktop is shared [Stop Sharing]"` banner on the host).
  - Optional secondary **Hyper-V Background VM** (`Max 4 GB RAM`, `60% CPU`, Wi-Fi `Default Switch` NAT) accessible from the device overflow menu or viewer toggle.
- **100% Zero-D1 / Zero-Backend Cloudflare Pages:**
  - Uses `.gothwadtech.com` SSO cookies via `https://api.gothwadtech.com/api/auth/me` directly from the browser.
  - Deterministic WebRTC P2P discovery (`grd-<username>-slot-1..6`) via `PeerJS` + STUN/TURN.
  - Constant-time `HMAC-SHA256(pin, nonce:viewer:mode)` challenge-response PIN verification on the Windows host (raw PIN never crosses the network).

---

## Safety & Owner Consent

1. **Explicit Owner Consent Required:** One-time setup on any Windows PC must only be run with the explicit permission of the computer's owner (`--confirm-owner-consent`).
2. **Visible Screen-Sharing Notice:** Connecting to the Main Windows Desktop displays an always-on-top `"Your desktop is shared ... [Stop Sharing]"` banner on the host monitor.
3. **Battery Protection:** Never disable **"On Battery"** sleep so a laptop closed inside a backpack cannot overheat.

---

## Documentation Index

- [`docs/01-architecture.md`](docs/01-architecture.md) — Zero-D1 WebRTC P2P & Wi-Fi NAT architecture
- [`docs/02-host-setup-windows11.md`](docs/02-host-setup-windows11.md) — Windows 11 host setup & safe power rules
- [`docs/03-option-a-crd-vm.md`](docs/03-option-a-crd-vm.md) — Optional Background VM with Chrome Remote Desktop
- [`docs/04-option-b-kasm-cloudflare.md`](docs/04-option-b-kasm-cloudflare.md) — Optional Background VM with KasmVNC & Cloudflare Tunnel
- [`docs/05-option-c-guacamole-rdp.md`](docs/05-option-c-guacamole-rdp.md) — Optional Background VM with Tailscale & RDP
- [`docs/06-troubleshooting-faq.md`](docs/06-troubleshooting-faq.md) — Wi-Fi reconnects, PIN lockouts, and troubleshooting
- [`docs/07-gothwad-ecosystem-setup.md`](docs/07-gothwad-ecosystem-setup.md) — 60-second Cloudflare Pages deployment guide

---

## Local Development

```bash
npm install
npm test
npm run dev
```

Build static bundle for Cloudflare Pages (`dist/`):

```bash
npm run build
```
