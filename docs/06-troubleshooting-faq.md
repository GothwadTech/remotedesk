# 06 — Real-World Troubleshooting, Auto-Recovery & Best Practices

Jab server ek dost ka daily-use Wi-Fi laptop ho, toh real life me kuch practical situations aati hain. Un sabka ready-made solution yahan hai:

---

## 1. Screen Resolution Fix (`1024x768` se `1920x1080` Full HD Kaise Karein?)

Kabhi-kabhi headless Hyper-V VM me default resolution `1024x768` lock dikhta hai. Isse 1080p Full HD karne ke liye **Dost ke Windows 11 Host PowerShell (Admin)** me ek baar yeh command chala dein:

```powershell
Set-VMVideo -VMName "RemoteWorkVM" -HorizontalResolution 1920 -VerticalResolution 1080 -ResolutionType Single
```
*(KasmVNC / Option B aur Chrome Remote Desktop Resize-to-Fit me browser window ke hisaab se resolution apne aap dynamic adjust ho jaata hai!)*

---

## 2. Wi-Fi Disconnect / Hotspot Switch Auto-Recovery

Agar dost ka router light jaane ki wajah se 10 minute band rahe aur phir wapas on ho, toh 99% time `cloudflared`, `tailscaled`, aur `chrome-remote-desktop` khud reconnect kar lete hain.

Lekin **100% Bulletproof Guarantee** ke liye Ubuntu Guest VM ke andar hamara watchdog script lagayein:

```bash
chmod +x scripts/guest-watchdog.sh
sudo cp scripts/guest-watchdog.sh /usr/local/bin/vm-watchdog.sh

# Har 2 minute me internet + tunnel health check karne ke liye cron job lagayein:
(crontab -l 2>/dev/null; echo "*/2 * * * * /usr/local/bin/vm-watchdog.sh >> /var/log/vm-watchdog.log 2>&1") | crontab -
```

---

## 3. Dost Heavy Gaming Kare Toh Kya? (Give Friend a Pause/Resume Button!)

Dost ke paas 16GB RAM hai. Normal coding, YouTube, MS Office, Chrome me `4GB` VM se unhe **zero farq** padega. Lekin agar dost kabhi heavy AAA game khele aur unhe poora CPU/RAM chahiye ho, toh unke Desktop par 2 chhote shortcuts bana kar de dein (isse dost ka bharosa bhi rahega aur unhe kabhi dikkat nahi aayegi):

- **Pause VM (Instant Freeze, Frees CPU):**
  ```powershell
  powershell -Command "Start-Process powershell -Verb runAs -ArgumentList 'Suspend-VM -Name RemoteWorkVM'"
  ```
- **Resume VM:**
  ```powershell
  powershell -Command "Start-Process powershell -Verb runAs -ArgumentList 'Resume-VM -Name RemoteWorkVM'"
  ```

---

## 4. Laptop Lid Close (Screen Band Karne Par Kya Hoga?)

Default Windows 11 laptop me jab koi **Lid band (screen fold)** karta hai, toh laptop **Sleep** me chala jaata hai aur Wi-Fi band ho jaata hai.
- **Safe Rule:** Agar dost table par charger laga kar lid band karke rakhte hain, toh sirf **`Plugged in -> Closing the lid -> Do nothing`** set kar sakte hain (Control Panel -> Power Options -> Choose what closing the lid does).
- **⚠️ Kabhi Mat Karna:** **`On battery -> Closing the lid`** ko hamesha **`Sleep`** par hi rakhein! Warna bag ke andar laptop garm hokar kharab ho sakta hai.

---

## 5. 512GB SSD Space Bachane ka Tarika

Hyper-V ka **Dynamically Expanding `.vhdx`** jab VM ke andar files banti hain toh badhta hai, par files delete karne par apne-aap chhota nahi hota. Mahine me ek baar (jab VM shutdown ho) aap space wapas shrink kar sakte ho:

```powershell
# Host Admin PowerShell me (VM band hone par):
Optimize-VHD -Path "C:\HyperV\VMs\RemoteWorkVM\Virtual Hard Disks\RemoteWorkVM.vhdx" -Mode Full
```

---

## 6. Security Checklist ✅

- [ ] Dost ki explicit permission li gayi hai.
- [ ] Guest VM ke andar strong password laga hai.
- [ ] Browser gateway par **2FA / OTP** on hai (Google Account 2FA for CRD / Cloudflare Access Email OTP / Tailscale Auth).
- [ ] Host PC par koi bhi inbound router port open **nahi** kiya gaya hai.
- [ ] VM ki Maximum RAM `4096 MB` aur CPU limit `60%` par capped hai.
