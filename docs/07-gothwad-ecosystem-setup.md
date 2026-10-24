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

## 3. Automatic Standalone Windows GUI `.exe` Release via GitHub Actions

Repository workflow [`.github/workflows/build-windows-agent.yml`](../.github/workflows/build-windows-agent.yml) automatically compiles the graphical installer **`GothwadRemoteHostSetup.exe`** (`--onefile --noconsole --uac-admin`) on `windows-latest` whenever `main` is updated and publishes it to **GitHub Releases**:

1. Every push to `main` touching `agent/**` or `scripts/**` automatically builds and publishes `GothwadRemoteHostSetup.exe` to the Latest Release (`https://github.com/GothwadTech/remotedesk/releases/latest/download/GothwadRemoteHostSetup.exe`).
2. Users simply click **Turn on** on `https://remotedesktop.gothwadtech.com`, open the downloaded `GothwadRemoteHostSetup.exe`, and finish setup in the GUI or directly from the browser.
