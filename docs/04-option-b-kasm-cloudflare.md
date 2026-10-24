# 04 — Optional Guest VM Setup B: KasmVNC Webtop + Cloudflare Tunnel

If you want your optional Hyper-V Background VM (`RemoteWorkVM`) to expose an embeddable HTTPS desktop stream URL (`streamUrl` inside `agent-config.json`), you can run **LinuxServer Webtop (KasmVNC)** behind a **Cloudflare Zero Trust Tunnel**.

---

## 1. Automated Installation Inside the Ubuntu 24.04 Guest VM

Run `scripts/guest-linux-kasm-cloudflare.sh` inside the Ubuntu guest VM:

```bash
export WEBTOP_USER="admin"
export WEBTOP_PASS="ChooseStrongPassword123!"
export CF_TUNNEL_TOKEN="your-cloudflare-tunnel-token"
bash scripts/guest-linux-kasm-cloudflare.sh
```

What this script configures:
1. Installs Docker Engine and enables automatic startup (`systemctl enable --now docker`).
2. Launches `lscr.io/linuxserver/webtop:ubuntu-xfce` bound only to `127.0.0.1:3000` with `restart: always`.
3. Installs `cloudflared` as a systemd service so your tunnel reconnects automatically on boot.

---

## 2. Protect with Cloudflare Zero Trust Access

1. In Cloudflare Zero Trust -> **Networks -> Tunnels**, point a subdomain (for example `vm-box.gothwadtech.com`) to `http://localhost:3000`.
2. In **Access -> Applications**, add an Access policy restricting that hostname to your `@gothwadtech.com` email address so unauthenticated visitors never reach the container login screen.
