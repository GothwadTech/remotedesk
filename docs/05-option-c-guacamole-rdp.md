# 05 — Optional Guest VM Setup C: Windows Guest RDP + Apache Guacamole / Tailscale

If your optional Hyper-V Background VM runs **Windows 11 Pro Guest** rather than Linux, you can stream it in any browser using Windows RDP paired with Apache Guacamole or Tailscale.

---

## 1. Enable Remote Desktop Inside the Windows Guest VM

Run inside the Windows 11 Guest VM (not required on the host OS):

```powershell
Set-ItemProperty -Path 'HKLM:\System\CurrentControlSet\Control\Terminal Server' -Name "fDenyTSConnections" -Value 0
Enable-NetFirewallRule -DisplayGroup "Remote Desktop"
```

---

## 2. Connect Without Port Forwarding

1. Install **Tailscale** inside the guest VM (`winget install tailscale.tailscale`) and enable unattended mode so it connects before user login.
2. Optionally run **Apache Guacamole** (HTML5 RDP gateway) in Docker to access the Windows VM directly inside your browser over HTTPS without installing an RDP client on your phone or laptop.
