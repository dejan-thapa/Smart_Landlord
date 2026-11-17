# 🤖 Smart Landlord 24/7 WhatsApp Cloud Bot

A lightweight, dedicated 24/7 WhatsApp microservice powered by Baileys (`@whiskeysockets/baileys`). It runs independently in the cloud so you can automatically deliver **Bill Card PNG Images** and **Official eSewa QR Code Images** to your tenants even when your computer is off or Antigravity is closed.

---

## 🚀 1-Click Free Deployment on Render (100% Free Forever)

### Step 1: Create a Free Web Service on Render
1. Go to [render.com](https://render.com) and sign in with your GitHub account.
2. Click **New +** → **Web Service**.
3. Select your repository: `dejan-thapa/Smart_Landlord`.
4. Configure the service:
   - **Name**: `smart-landlord-whatsapp-bot`
   - **Root Directory**: `services/whatsapp-bot`
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`
   - **Instance Type**: **Free** ($0/month)

---

### Step 2: Add Environment Variables on Render
Under **Environment Variables**, add:
* `BOT_API_KEY`: `smart-landlord-secret-key` (or your own secret)
* `PAYMENT_ACCOUNT_HOLDER`: `Dejan Thapa`
* `PAYMENT_BANK_NAME`: `eSewa`
* `PAYMENT_ACCOUNT_NO`: `9842835084`
* *(Optional for immortal session persistence)*:
  * `NEXT_PUBLIC_SUPABASE_URL`: `https://hbrddkfrgfjwsxvjqavw.supabase.co`
  * `SUPABASE_SERVICE_ROLE_KEY`: `(your supabase service role key)`

Click **Deploy Web Service**! Render will build and launch your bot in ~1 minute.
Render will give you a public URL (e.g. `https://smart-landlord-whatsapp-bot.onrender.com`).

---

### Step 3: Link Bot to Smart Landlord on Vercel
1. Go to your [Vercel Dashboard](https://vercel.com) → `smart-landlord-os` → **Settings** → **Environment Variables**.
2. Add:
   - **`WHATSAPP_BOT_URL`**: `https://smart-landlord-whatsapp-bot.onrender.com` (your Render URL)
   - **`BOT_API_KEY`**: `smart-landlord-secret-key`
3. Click **Redeploy** on Vercel (or trigger a new commit).

---

### Step 4: Link Your WhatsApp (One-Time Setup)
1. Open Smart Landlord on your computer or phone.
2. Open any unpaid invoice and tap **WhatsApp**.
3. The modal will stream the live QR code from your cloud bot.
4. On your phone: Open **WhatsApp** → **Settings** → **Linked Devices** → **Link a Device** → Scan the QR code on screen.
5. The modal will turn green: **"✓ WhatsApp Connected (9842835084)"**.

From now on, whenever you tap **Send Bill** on your mobile PWA, the cloud bot automatically delivers:
1. **Message 1**: The visual Bill Card PNG image with breakdown & total.
2. **Message 2**: The high-resolution standalone **eSewa QR Code image** with payment instructions!
