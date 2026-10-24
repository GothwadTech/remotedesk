# 07 — Zero-D1 Cloudflare Pages Deployment (`remotedesktop.gothwadtech.com`)

`GothwadTech/remotedesk` deploys as a pure static **Cloudflare Pages** application — no Cloudflare D1 database, no Worker backend, and no runtime secrets required.

---

## 1. Zero-D1 Architecture Summary

| Capability | Implementation |
| :--- | :--- |
| **Gothwad SSO & Multi-Account (`u/0..5`)** | Direct browser calls to `https://api.gothwadtech.com/api/auth/me` (`credentials: 'include'`) plus the shared Universal Account Menu widget (`https://accounts.gothwadtech.com/widget/account-menu.js`). |
| **Automatic Device Discovery** | Each paired Windows host listens on deterministic WebRTC slot `grd-<username>-slot-1..6`. On sign-in, the web app probes your slots over PeerJS and displays online computers immediately. |
| **PIN & Access Control (`host_and_vm` / `vm_only`)** | Stored locally on the Windows host in `C:\ProgramData\GothwadRemote\agent-config.json` and verified with constant-time `HMAC-SHA256(pin, nonce:viewer:mode)`. |
| **Screen & Input Transport** | End-to-end DTLS-encrypted WebRTC DataChannels (`PeerJS` + Google STUN + OpenRelay TURN over port 443). |

---

## 2. Deploy to Cloudflare Pages in 60 Seconds

1. Open **Cloudflare Dashboard -> Workers & Pages -> Create -> Pages -> Connect to Git**.
2. Select repository **`GothwadTech/remotedesk`**.
3. Configure build settings:
   - **Framework preset:** `Vite`
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
4. Click **Save and Deploy**.
5. Under **Custom domains**, attach **`remotedesktop.gothwadtech.com`**.

---

## 3. Build Standalone Windows `.exe` Release via GitHub Actions

Repository workflow [`.github/workflows/build-windows-agent.yml`](../.github/workflows/build-windows-agent.yml) compiles `agent/gothwad_agent.py` into `GothwadRemoteAgent-win64.exe` on `windows-latest`:

1. Open **GitHub -> Actions -> Build Windows Agent EXE & Publish GitHub Release -> Run workflow** (or push a version tag such as `v1.0.0`).
2. Download `GothwadRemoteAgent-win64.exe` from Releases or run the one-line PowerShell installer inside the **Set up via PowerShell** tab on `https://remotedesktop.gothwadtech.com`.
