# 04 — Option B: Custom Website URL (`https://vm.yourdomain.com`) via KasmVNC + Cloudflare Tunnel

> 🔥 **Sabse "Tagda" Pro Developer Setup:** Apni khud ki website (`https://vm.yourdomain.com`) kholo -> Email OTP daalo -> Seedha Browser Tab ke andar High-Speed Desktop (Audio + Clipboard + File Transfer ke saath) chalao!

Yeh setup **Ubuntu Server 24.04 LTS** Guest VM use karta hai jo sirf **~1.5 GB se 2.5 GB RAM** leta hai — dost ke laptop ko bilkul pata bhi nahi chalega ki koi heavy workload chal raha hai (zero lag!).

---

## Architecture Kaise Kaam Karta Hai?

```text
Aapka Browser (https://vm.yourdomain.com)
       |
       v
[ Cloudflare Access Zero Trust ]  <-- Sirf AAPKE Email par OTP aayega (100% Free)
       |
       v (Outbound Encrypted Cloudflare Tunnel — No Port Forwarding!)
[ Hyper-V Ubuntu Server VM ]
       |
       +--> Docker (`restart: always`)
              └── LinuxServer Webtop (KasmVNC Desktop on localhost:3000)
```

### Prerequisites:
1. Dost ke Windows 11 Pro par [`docs/02-host-setup-windows11.md`](02-host-setup-windows11.md) follow karke **Ubuntu Server 24.04 LTS** ka VM bana lein (`3GB` Dynamic RAM kaafi hai).
2. Ek sasta domain (jaise `.xyz`, `.tech`, `.in` — ₹99–₹499/year) jo **Cloudflare Free Account** se connected ho. *(Agar domain nahi hai toh Option A ya Option C ka free Tailscale URL use karein).*

---

## Step 1: Ubuntu VM ke Andar Webtop (KasmVNC) Setup Karein

Aap hamara automated script [`scripts/guest-linux-kasm-cloudflare.sh`](../scripts/guest-linux-kasm-cloudflare.sh) chala sakte hain, ya neeche diye steps manually run karein:

```bash
# 1. Docker & Docker Compose install karein
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER
newgrp docker

# 2. Webtop folder banayein
mkdir -p ~/webtop && cd ~/webtop
```

Ab `~/webtop/docker-compose.yml` banayein (`nano docker-compose.yml`):

```yaml
services:
  webtop:
    image: lscr.io/linuxserver/webtop:ubuntu-xfce
    container_name: remote-webtop
    security_opt:
      - seccomp:unconfined
    environment:
      - PUID=1000
      - PGID=1000
      - TZ=Asia/Kolkata
      - CUSTOM_USER=admin
      - PASSWORD=ChangeThisStrongPassword123!
      - SUBFOLDER=/
      - TITLE=My Remote Cloud PC
    volumes:
      - ./data:/config
    ports:
      - "127.0.0.1:3000:3000"   # Sirf localhost par bind hai (bahar se bina tunnel koi access nahi kar sakta)
    shm_size: "1gb"             # Zaroori: Iske bina container ke andar Chrome crash hota hai!
    restart: always             # VM start hote hi automatic chalu hoga
```

Container start karein:
```bash
docker compose up -d
```

---

## Step 2: Cloudflare Zero Trust Tunnel Connect Karein (Free)

1. Apne browser me **[Cloudflare Zero Trust Dashboard](https://one.dash.cloudflare.com/)** kholein.
2. Left menu me **Networks -> Tunnels** -> **Create a tunnel** -> **Cloudflared** select karein.
3. Tunnel ka naam rakhein: `friend-laptop-vm` -> **Save tunnel**.
4. **Debian (64-bit)** select karein — wahan aapko ek `curl ... && sudo cloudflared service install <TOKEN>` command milega.
5. Woh command **Ubuntu VM ke terminal** me paste karke run kar dein!
   - `cloudflared` ek Linux system service ban jayega jo har reboot par **automatically start** hoga!

### Public Hostname Set Karein:
Cloudflare Tunnel ke **Public Hostname** tab me:
- **Subdomain:** `vm`
- **Domain:** `yourdomain.com`
- **Service Type:** `HTTP`
- **URL:** `localhost:3000`
- **Save hostname** par click karein!

---

## Step 3: Security Lock Lagayein (Cloudflare Access OTP — MUST DO!)

Kabhi bhi remote desktop ko sirf password ke bharose public internet par mat chhodna. Cloudflare Access free me **Google Login / Email OTP wall** laga deta hai:

1. Cloudflare Zero Trust Dashboard -> **Access -> Applications** -> **Add an application** -> **Self-hosted**.
2. **Application name:** `My VM` | **Subdomain:** `vm` | **Domain:** `yourdomain.com`.
3. **Policy Name:** `Only Me` | **Action:** `Allow`.
4. **Configure rules -> Include:** Selector me **`Emails`** chunein aur **sirf apna personal Gmail address** daalein!
5. Save kar dein!

---

## 🚀 Kaise Use Karein?

1. Dost ke laptop par Hyper-V window close kar dein.
2. Jab bhi dost laptop on karega aur Wi-Fi se connect hoga:
   - Hyper-V Ubuntu VM ko background me start karega.
   - Docker `remote-webtop` start karega aur `cloudflared` tunnel jod dega.
3. Aap 1 km door apne ghar pe laptop/tablet me browser kholkar **`https://vm.yourdomain.com`** type karoge:
   - Cloudflare aapse Email maangega -> Gmail pe OTP aayega -> OTP daalte hi **Pura Ubuntu XFCE Desktop aapke browser tab me khul jayega!**
   - Left side me chhota arrow tab hota hai jisse aap **Clipboard Sync, Audio Enable, Fullscreen, aur File Upload/Download** kar sakte ho.
