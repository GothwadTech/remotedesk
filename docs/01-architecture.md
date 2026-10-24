# 01 — Architecture: Zero-D1 WebRTC P2P & Optional Hyper-V VM

This document explains how **Gothwad Remote Desktop (`remotedesktop.gothwadtech.com`)** connects to a remote Windows 11 laptop over Wi-Fi or mobile hotspot without router port forwarding, without a Cloudflare D1 database, and with optional background VM isolation.

---

## 1. Primary Mode vs Secondary Background VM Mode

1. **Primary Mode — Main Windows 11 Desktop (`host_os`):**
   - Works just like Google Chrome Remote Desktop.
   - Streams the Windows 11 desktop over WebRTC DataChannels and forwards mouse, trackpad, keyboard, and clipboard input.
   - Displays a visible `"Your desktop is shared with <user>@gothwadtech.com [Stop Sharing]"` banner on the host monitor whenever a session is active.
2. **Secondary Optional Mode — Isolated Hyper-V Background VM (`hyperv_vm`):**
   - Windows 11 Pro includes Microsoft's Type-1 **Hyper-V** hypervisor (`vmms` service).
   - If enabled, an isolated Linux or Windows guest VM runs headlessly in the background (capped at **4 GB dynamic RAM** and **60% CPU**) so remote work never disturbs the person using the physical laptop.

---

## 2. Solving Wi-Fi & CGNAT Without Router Access

Residential fiber and mobile hotspots place laptops behind **CGNAT** (no public IPv4 address for port forwarding). In addition, bridging a laptop Wi-Fi adapter directly in Hyper-V frequently drops wireless connections.

Our architecture solves both problems cleanly:
1. **Outbound WebRTC + TURN Relay:** The Windows host agent (`gothwad_agent.py`) opens an outbound WebSocket to PeerJS signaling and establishes peer-to-peer WebRTC connections via Google STUN and OpenRelay TURN over port `443` — zero router configuration or inbound firewall rules required.
2. **Hyper-V `Default Switch` (NAT):** For the optional Background VM, Hyper-V's built-in `Default Switch` automatically NATs traffic over whichever Wi-Fi network or phone hotspot the Windows host joins.

---

## 3. Boot-to-Browser Lifecycle

```text
[00:00s] Windows 11 laptop powers on
[00:15s] Scheduled Task starts GothwadRemoteAgent.exe in the background
[00:20s] Host connects to Wi-Fi and registers on P2P slot grd-<username>-slot-1
[00:30s] (Optional) Hyper-V service resumes RemoteWorkVM after a 30s SSD-friendly delay
[00:35s] Open remotedesktop.gothwadtech.com on phone or desktop -> Click Connect -> Enter 6-digit PIN
```

When the Windows laptop shuts down cleanly, Hyper-V automatically saves any running VM state (`AutomaticStopAction = Save`) and resumes it on the next boot.
