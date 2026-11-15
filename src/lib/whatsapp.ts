import path from "path";
import fs from "fs/promises";
import makeWASocket, {
  Browsers,
  DisconnectReason,
  fetchLatestBaileysVersion,
  useMultiFileAuthState,
  type WASocket,
  type WAVersion,
} from "@whiskeysockets/baileys";
import type { ILogger } from "@whiskeysockets/baileys/lib/Utils/logger.js";
import QRCode from "qrcode";
import pino from "pino";
import { normalizePhoneNumber } from "@/lib/reminder-utils";

export type WhatsAppConnectionStatus =
  | "disconnected"
  | "connecting"
  | "qr_ready"
  | "connected";

export interface WhatsAppStateSnapshot {
  status: WhatsAppConnectionStatus;
  qrDataUrl: string | null;
  userPhone: string | null;
  lastError: string | null;
}

interface WhatsAppGlobalState extends WhatsAppStateSnapshot {
  sock: WASocket | null;
  initPromise: Promise<void> | null;
  isLoggingOut: boolean;
}

declare global {
  var __waState: WhatsAppGlobalState | undefined;
}

const AUTH_DIR = path.join(process.cwd(), ".whatsapp-auth");

function getWAState(): WhatsAppGlobalState {
  if (!globalThis.__waState) {
    globalThis.__waState = {
      status: "disconnected",
      qrDataUrl: null,
      userPhone: null,
      lastError: null,
      sock: null,
      initPromise: null,
      isLoggingOut: false,
    };
  }
  return globalThis.__waState;
}

export async function initWhatsApp(): Promise<void> {
  const wa = getWAState();

  if (wa.status === "connected" && wa.sock) return;
  if (wa.initPromise) return wa.initPromise;

  wa.initPromise = (async () => {
    try {
      wa.isLoggingOut = false;
      wa.status = "connecting";
      wa.lastError = null;

      await fs.mkdir(AUTH_DIR, { recursive: true });
      const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);

      let version: WAVersion | undefined;
      try {
        const latest = await fetchLatestBaileysVersion();
        version = latest.version;
      } catch {
        // Fall back to Baileys built-in version if offline
      }

      const sock = makeWASocket({
        ...(version ? { version } : {}),
        auth: state,
        logger: pino({ level: "silent" }) as unknown as ILogger,
        browser: Browsers.appropriate("Smart Landlord OS"),
        printQRInTerminal: false,
        syncFullHistory: false,
        markOnlineOnConnect: false,
      });

      wa.sock = sock;

      sock.ev.on("creds.update", saveCreds);

      sock.ev.on("connection.update", async (update) => {
        if (wa.sock !== sock) return;

        const { connection, lastDisconnect, qr } = update;

        if (qr) {
          try {
            wa.qrDataUrl = await QRCode.toDataURL(qr, { margin: 2, width: 280 });
            wa.status = "qr_ready";
            wa.lastError = null;
          } catch (err) {
            wa.lastError =
              err instanceof Error ? err.message : "Failed to render QR code.";
          }
        }

        if (connection === "open") {
          wa.status = "connected";
          wa.qrDataUrl = null;
          wa.userPhone = sock.user?.id?.split(":")[0] || null;
          wa.lastError = null;
        }

        if (connection === "close") {
          const statusCode = (
            lastDisconnect?.error as
              | { output?: { statusCode?: number } }
              | undefined
          )?.output?.statusCode;

          wa.sock = null;
          wa.qrDataUrl = null;

          if (wa.isLoggingOut || statusCode === DisconnectReason.loggedOut) {
            await fs.rm(AUTH_DIR, { recursive: true, force: true }).catch(() => {});
            wa.status = "disconnected";
            wa.userPhone = null;
            wa.lastError = wa.isLoggingOut
              ? null
              : "WhatsApp logged out. Please scan the QR code again.";
            wa.isLoggingOut = false;
          } else {
            wa.status = "disconnected";
            wa.lastError = lastDisconnect?.error?.message || null;
            // Reconnect automatically (including DisconnectReason.restartRequired after QR pairing)
            const delayMs =
              statusCode === DisconnectReason.restartRequired ? 400 : 1500;
            setTimeout(() => {
              initWhatsApp().catch(() => {});
            }, delayMs);
          }
        }
      });
    } catch (err) {
      wa.status = "disconnected";
      wa.sock = null;
      wa.lastError =
        err instanceof Error ? err.message : "Failed to initialize WhatsApp client.";
    } finally {
      wa.initPromise = null;
    }
  })();

  return wa.initPromise;
}

export async function getWhatsAppStatus(): Promise<WhatsAppStateSnapshot> {
  const wa = getWAState();

  if (wa.status === "disconnected" && !wa.initPromise) {
    initWhatsApp().catch(() => {});
  }

  // Wait up to 1.5s while connecting so QR code or open session is ready on first poll
  const deadline = Date.now() + 1500;
  while (wa.status === "connecting" && Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 100));
  }

  return {
    status: wa.status,
    qrDataUrl: wa.qrDataUrl,
    userPhone: wa.userPhone,
    lastError: wa.lastError,
  };
}

export async function sendWhatsAppBillImage({
  phone,
  imageBase64,
  caption,
  sendCompanionQr = true,
  amount,
}: {
  phone: string;
  imageBase64: string;
  caption?: string;
  sendCompanionQr?: boolean;
  amount?: number;
}): Promise<{ success: boolean; needsAuth?: boolean; error?: string }> {
  const wa = getWAState();

  const normalized = normalizePhoneNumber(phone);
  if (!normalized) {
    return { success: false, error: "Invalid phone number." };
  }

  if (wa.status !== "connected" || !wa.sock) {
    if (wa.status === "disconnected" && !wa.initPromise) {
      initWhatsApp().catch(() => {});
    }
    return { success: false, needsAuth: true };
  }

  try {
    let targetJid = `${normalized}@s.whatsapp.net`;
    try {
      const results = await wa.sock.onWhatsApp(normalized);
      const match = results?.[0];
      if (match && !match.exists) {
        return {
          success: false,
          error: `The number ${phone} is not registered on WhatsApp.`,
        };
      }
      if (match?.jid) {
        targetJid = match.jid;
      }
    } catch {
      // Fallback to ${normalized}@s.whatsapp.net if lookup fails transiently
    }

    const buffer = Buffer.from(imageBase64, "base64");
    await wa.sock.sendMessage(targetJid, {
      image: buffer,
      caption: caption || "",
    });

    // Option 1 Companion: Send standalone QR code as a second full-resolution image
    if (sendCompanionQr) {
      try {
        const qrPath = path.join(process.cwd(), "public", "payment-qr-only.png");
        const qrBuffer = await fs.readFile(qrPath).catch(() => null);
        if (qrBuffer) {
          // Pause 700ms so the bill image arrives first, followed by the QR code
          await new Promise((r) => setTimeout(r, 700));
          const bankName = process.env.PAYMENT_BANK_NAME || "eSewa";
          const accountHolder = process.env.PAYMENT_ACCOUNT_HOLDER || "Dejan Thapa";
          const accountNo = process.env.PAYMENT_ACCOUNT_NO || "9842835084";

          const qrCaption =
            amount && amount > 0
              ? `📲 *Payment QR Code (eSewa)*\nScan or save this QR code to upload into your eSewa or mobile banking app to settle *Rs. ${Number(amount).toLocaleString()}*.\n\n` +
                `*eSewa Payment Details:*\n` +
                `• Name: *${accountHolder}*\n` +
                `• eSewa ID / Number: \`${accountNo}\`\n\n` +
                `Please reply with the payment confirmation screenshot once transferred. Thank you!`
              : `📲 *Payment QR Code (eSewa)*\nScan or save this QR code to upload into your eSewa or mobile banking app.\n\n` +
                `*eSewa Payment Details:*\n` +
                `• Name: *${accountHolder}*\n` +
                `• eSewa ID / Number: \`${accountNo}\`\n\n` +
                `Please reply with the payment confirmation screenshot once transferred. Thank you!`;
          await wa.sock.sendMessage(targetJid, {
            image: qrBuffer,
            caption: qrCaption,
          });
        }
      } catch (qrErr) {
        console.warn("Failed to send companion QR image:", qrErr);
      }
    }

    return { success: true };
  } catch (err) {
    return {
      success: false,
      error:
        err instanceof Error ? err.message : "Failed to send WhatsApp image.",
    };
  }
}

export async function logoutWhatsApp(): Promise<void> {
  const wa = getWAState();
  wa.isLoggingOut = true;
  try {
    if (wa.sock) {
      await wa.sock.logout().catch(() => {});
      wa.sock.end(undefined);
    }
  } finally {
    wa.sock = null;
    wa.status = "disconnected";
    wa.qrDataUrl = null;
    wa.userPhone = null;
    wa.lastError = null;
    await fs.rm(AUTH_DIR, { recursive: true, force: true }).catch(() => {});
  }
}
