# 05 — Option C: Full Windows VM in Browser (RDP / Self-Hosted Gateway Alternatives)

Agar aapko **Guest VM ke andar Windows 10/11 Pro** hi chalana hai aur aap Google ke Chrome Remote Desktop (Option A) ke alawa **pure Browser URL** alternatives dekh rahe hain, toh yeh 2 tarike sabse best aur lightweight hain:

---

## Method C1: DWService Inside Windows VM (Zero Domain, Ultra-Light ~20MB RAM)

**[DWService](https://www.dwservice.net/)** ek lightweight open-source agent hai jo seedha browser ke andar **Screen Control + File Explorer (Upload/Download) + Command Prompt** teeno de deta hai:

1. [`docs/02-host-setup-windows11.md`](02-host-setup-windows11.md) ke hisaab se Hyper-V me **Windows 10/11 Guest VM** banayein.
2. Apne browser me `https://www.dwservice.net` par free account banayein (**2FA / Two-Factor Auth** zaroor on karein) aur **Agents -> New Agent** click karke **Install Code** lein.
3. **Windows Guest VM ke andar** `dwagent.exe` download karke **Install** select karein aur apna Install Code daal dein.
4. `DWAgent` Windows Service ki tarah install ho jaata hai (boot hote hi Lock Screen se pehle chalu ho jaata hai aur sirf ~20MB RAM leta hai!).
5. Ab kahin se bhi browser me `dwservice.net` login karein -> **Screen** click karein -> Pura Windows VM browser me control karein!

---

## Method C2: Apache Guacamole + Tailscale HTTPS (100% Private Self-Hosted HTML5 RDP)

Agar aap kisi third-party remote screen relay ki jagah **apna khud ka HTML5 RDP Gateway** chalana chahte hain (bina domain kharide!), toh **Apache Guacamole + Tailscale** best combination hai.

### Architecture:
- **Guest VM 1 (`WinVM` — 3.5GB RAM):** Windows 10/11 Pro jisme built-in **Remote Desktop (RDP Port 3389)** enabled hai.
- **Guest VM 2 (`GatewayVM` — 512MB RAM Alpine/Ubuntu Server):** Isme **Apache Guacamole** (Docker) aur **Tailscale** chalta hai. Dono VMs Hyper-V ke same `Default Switch` par hone ki wajah se aapas me fast local network par baat karte hain!

### Setup Steps (`GatewayVM` Ubuntu/Debian Mini Server par):

#### 1. Windows Guest VM (`WinVM`) me RDP Enable Karein:
Windows Guest VM ke andar PowerShell (Admin) kholkar run karein:
```powershell
# Windows VM ke andar RDP enable karein
Set-ItemProperty -Path 'HKLM:\System\CurrentControlSet\Control\Terminal Server' -name "fDenyTSConnections" -value 0
Enable-NetFirewallRule -DisplayGroup "Remote Desktop"

# VM ka internal hostname check karein (jaise WinVM.mshome.net)
hostname
```

#### 2. `GatewayVM` me Docker + Guacamole Chalu Karein:
```bash
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER && newgrp docker

mkdir -p ~/guac && cd ~/guac
cat << 'EOF' > docker-compose.yml
services:
  guacamole:
    image: abesnier/guacamole:latest
    container_name: guacamole
    ports:
      - "127.0.0.1:8080:8080"
    volumes:
      - ./config:/config
    restart: always
EOF

docker compose up -d
```

#### 3. Tailscale HTTPS URL Enable Karein (Free `https://...ts.net` URL, Zero Public Exposure!):
```bash
# Tailscale install karein
curl -fsSL https://tailscale.com/install.sh | sh
sudo tailscale up

# Port 8080 ko private HTTPS URL par background me serve karein
sudo tailscale serve --bg 8080
```

Tailscale aapko ek private URL dega jaise:
👉 `https://gatewayvm.tail12345.ts.net/`

#### 4. Guacamole Configure Karein:
1. Apne laptop/phone par **Tailscale** on rakhein aur browser me `https://gatewayvm.tail12345.ts.net/` kholein.
2. Default login (`guacadmin` / `guacadmin`) se ghuste hi **sabse pehle Settings -> Users me jaakar `guacadmin` ka password strong password se badlein aur TOTP 2FA on karein!**
3. **Settings -> Connections -> New Connection:**
   - **Protocol:** `RDP`
   - **Hostname:** `WinVM.mshome.net` *(Hyper-V `Default Switch` automatic `.mshome.net` local DNS deta hai — IP change hone ka darr bhi khatam!)*
   - **Port:** `3389`
   - **Username / Password:** Apne Windows VM ka username aur password
   - **Security mode:** `NLA` + Tick `Ignore server certificate`
4. Save karein! Ab jab bhi aap browser me apna `https://gatewayvm.tail12345.ts.net` kholenge, click karte hi **Full-Screen 60FPS Windows RDP seedha Chrome/Edge ke andar khulega!**
