# 03 — Option A: Hyper-V VM + Chrome Remote Desktop (Inside Guest VM)

> ⭐ **Sabse Aasaan Zero-Config Method:** Koi domain kharidne ki zaroorat nahi, koi router port forward nahi, koi IP yaad rakhne ki zaroorat nahi!

Aapne bilkul sahi pakda tha ki *Chrome Remote Desktop* agar dost ke main Windows par daalo toh woh dost ka system control karta hai. Lekin jab aap **Hyper-V Guest VM ke andar** apna Google account login karke Chrome Remote Desktop set karte ho (aur dost ke main Windows par kuch nahi daalte), toh `https://remoting.google.com/access` kholne par aapko **sirf apne isolated VM ka access** milta hai!

---

## Case 1: Agar VM ke Andar **Windows 10 / 11** Hai

### Step 1: Basic Session Mode Use Karein (One-Time Tip)
Jab aap pehli baar Hyper-V Manager se VM kholte ho:
1. Agar "Connect to RemoteWorkVM" resolution popup aaye, toh usse **Close (X)** kar dein taaki VM **Basic Session** me khule (View menu me *Enhanced Session* untick hona chahiye).
   - *Kyun?* Enhanced Session asal me RDP hota hai; Basic Session virtual monitor (`Microsoft Hyper-V Video`) use karta hai jiske saath Chrome Remote Desktop makkhan ki tarah kaam karta hai.

### Step 2: VM ke Andar Chrome Remote Desktop Install Karein
1. **VM ke andar** Edge kholkar **Google Chrome** download aur install karein.
2. Chrome me **APNI Google ID** (dost ki nahi!) login karein.
3. VM ke Chrome me yeh URL kholein:
   ```text
   https://remoting.google.com/access
   ```
4. **"Set up remote access"** ke neeche Download button dabayein -> `.msi` installer run karein.
5. Wapas browser me VM ka naam rakhein (jaise `My-Cloud-VM`) -> **Next** -> ek strong **6+ digit PIN** set karein.

### Step 3: Verify Auto-Start Service Inside VM
VM ke andar `Win + R` dabayein -> `services.msc` likhein aur check karein:
- **`Chrome Remote Desktop Service`** -> Status: `Running` | Startup Type: **`Automatic`**.
- Iska fayda: Agar VM kabhi pura restart bhi ho jaye aur Windows Lock Screen par ruka ho, tab bhi yeh service boot hote hi chalu ho jaati hai! Aap browser se connect karke Lock Screen unlock kar sakte ho.

### Step 4: Done! Window Band Kar Dein
1. Dost ke laptop par Hyper-V VM ki window (`vmconnect`) band kar dein (Shut down mat karna, bas `X` daba kar window close kar dein — VM background me chalta rahega!).
2. Ab apne phone ya apne ghar ke PC ke kisi bhi browser me jayein:
   👉 **`https://remoting.google.com/access`**
3. Apni Google ID se login karein -> `My-Cloud-VM` **Online** dikhega -> Click karein -> PIN daalein -> Full Windows VM aapke browser me! 🎉

---

## Case 2: Agar VM ke Andar **Ubuntu 24.04 LTS (Linux)** Hai *(Fastest & Lightest!)*

Linux VM sirf **2GB–3GB RAM** me super fast chalta hai. Ubuntu me default GNOME Wayland ki jagah lightweight **XFCE Desktop** ke saath Chrome Remote Desktop lagana sabse reliable tarika hai:

### Step 1: VM ke Terminal me XFCE + Chrome Remote Desktop Install Karein
Ubuntu VM kholkar Terminal me yeh commands copy-paste karein:

```bash
sudo apt update && sudo apt upgrade -y

# Lightweight XFCE desktop aur browser install karein
sudo apt install -y xfce4 xfce4-goodies dbus-x11 wget curl

# Google Chrome + Chrome Remote Desktop package download & install karein
wget https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb
sudo apt install -y ./google-chrome-stable_current_amd64.deb

wget https://dl.google.com/linux/direct/chrome-remote-desktop_current_amd64.deb
sudo apt install -y ./chrome-remote-desktop_current_amd64.deb

# CRD ko XFCE session use karne ke liye set karein
echo "exec /etc/X11/Xsession /usr/bin/xfce4-session" > ~/.chrome-remote-desktop-session
```

### Step 2: Headless Auth Command se Link Karein
1. **Apne khud ke laptop/PC** (ya VM ke Chrome) me apni Google ID se yeh page kholein:
   👉 **`https://remoting.google.com/headless`**
2. **Begin** -> **Next** -> **Authorize** par click karein.
3. **"Debian Linux"** wala command copy karein (woh kuch aisa dikhega: `DISPLAY= /opt/google/chrome-remote-desktop/start-host --code="4/0A..." ...`).
4. Woh command **Ubuntu VM ke terminal** me paste karke Enter dabayein aur apna **6-digit PIN** set karein.

### Step 3: Auto-Start at Boot Enable Karein
```bash
sudo systemctl enable chrome-remote-desktop@$USER.service
sudo loginctl enable-linger $USER
```

Ab Hyper-V window band kar dein! Jab bhi dost laptop on karega aur Wi-Fi judega, 1 minute ke andar `https://remoting.google.com/access` par aapka Linux Desktop **Online** aa jayega!

---

## 💡 Bonus: Wi-Fi Drop Auto-Recovery Lagayein
Kabhi-kabhi agar dost ka Wi-Fi 10 minute band hokar wapas aata hai, toh instant reconnect ke liye [`scripts/guest-watchdog.sh`](../scripts/guest-watchdog.sh) ko VM ke andar enable kar lein (Guide [`docs/06-troubleshooting-faq.md`](06-troubleshooting-faq.md) me diya hai).
