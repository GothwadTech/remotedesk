# 07 — Zero-D1 Cloudflare Pages Deployment (`remotedesktop.gothwadtech.com`)

Yeh guide explain karta hai ki **bina koi alag Cloudflare D1 database ya Worker banaye** (bilkul `GothwadTech/meet` ki tarah!) **`https://remotedesktop.gothwadtech.com`** sirf **60 seconds me Cloudflare Pages** par kaise live hoga!

---

## 1. Hume Alag D1 Database Kyun Nahi Chahiye?

Pehle traditional remote tools device list aur signaling ke liye SQL database use karte the, jisme `wrangler d1 create`, UUIDs, aur secrets maintain karne ka jhanjhat rehta tha. Is project me humne **Zero-D1 P2P Architecture** lagaya hai:

| Kaam | Zero-D1 Solution (Koi Database Nahi!) |
| :--- | :--- |
| **Gothwad Login & Multi-Account (`u/0..5`)** | Browser seedha `https://api.gothwadtech.com/api/auth/me` (`credentials: 'include'`) call karta hai! `GothwadTech/accounts` pehle se har `*.gothwadtech.com` subdomain ko allow karta hai. |
| **Auto-Finding Your Windows PCs** | Har PC aapke Gothwad username ke deterministic WebRTC slot (`grd-<username>-slot-1`..`6`) par listen karta hai. Login hote hi browser slots ko P2P probe karke Online PCs dikha deta hai! |
| **PIN & Sharing Permissions (`vm_only` / `host_and_vm`)** | Aapka 6-digit PIN aur allowed `@gothwadtech.com` users seedha Windows Host ke `C:\ProgramData\GothwadRemote\agent-config.json` me rehte hain — aur `HMAC-SHA256(pin, nonce:viewer:mode)` challenge-response se verify hote hain (raw PIN kabhi network par nahi jaata!). |
| **60 FPS Screen + Mouse/Keyboard Stream** | `PeerJS` + Google STUN + OpenRelay TURN (`GothwadTech/meet` wala proven CGNAT-bypass WebRTC stack) se seedha Browser &harr; Windows PC ke beech encrypted DTLS tunnel banta hai! |

---

## 2. Cloudflare Pages Deployment (Sirf 1 Minute — Zero CLI, Zero Secrets!)

1. **Cloudflare Dashboard** kholein -> **Workers & Pages** -> **Create** -> **Pages** tab -> **Connect to Git**.
2. Apni repo **`GothwadTech/remotedesktop`** select karein.
3. Build settings bharein:
   - **Framework preset:** `Vite`
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
4. **Save and Deploy** click karein!
5. Deploy hone ke baad Pages project ke **Custom domains** tab me jaakar **`remotedesktop.gothwadtech.com`** add kar dein.

**Bas khatam!** Koi `wrangler.toml`, koi D1 database, koi Worker route, ya koi secret key dalne ki zaroorat nahi hai!

*(Optional: Agar kabhi future me non-`.gothwadtech.com` domain ya mobile app se OAuth consent screen chahiye ho, tabhi sirf `accounts` D1 ke `ecosystem_apps` me `gothwad-remotedesktop` add karna hota hai — web `remotedesktop.gothwadtech.com` ke liye uski bhi zaroorat nahi hai kyunki `.gothwadtech.com` cookie SSO direct kaam karta hai!)*

---

## 3. GitHub Actions EXE Release (`GothwadTech/remotedesktop`)

Dost ya apne Windows PC par Python install na karna pade, iske liye repo me [`.github/workflows/build-windows-agent.yml`](../.github/workflows/build-windows-agent.yml) laga hua hai:

1. GitHub par **Actions -> Build Windows Agent EXE & Publish GitHub Release -> Run workflow** dabayein (ya `git tag v1.0.0 && git push origin v1.0.0` karein).
2. GitHub ka `windows-latest` server apne-aap **`GothwadRemoteAgent-win64.exe`** aur **`GothwadRemoteSetup-win64.zip`** bana kar **Releases** me daal dega!
3. Uske baad user bas **`https://remotedesktop.gothwadtech.com/setup`** kholega -> wahan diye gaye 1-line PowerShell command ko copy-paste karega -> Owner Consent (`YES`) aur **6-digit PIN** set karega -> PC turant dashboard par **Online** aa jayega!
