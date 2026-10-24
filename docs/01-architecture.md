# 01 — System Architecture & How It Works

Yeh document explain karta hai ki **1 km (ya kisi bhi distance) door rakhe Wi-Fi laptop** par bina router chhede aur bina host desktop disturb kiye browser-based VM kaise kaam karta hai.

---

## 1. Windows 11 Pro ka Sabse Bada Plus Point: Native Hyper-V

Aapke dost ke laptop me **Windows 11 Pro** hai — yeh sabse bada advantage hai kyunki isme **Microsoft Hyper-V** pehle se built-in aata hai (free, official Microsoft feature).

### VirtualBox / VMware Workstation vs Hyper-V:
| Feature | VirtualBox / VMware Player | **Microsoft Hyper-V (Win 11 Pro)** |
| :--- | :--- | :--- |
| **Type** | Type-2 (App ki tarah chalta hai) | **Type-1 Bare-Metal Hypervisor** |
| **Auto-Start on Boot** | Mushkil (User login aur taskbar window chahiye) | **Native Windows Service (`vmms`) — Boot hote hi start!** |
| **Headless Mode** | Aksar taskbar me icon/window aati hai | **100% Headless Service (Zero UI windows on desktop)** |
| **Dynamic Memory** | Fixed RAM block kar leta hai | **Dynamic RAM (Jitni zaroorat utni hi RAM use karega)** |
| **Auto Save on Shutdown**| VM crash ho sakta hai agar PC band ho | **Graceful State Save — Wahin se resume hoga!** |

---

## 2. Wi-Fi + CGNAT Problem aur Uska Solution

Jab dost ka laptop ghar ke Wi-Fi ya mobile hotspot se connect hota hai, toh 2 challenges aate hain:
1. **CGNAT / Dynamic IP:** India me JioFiber, Airtel, aur mobile networks par aapko public IP nahi milti, isliye router me **Port Forwarding kaam nahi karti**.
2. **Wi-Fi Bridging Issue:** Laptop ke Wi-Fi card par Hyper-V ka "External Switch" (Bridge) banane se dost ka Wi-Fi bar-bar disconnect ho sakta hai.

### Solution: `Default Switch` (WinNAT) + Outbound Tunnel Inside VM
1. **Hyper-V `Default Switch`:** Windows 11 Hyper-V me ek built-in virtual switch hota hai jiska naam hai **`Default Switch`**. Dost chahe Ghar ka Wi-Fi lagaye, Hostel Wi-Fi lagaye, ya Phone Hotspot — Windows automatic apne internet ko NAT ke through VM ke andar bhej deta hai!
2. **Outbound Connection:** VM ke andar chalne wala agent (`chromoting` / `cloudflared` / `tailscaled`) andar se bahar (`Outbound Port 443 HTTPS/WebRTC`) connect karta hai. Isliye:
   - Router login ki zaroorat **NAHI** hai.
   - Static IP ki zaroorat **NAHI** hai.
   - Host Windows Firewall me inbound ports kholne ki zaroorat **NAHI** hai.

---

## 3. Boot-to-Browser Lifecycle (Jab Dost Laptop On Karega Toh Kya Hoga?)

```text
[00:00 sec] Dost ne Laptop ka Power Button dabaya
     |
[00:12 sec] Windows 11 Pro Boot hua -> Dost apna kaam shuru kar sakta hai
     |      (30-second Auto-Start Delay rakha hai taaki boot time pe SSD slow na ho)
     |
[00:42 sec] Hyper-V Service (`vmms`) background me Guest VM ko Resume/Boot karti hai
     |      (Dost ke desktop par koi window nahi aati)
     |
[00:55 sec] Dost ka Laptop Wi-Fi se connect hota hai -> `Default Switch` VM ko internet deta hai
     |
[01:05 sec] Guest VM ke andar ka Tunnel Service (CRD / Cloudflared / Tailscale)
     |      auto-start hota hai aur Cloud Relay se jud jaata hai
     |
[01:10 sec] AAP APNE GHAR PE BROWSER KHOLTE HO -> VM "ONLINE" DIKHTA HAI -> CLICK & USE!
```

Aur jab dost apna laptop **Shut Down** karega:
- Hyper-V automatically VM ki current state (khule huye apps ke saath!) disk par **Save** kar dega (`AutomaticStopAction = Save`).
- Agli baar laptop on hone par VM wahin se wapas chalu ho jayega!

---

## 4. Security & Isolation Guarantee

- **Host -> Guest Isolation:** Aap VM ke andar kuch bhi install karo, browser chalao, code compile karo — woh sab ek single `.vhdx` virtual hard disk file ke andar band rehta hai. Dost ke `C:\Users\...` personal folders VM ko bilkul accessible nahi hote (jab tak koi manually share na kare).
- **Encrypted Traffic:** Browser se VM tak sara display/keyboard stream **TLS 1.3 / WebRTC DTLS-SRTP** encrypted hota hai.
