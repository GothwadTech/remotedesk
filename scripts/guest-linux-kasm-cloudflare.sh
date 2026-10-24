#!/usr/bin/env bash
# ==============================================================================
# Ubuntu Guest VM Automated Browser Desktop Setup (KasmVNC Webtop + Cloudflared)
# Run this script INSIDE the isolated Ubuntu 24.04 Guest VM (NOT on Host).
# ==============================================================================

set -euo pipefail

WEBTOP_USER="${WEBTOP_USER:-admin}"
WEBTOP_PASS="${WEBTOP_PASS:-}"
CF_TUNNEL_TOKEN="${CF_TUNNEL_TOKEN:-}"

echo "============================================================"
echo "  Guest VM Browser Desktop Installer (Docker + KasmVNC)     "
echo "============================================================"

if [[ -z "$WEBTOP_PASS" ]]; then
  read -rsp "Set a strong password for Webtop user '${WEBTOP_USER}': " WEBTOP_PASS
  echo ""
  if [[ ${#WEBTOP_PASS} -lt 8 ]]; then
    echo "Error: Password kam se kam 8 characters ka hona chahiye."
    exit 1
  fi
fi

echo "[1/4] Updating packages & installing Docker..."
sudo apt-get update -y
sudo apt-get install -y ca-certificates curl gnupg lsb-release

if ! command -v docker >/dev/null 2>&1; then
  curl -fsSL https://get.docker.com | sudo sh
  sudo systemctl enable --now docker
fi

echo "[2/4] Creating Webtop (Ubuntu XFCE + KasmVNC) Docker Compose stack..."
WORKDIR="$HOME/webtop"
mkdir -p "$WORKDIR/data"

cat > "$WORKDIR/docker-compose.yml" <<EOF
services:
  webtop:
    image: lscr.io/linuxserver/webtop:ubuntu-xfce
    container_name: remote-webtop
    security_opt:
      - seccomp:unconfined
    environment:
      - PUID=$(id -u)
      - PGID=$(id -g)
      - TZ=Asia/Kolkata
      - CUSTOM_USER=${WEBTOP_USER}
      - PASSWORD=${WEBTOP_PASS}
      - SUBFOLDER=/
      - TITLE=Remote Cloud VM
    volumes:
      - ./data:/config
    ports:
      - "127.0.0.1:3000:3000"
    shm_size: "1gb"
    restart: always
EOF

chmod 600 "$WORKDIR/docker-compose.yml"

echo "[3/4] Starting KasmVNC container on 127.0.0.1:3000..."
sudo docker compose -f "$WORKDIR/docker-compose.yml" up -d

if [[ -n "$CF_TUNNEL_TOKEN" ]]; then
  echo "[4/4] Installing Cloudflare Tunnel (cloudflared) auto-start service..."
  if ! command -v cloudflared >/dev/null 2>&1; then
    curl -fsSL https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb -o /tmp/cloudflared.deb
    sudo dpkg -i /tmp/cloudflared.deb
    rm -f /tmp/cloudflared.deb
  fi
  sudo cloudflared service install "$CF_TUNNEL_TOKEN"
  sudo systemctl enable --now cloudflared
  echo "[+] Cloudflared tunnel service active!"
else
  echo "[4/4] Skipping cloudflared install (CF_TUNNEL_TOKEN pass nahi kiya gaya)."
  echo "      Cloudflare Dashboard -> Tunnels me jaakar Debian service command run karein,"
  echo "      aur Public Hostname ko 'http://localhost:3000' par point karein."
fi

echo ""
echo "✅ Setup Complete! Container 'remote-webtop' har boot par auto-start hoga."
