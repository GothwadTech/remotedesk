# 02 — Windows 11 Host Setup & Safe Power Configuration

Run all setup steps on the target Windows 11 computer **only with the explicit consent of the computer's owner**.

---

## 1. Quick Host Setup (Main Desktop Access)

Open **PowerShell as Administrator** on the Windows 11 PC (or copy the generated command from **Set up via PowerShell** inside `https://remotedesktop.gothwadtech.com`):

```powershell
irm https://raw.githubusercontent.com/GothwadTech/remotedesk/main/scripts/install-gothwad-agent.ps1 -OutFile $env:TEMP\install-gothwad-agent.ps1
powershell -ExecutionPolicy Bypass -File $env:TEMP\install-gothwad-agent.ps1 -GothwadUser "your-username" -Slot 1 -DeviceName "Home-Windows-PC"
```

During installation:
1. Confirm explicit PC owner consent (`YES`).
2. Choose a **6 to 12 digit numeric PIN** (stored locally in `C:\ProgramData\GothwadRemote\agent-config.json` and verified via HMAC-SHA256 challenge-response).
3. The script registers the `GothwadRemoteAgent` startup scheduled task so the computer comes online automatically whenever Windows boots.

---

## 2. Safe Laptop Power & Lid Rules (16 GB RAM / 512 GB SSD)

Keep the laptop awake **only while plugged into AC power**, and keep normal sleep active **on battery** so the laptop never overheats inside a closed bag:

```powershell
# Stay awake when plugged into AC wall power
powercfg /change standby-timeout-ac 0
powercfg /change hibernate-timeout-ac 0

# Sleep after 15 minutes when running on battery (thermal safety)
powercfg /change standby-timeout-dc 15
```

---

## 3. Optional Secondary Setup: Isolated Hyper-V Background VM

If you also want an isolated background VM (capped at 4 GB RAM and 60% host CPU):

```powershell
irm https://raw.githubusercontent.com/GothwadTech/remotedesk/main/scripts/host-setup-hyperv.ps1 -OutFile $env:TEMP\host-setup-hyperv.ps1
powershell -ExecutionPolicy Bypass -File $env:TEMP\host-setup-hyperv.ps1 -VMName "RemoteWorkVM" -GuestType "Linux" -IsoPath "C:\HyperV\ISO\ubuntu-24.04.iso"
```

If Hyper-V was not previously enabled on Windows 11 Pro, the script enables `Microsoft-Hyper-V-All` and asks for one reboot before creating the virtual machine.
