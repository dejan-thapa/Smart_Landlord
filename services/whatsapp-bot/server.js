const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const fsPromises = require("fs/promises");
const pino = require("pino");
const QRCode = require("qrcode");
const {
  default: makeWASocket,
  Browsers,
  DisconnectReason,
  fetchLatestBaileysVersion,
  useMultiFileAuthState,
} = require("@whiskeysockets/baileys");
const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 4000;
const BOT_API_KEY = process.env.BOT_API_KEY || "smart-landlord-secret-key";
const AUTH_DIR = process.env.AUTH_DIR || path.join(__dirname, ".whatsapp-auth");
const QR_IMAGE_PATH = path.join(__dirname, "payment-qr-only.png");

// Optional Supabase sync for immortal session persistence on ephemeral containers
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;
let wsTransport;
if (typeof globalThis.WebSocket === "undefined") {
  try {
    wsTransport = require("ws");
  } catch {}
}
const supabase = (supabaseUrl && supabaseKey)
  ? createClient(supabaseUrl, supabaseKey, {
      ...(wsTransport ? { realtime: { transport: wsTransport } } : {}),
    })
  : null;

app.use(cors());
app.use(express.json({ limit: "50mb" }));

// State
let waState = {
  status: "disconnected", // "disconnected" | "connecting" | "qr_ready" | "connected"
  qrDataUrl: null,
  userPhone: null,
  lastError: null,
  sock: null,
  initPromise: null,
  isLoggingOut: false,
};

function normalizePhoneNumber(rawPhone) {
  if (!rawPhone) return "";
  const cleaned = String(rawPhone).replace(/[^\d+]/g, "").replace(/^\+/, "");
  if (!cleaned) return "";
  if (cleaned.length === 10 && (cleaned.startsWith("98") || cleaned.startsWith("97"))) {
    return `977${cleaned}`;
  }
  return cleaned;
}

// Restore all session files from Supabase if local auth is empty
async function restoreSessionFromSupabase() {
  if (!supabase) return;
  try {
    const { data, error } = await supabase.from("whatsapp_sessions").select("id, data");
    if (error || !data || data.length === 0) return;

    await fsPromises.mkdir(AUTH_DIR, { recursive: true });
    for (const row of data) {
      const safeName = path.basename(row.id);
      if (!safeName) continue;
      const filePath = path.join(AUTH_DIR, safeName);
      await fsPromises.writeFile(filePath, row.data, "utf8");
    }
    console.log(`[WhatsApp Bot] Restored ${data.length} session files from Supabase.`);
  } catch (err) {
    console.warn("[WhatsApp Bot] Could not restore session from Supabase:", err.message);
  }
}

let syncTimer = null;

// Sync all auth files (creds.json + Signal encryption keys) to Supabase
async function syncAllSessionFilesToSupabase() {
  if (!supabase) return;
  try {
    if (!fs.existsSync(AUTH_DIR)) return;
    const files = await fsPromises.readdir(AUTH_DIR);
    const jsonFiles = files.filter((f) => f.endsWith(".json"));
    if (jsonFiles.length === 0) return;

    const now = new Date().toISOString();
    const rows = [];
    for (const fileName of jsonFiles) {
      try {
        const content = await fsPromises.readFile(path.join(AUTH_DIR, fileName), "utf8");
        rows.push({ id: fileName, data: content, updated_at: now });
      } catch {}
    }

    if (rows.length > 0) {
      const { error } = await supabase.from("whatsapp_sessions").upsert(rows);
      if (error) {
        console.warn("[WhatsApp Bot] Supabase session sync warning:", error.message);
      }
    }
  } catch (err) {
    console.warn("[WhatsApp Bot] Could not sync session files to Supabase:", err.message);
  }
}

function scheduleSessionSync(delayMs = 1500) {
  if (!supabase) return;
  if (syncTimer) clearTimeout(syncTimer);
  syncTimer = setTimeout(() => {
    syncTimer = null;
    syncAllSessionFilesToSupabase().catch(() => {});
  }, delayMs);
}

async function clearStoredSession() {
  try {
    await fsPromises.rm(AUTH_DIR, { recursive: true, force: true });
  } catch {}
  if (supabase) {
    try {
      await supabase.from("whatsapp_sessions").delete().neq("id", "");
    } catch {}
  }
}

async function initWhatsApp() {
  if (waState.status === "connected" && waState.sock) return;
  if (waState.initPromise) return waState.initPromise;

  waState.initPromise = (async () => {
    try {
      waState.isLoggingOut = false;
      waState.status = "connecting";
      waState.lastError = null;

      await fsPromises.mkdir(AUTH_DIR, { recursive: true });
      const files = await fsPromises.readdir(AUTH_DIR);
      if (files.length === 0) {
        await restoreSessionFromSupabase();
      }

      const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);

      let version;
      try {
        const latest = await fetchLatestBaileysVersion();
        version = latest.version;
      } catch {}

      const sock = makeWASocket({
        ...(version ? { version } : {}),
        auth: state,
        logger: pino({ level: "silent" }),
        browser: Browsers.appropriate("Smart Landlord Cloud Bot"),
        printQRInTerminal: false,
        syncFullHistory: false,
        markOnlineOnConnect: false,
      });

      waState.sock = sock;

      sock.ev.on("creds.update", async () => {
        await saveCreds();
        scheduleSessionSync(1000);
      });

      sock.ev.on("connection.update", async (update) => {
        if (waState.sock !== sock) return;

        const { connection, lastDisconnect, qr } = update;

        if (qr) {
          try {
            waState.qrDataUrl = await QRCode.toDataURL(qr, { margin: 2, width: 280 });
            waState.status = "qr_ready";
            waState.lastError = null;
          } catch (err) {
            waState.lastError = err.message || "Failed to render QR code.";
          }
        }

        if (connection === "open") {
          waState.status = "connected";
          waState.qrDataUrl = null;
          waState.userPhone = sock.user?.id?.split(":")[0] || null;
          waState.lastError = null;
          console.log(`[WhatsApp Bot] Connected successfully as ${waState.userPhone}`);
          syncAllSessionFilesToSupabase().catch(() => {});
        }

        if (connection === "close") {
          const statusCode = lastDisconnect?.error?.output?.statusCode;
          const isLoggedOut = statusCode === DisconnectReason.loggedOut || statusCode === 401;
          const shouldReconnect = !waState.isLoggingOut && !isLoggedOut;

          console.log(
            `[WhatsApp Bot] Connection closed (status: ${statusCode}). Reconnect: ${shouldReconnect}`
          );

          waState.sock = null;
          waState.qrDataUrl = null;
          waState.userPhone = null;

          if (shouldReconnect) {
            waState.status = "connecting";
            waState.initPromise = null;
            setTimeout(() => {
              initWhatsApp().catch(() => {});
            }, 3000);
          } else {
            await clearStoredSession();
            waState.status = "disconnected";
            waState.lastError = "Logged out from WhatsApp. Scan QR code again.";
            waState.initPromise = null;
            if (!waState.isLoggingOut) {
              setTimeout(() => {
                initWhatsApp().catch(() => {});
              }, 2000);
            }
          }
        }
      });
    } catch (err) {
      waState.status = "disconnected";
      waState.lastError = err.message || "Failed to initialize WhatsApp.";
      waState.sock = null;
      waState.initPromise = null;
    }
  })();

  return waState.initPromise;
}

// Auto-start on boot
initWhatsApp().catch((err) => {
  console.error("[WhatsApp Bot] Boot initialization error:", err.message);
});

// Auth middleware for API routes
function requireAuth(req, res, next) {
  if (!BOT_API_KEY) return next();
  const incomingKey = req.headers["x-api-key"] || req.query.api_key;
  if (incomingKey && incomingKey === BOT_API_KEY) {
    return next();
  }
  return res.status(401).json({ success: false, error: "Unauthorized: Invalid BOT_API_KEY." });
}

// --- Routes ---

// Health check (used by free pingers like UptimeRobot / Cron-job.org to prevent sleep)
app.get("/", (req, res) => {
  res.json({
    ok: true,
    name: "Smart Landlord WhatsApp Bot (24/7 Cloud Service)",
    status: waState.status,
    userPhone: waState.userPhone,
    timestamp: new Date().toISOString(),
  });
});

// Status check for UI
app.get("/api/status", async (req, res) => {
  if (waState.status === "disconnected" && !waState.initPromise) {
    initWhatsApp().catch(() => {});
  }
  res.json({
    status: waState.status,
    qrDataUrl: waState.qrDataUrl,
    userPhone: waState.userPhone,
    lastError: waState.lastError,
  });
});

// Send bill image + companion eSewa QR
app.post("/api/send", requireAuth, async (req, res) => {
  const { phone, imageBase64, caption, sendCompanionQr = true, amount } = req.body || {};

  if (!phone || !imageBase64) {
    return res.status(400).json({ success: false, error: "Phone number and imageBase64 are required." });
  }

  const normalized = normalizePhoneNumber(phone);
  if (!normalized) {
    return res.status(400).json({ success: false, error: "Invalid phone number." });
  }

  if (waState.status !== "connected" || !waState.sock) {
    if (waState.status === "disconnected" && !waState.initPromise) {
      initWhatsApp().catch(() => {});
    }
    return res.json({ success: false, needsAuth: true, error: "WhatsApp is not connected. Scan QR code." });
  }

  try {
    let targetJid = `${normalized}@s.whatsapp.net`;
    try {
      const results = await waState.sock.onWhatsApp(normalized);
      const match = results?.[0];
      if (match && !match.exists) {
        return res.status(400).json({
          success: false,
          error: `The number ${phone} is not registered on WhatsApp.`,
        });
      }
      if (match?.jid) {
        targetJid = match.jid;
      }
    } catch {}

    // 1. Send Message 1: The Visual Bill Card PNG Image with Breakdown & Statement
    const billBuffer = Buffer.from(imageBase64, "base64");
    await waState.sock.sendMessage(targetJid, {
      image: billBuffer,
      caption: caption || "",
    });

    // 2. Send Message 2: Standalone Full-Resolution eSewa QR Code Image with Payment Details
    if (sendCompanionQr) {
      try {
        let qrBuffer = null;
        if (fs.existsSync(QR_IMAGE_PATH)) {
          qrBuffer = await fsPromises.readFile(QR_IMAGE_PATH);
        }

        if (qrBuffer) {
          // Pause 750ms so bill card arrives first, followed immediately by the QR code
          await new Promise((r) => setTimeout(r, 750));

          const bankName = process.env.PAYMENT_BANK_NAME || "eSewa";
          const accountHolder = process.env.PAYMENT_ACCOUNT_HOLDER || "Dejan Thapa";
          const accountNo = process.env.PAYMENT_ACCOUNT_NO || "9842835084";

          const qrCaption =
            amount && Number(amount) > 0
              ? `📲 *Official Payment QR Code (${bankName})*\n` +
                `Scan or save this QR code to upload into your eSewa app to settle *Rs. ${Number(amount).toLocaleString()}*.\n\n` +
                `*Payment Details:*\n` +
                `• Account Name: *${accountHolder}*\n` +
                `• eSewa ID / Number: \`${accountNo}\`\n\n` +
                `Please reply with the payment confirmation screenshot once transferred. Thank you!`
              : `📲 *Official Payment QR Code (${bankName})*\n` +
                `Scan or save this QR code to upload into your eSewa app.\n\n` +
                `*Payment Details:*\n` +
                `• Account Name: *${accountHolder}*\n` +
                `• eSewa ID / Number: \`${accountNo}\`\n\n` +
                `Please reply with the payment confirmation screenshot once transferred. Thank you!`;

          await waState.sock.sendMessage(targetJid, {
            image: qrBuffer,
            caption: qrCaption,
          });
        }
      } catch (qrErr) {
        console.warn("[WhatsApp Bot] Could not send companion QR image:", qrErr.message);
      }
    }

    scheduleSessionSync(1500);
    return res.json({ success: true });
  } catch (err) {
    console.error("[WhatsApp Bot] Error sending message:", err);
    return res.status(500).json({ success: false, error: err.message || "Failed to send WhatsApp message." });
  }
});

// Logout
app.post("/api/logout", requireAuth, async (req, res) => {
  try {
    waState.isLoggingOut = true;
    if (waState.sock) {
      try {
        await waState.sock.logout();
      } catch {}
      waState.sock.end(undefined);
      waState.sock = null;
    }

    await clearStoredSession();

    waState.status = "disconnected";
    waState.qrDataUrl = null;
    waState.userPhone = null;
    waState.initPromise = null;

    setTimeout(() => {
      initWhatsApp().catch(() => {});
    }, 1500);

    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`[WhatsApp Bot] Server listening on port ${PORT}`);
});
