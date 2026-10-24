#!/usr/bin/env bash
# ==============================================================================
# Guest VM Wi-Fi Reconnection & Tunnel Health Watchdog
# Checks internet availability and restarts stalled remote-access services
# inside the Guest VM if they dropped during a host Wi-Fi change.
# ==============================================================================

set -u

TIMESTAMP="$(date '+%Y-%m-%d %H:%M:%S')"

# 1. Check if the host Wi-Fi currently has internet access
if ! curl -fsS --max-time 8 https://clients3.google.com/generate_204 >/dev/null 2>&1; then
  echo "[$TIMESTAMP] Internet abhi offline hai (Host Wi-Fi disconnected). Waiting for next cycle..."
  exit 0
fi

# 2. Internet is UP — ensure installed remote-access services are active

# Check Cloudflare Tunnel (Option B)
if systemctl list-unit-files | grep -q '^cloudflared\.service'; then
  if ! systemctl is-active --quiet cloudflared; then
    echo "[$TIMESTAMP] Restarting cloudflared.service..."
    sudo systemctl restart cloudflared
  fi
fi

# Check Tailscale (Option C)
if systemctl list-unit-files | grep -q '^tailscaled\.service'; then
  if ! systemctl is-active --quiet tailscaled; then
    echo "[$TIMESTAMP] Restarting tailscaled.service..."
    sudo systemctl restart tailscaled
  fi
fi

# Check Chrome Remote Desktop units (Option A on Linux)
for unit in $(systemctl list-units --type=service --all --no-legend 'chrome-remote-desktop@*' | awk '{print $1}'); do
  if ! systemctl is-active --quiet "$unit"; then
    echo "[$TIMESTAMP] Restarting $unit..."
    sudo systemctl restart "$unit"
  fi
done

# Check Docker Webtop container if present (Option B)
if command -v docker >/dev/null 2>&1; then
  if docker ps -a --format '{{.Names}}' | grep -q '^remote-webtop$'; then
    if ! docker ps --format '{{.Names}}' | grep -q '^remote-webtop$'; then
      echo "[$TIMESTAMP] Starting stopped remote-webtop container..."
      docker start remote-webtop
    fi
  fi
fi
