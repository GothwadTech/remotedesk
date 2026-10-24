# Gothwad Remote Desktop (`remotedesktop.gothwadtech.com`)

**100% Zero-Database, Zero-Worker Cloudflare Pages Portal — Main Windows 11 OS Control + Headless Isolated Hyper-V Background VM, Secured by Gothwad Accounts (`@gothwadtech.com`) & WebRTC P2P!**

Yeh repository (`GothwadTech/remotedesktop`) bilkul **`GothwadTech/meet`** ki tarah **Zero-D1 / Zero-Backend** architecture par bani hai — Cloudflare par **koi D1 database nahi banana, koi Worker deploy nahi karna, koi secret set nahi karna!** Bas repo ko Cloudflare Pages se connect karo aur `remotedesktop.gothwadtech.com` live!

---

## ⚠️ Important Consent & Transparency Rules

1. **Explicit Owner Permission Mandatory:** Kisi bhi Windows PC par one-time setup sirf unki **clear permission aur जानकारी** se karein (Agent pairing bina explicit consent confirm kiye reject ho jaati hai).
2. **Dual-Mode Transparency:**
   - **🖥️ Mode 1 (Main Windows 11 Host OS):** Jab aap main OS connect karte ho, toh bilkul *Chrome Remote Desktop* ki tarah host screen par `"Your desktop is shared with username@gothwadtech.com [Stop Sharing]"` banner dikhta hai.
   - **📦 Mode 2 (Background Hyper-V VM):** Jab dost apna kaam kar raha ho, toh aap isolated Hyper-V VM me connect hote ho — dost ki screen, mouse, ya personal files bilkul disturb nahi hoti!
3. **Laptop Battery Safety:** Kabhi bhi **"On Battery"** sleep disable mat karna taaki bag me band laptop overheat na ho.

---

## 🧠 Bina Cloudflare D1 Database ke Kaise Kaam Karta Hai? (Zero-D1 Magic!)

1. **Direct Gothwad Accounts SSO (`api.gothwadtech.com`):**
   - `GothwadTech/accounts` pehle se har `*.gothwadtech.com` subdomain ke liye CORS + `.gothwadtech.com` `HttpOnly` multi-account cookies (`u/0..5`) allow karta hai!
   - Isliye `remotedesktop.gothwadtech.com` seedha browser se `https://api.gothwadtech.com/api/auth/me` call karke aapka `@gothwadtech.com` user verify kar leta hai — kisi alag Worker ya D1 ki zaroorat hi nahi!
2. **Deterministic WebRTC P2P Slots (`PeerJS` + STUN/TURN, `GothwadTech/meet` Stack):**
   - Jab aapka Windows PC start hota hai, `GothwadRemoteAgent.exe` aapke Gothwad username ke deterministic P2P slot (`grd-<username>-slot-1`..`6`) par online aa jaata hai.
   - Jab aap duniya me kahin se bhi `remotedesktop.gothwadtech.com` kholte ho, browser aapke slots ko P2P probe karke turant **Online**, **RAM/CPU**, aur **Hyper-V VM State** dikha deta hai!
3. **Zero-Knowledge HMAC-SHA256 PIN + Host-Local ACL (`agent-config.json`):**
   - Aapka **6-digit PIN** aur allowed `@gothwadtech.com` users (`vm_only` vs `host_and_vm`) seedha Windows Host ke `C:\ProgramData\GothwadRemote\agent-config.json` me rehte hain.
   - Connect karte waqt raw PIN kabhi network par nahi jaata — fresh `nonce` ke saath `HMAC-SHA256(pin, nonce + ":" + viewer + ":" + mode)` verify hota hai (5 galat tries par 5-min lockout!).

---

## ✨ Website ke Andar Built-in Windows Setup Wizard (`/setup`)

Bilkul `remotedesktop.google.com/headless` ki tarah `https://remotedesktop.gothwadtech.com` par top bar me **`Windows Setup & Commands`** tab hai jahan user ko saare steps aur copy-paste PowerShell commands website ke andar hi mil jaate hain:
- **Mode Picker:** `Main OS + Background VM`, `Main OS Only` (2-min setup), ya `Background VM Only`.
- **Interactive Hyper-V VM Builder:** RAM, Disk, Linux/Windows ISO badalte hi live PowerShell command banti hai.
- **1-Line Gothwad P2P Installer Command** + Direct `.EXE` / `.ZIP` GitHub Release download buttons.
- **Safe Charger Power Command** (`standby-timeout-ac 0`, battery sleep protected).

---

## 🚀 60-Second Cloudflare Pages Deployment (Zero D1, Zero Secrets!)

1. **Cloudflare Dashboard -> Workers & Pages -> Create -> Pages -> Connect to Git (`GothwadTech/remotedesktop`)**
2. **Build command:** `npm run build`
3. **Build output directory:** `dist`
4. **Custom domain:** `remotedesktop.gothwadtech.com`
5. **Done!** 🎉

---

## 📚 Documentation Index (`docs/`)

1. **[`docs/07-gothwad-ecosystem-setup.md`](docs/07-gothwad-ecosystem-setup.md)** — ⭐ **START HERE:** Zero-D1 Architecture, Cloudflare Pages 1-Step Deploy & GitHub Actions EXE Release Guide.
2. **[`docs/01-architecture.md`](docs/01-architecture.md)** — Hyper-V Type-1 Service, `Default Switch` Wi-Fi NAT & CGNAT Bypass Deep Dive.
3. **[`docs/02-host-setup-windows11.md`](docs/02-host-setup-windows11.md)** — Windows 11 Pro (16GB/512GB) Safe RAM/CPU Limits & Auto-Boot VM Guide.
4. **[`docs/03-option-a-crd-vm.md`](docs/03-option-a-crd-vm.md)** — Alternative A: Chrome Remote Desktop Inside Guest VM.
5. **[`docs/04-option-b-kasm-cloudflare.md`](docs/04-option-b-kasm-cloudflare.md)** — Alternative B: KasmVNC (`Webtop`) + Cloudflare Tunnel.
6. **[`docs/05-option-c-guacamole-rdp.md`](docs/05-option-c-guacamole-rdp.md)** — Alternative C: DWService / Apache Guacamole HTML5 Windows RDP.
7. **[`docs/06-troubleshooting-faq.md`](docs/06-troubleshooting-faq.md)** — 1080p Resolution Fix, Wi-Fi Drop Watchdog, Gaming Pause/Resume Shortcut & SSD Compacting.
