# 03 — Optional Guest VM Setup A: Chrome Remote Desktop Inside Ubuntu VM

If you provisioned the optional Hyper-V Background VM (`RemoteWorkVM`), one lightweight way to stream the guest Linux desktop with audio and adaptive WebRTC quality is installing headless Chrome Remote Desktop inside the Ubuntu 24.04 VM.

---

## 1. Install XFCE & Chrome Remote Desktop Inside the Ubuntu VM

Run inside the Ubuntu 24.04 guest terminal:

```bash
sudo apt-get update && sudo apt-get upgrade -y
sudo apt-get install -y xfce4 xfce4-goodies dbus-x11 curl wget

wget https://dl.google.com/linux/direct/chrome-remote-desktop_current_amd64.deb
sudo apt-get install -y ./chrome-remote-desktop_current_amd64.deb
rm -f chrome-remote-desktop_current_amd64.deb

echo "exec /etc/X11/Xsession /usr/bin/xfce4-session" > ~/.chrome-remote-desktop-session
sudo usermod -a -G chrome-remote-desktop "$USER"
```

---

## 2. Register Headless Access & Watchdog

1. Generate a Debian headless registration command and execute it inside the Ubuntu VM terminal.
2. Install the Wi-Fi reconnection watchdog (`scripts/guest-watchdog.sh`) via cron so tunnel services automatically recover after host Wi-Fi changes:

```bash
sudo cp scripts/guest-watchdog.sh /usr/local/bin/guest-watchdog.sh
sudo chmod +x /usr/local/bin/guest-watchdog.sh
(crontab -l 2>/dev/null; echo "*/2 * * * * /usr/local/bin/guest-watchdog.sh >> /var/log/guest-watchdog.log 2>&1") | crontab -
```
