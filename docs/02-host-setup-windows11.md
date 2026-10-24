# 02 — Host PC Setup (Dost ke Windows 11 Pro Laptop Par One-Time Setup)

> **Consent Reminder:** Yeh one-time setup apne dost ke saamne aur unki permission se hi karein. Isme total ~15–20 minute lagenge.

---

## Step 1: Check Virtualization Status

1. Dost ke laptop par `Ctrl + Shift + Esc` daba kar **Task Manager** kholein.
2. **Performance** tab -> **CPU** par click karein.
3. Neeche right side me check karein: **`Virtualization: Enabled`** likha hona chahiye (Windows 11 laptops me yeh 99% pehle se On hota hai).

---

## Step 2: Enable Hyper-V on Windows 11 Pro

1. Start Menu par right-click karein -> **Terminal (Admin)** ya **PowerShell (Run as Administrator)** kholein.
2. Yeh command paste karke Enter dabayein:

```powershell
Enable-WindowsOptionalFeature -Online -FeatureName Microsoft-Hyper-V -All
```

3. Jab pooche `Do you want to restart the computer now? (Y/N)`, toh **`Y`** daba kar laptop ek baar restart kar lein.

---

## Step 3: Download Guest OS ISO

Faisla karein ki aapko VM ke andar kaunsa OS chahiye:
- **Recommended (Fast & Light):** **Ubuntu 24.04 LTS Desktop** ya **Linux Mint XFCE** (~2.5 GB RAM me makkhan chalta hai).
- **Windows Inside VM:** **Windows 10 Pro / IoT LTSC** ya **Windows 11 Pro** (~4 GB RAM chahiye hoga).

ISO file download karke ek clean folder me rakh lein, jaise `C:\HyperV\ISO\`.

---

## Step 4: Create Resource-Capped Auto-Start VM (Script ya GUI)

### Method 1: Automated PowerShell Script (Recommended — Zero Mistake)
Is repo me diya gaya [`scripts/host-setup-hyperv.ps1`](../scripts/host-setup-hyperv.ps1) Admin PowerShell me run karein:

```powershell
# Agar Guest OS Ubuntu/Linux hai:
.\scripts\host-setup-hyperv.ps1 -VMName "RemoteWorkVM" -GuestType "Linux" -IsoPath "C:\HyperV\ISO\ubuntu-24.04-desktop-amd64.iso"

# Agar Guest OS Windows 10/11 hai:
.\scripts\host-setup-hyperv.ps1 -VMName "RemoteWorkVM" -GuestType "Windows" -IsoPath "C:\HyperV\ISO\Win11.iso"
```

### Method 2: Manual Setup via Hyper-V Manager (GUI)
Agar aap manually banana chahte hain:
1. Start Menu se **Hyper-V Manager** kholein -> Right side me **New -> Virtual Machine** click karein.
2. **Name:** `RemoteWorkVM` | Location: `C:\HyperV\VMs\`
3. **Generation:** **Generation 2** select karein.
4. **Assign Memory:** `3072 MB` (Linux ke liye) ya `4096 MB` (Windows ke liye) aur **"Use Dynamic Memory"** pe tick lagayein.
5. **Configure Networking:** Connection dropdown me **`Default Switch`** select karein *(Yeh bahut zaroori hai Wi-Fi NAT ke liye!)*.
6. **Connect Virtual Hard Disk:** Size `50 GB` rakhein (yeh Dynamically Expanding hota hai, shuru me sirf 8–12 GB space lega).
7. **Installation Options:** Apni downloaded `.iso` file select karein aur **Finish** click karein.

#### ⚠️ Important VM Settings (Finish ke baad VM par Right-Click -> Settings me jayein):
1. **Security (Bahut Zaroori!):**
   - Agar **Ubuntu / Linux** install kar rahe ho: **Secure Boot** template ko badal kar **`Microsoft UEFI Certificate Authority`** kar dein (warna Linux boot nahi hoga!).
   - Agar **Windows 11** install kar rahe ho: `Enable Trusted Platform Module (TPM)` par tick laga dein.
2. **Memory:** Minimum RAM `1536 MB`, Maximum RAM **`4096 MB`** set karein (taaki dost ke 16GB me se 12GB hamesha free rahe).
3. **Processor:** `2` Virtual Processors dein aur `+` expand karke **Virtual machine limit (percentage)** ko **`60`** kar dein (isse laptop fan kabhi shor nahi karega).
4. **Automatic Start Action (Management tab ke neeche):**
   - Select karein: **`Always start this virtual machine automatically`**
   - **Startup delay:** `30` seconds daalein (taaki dost ka Windows pehle bina lag ke start ho jaye).
5. **Automatic Stop Action:**
   - Select karein: **`Save the virtual machine state`** (Laptop band hone par VM wahin freeze hokar save ho jayega, kuch data loss nahi hoga).

---

## Step 5: Pehli Baar OS Install Karein

1. Hyper-V Manager me `RemoteWorkVM` par double-click karke **Start** dabayein.
2. Normal tarike se Ubuntu ya Windows install complete karein.
3. OS install hone ke baad Hyper-V Settings -> DVD Drive me se `.iso` hata dein ("None" select karein).
4. Ab **Hyper-V Manager ki window band kar dein!** VM background me chalta rahega — Hyper-V window khuli rakhne ki kabhi zaroorat nahi hoti.

---

## Step 6: Laptop Power & Sleep Settings (Dost ki Permission Se)

Laptop ki ek natural limitation hoti hai: agar laptop **Sleep** mode me chala gaya, toh Wi-Fi aur Hyper-V dono pause ho jayenge.

**Safe Configuration (`Settings -> System -> Power & battery -> Screen and sleep`):**
- **When plugged in (Charger laga ho tab):**
  - *Turn off my screen after:* `5 or 10 minutes` (Dost ki screen normal band ho sakti hai, VM chalta rahega).
  - *Put my device to sleep after:* **`Never`** (Ya `2 hours` — jaisa dost comfortable ho).
- **On battery power (⚠️ SAFETY RULE):**
  - Battery par sleep ko **`15 or 30 minutes`** hi rehne dein! **Kabhi bhi Battery par Sleep "Never" mat karna**, kyunki agar dost ne laptop bag me rakh diya toh andar garmi se laptop overheat ho jayega!

---

## Next Step: Browser Access Setup Karein!

Ab aapka background VM ready hai. Ab inme se koi ek guide follow karke VM ke andar Browser Remote Access lagayein:
- 👉 **[Option A: Chrome Remote Desktop Inside VM (Sabse Simple)](03-option-a-crd-vm.md)**
- 👉 **[Option B: KasmVNC + Cloudflare Tunnel (Custom URL + Ultra Fast)](04-option-b-kasm-cloudflare.md)**
- 👉 **[Option C: Apache Guacamole + Tailscale Funnel (HTML5 RDP)](05-option-c-guacamole-rdp.md)**
