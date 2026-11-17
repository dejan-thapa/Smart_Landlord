import QRCode from "qrcode";
import {
  InvoiceReminderData,
  formatNepaliMonth,
  buildWhatsAppBillMessage,
  normalizePhoneNumber,
} from "@/lib/reminder-utils";

/**
 * Payment QR payload (same JSON the bank-app QR contains, decoded from the original image).
 * Generating it in code gives a crisp QR at any size.
 */
function buildPaymentQrPayload({
  accountNo,
  accountHolder,
}: {
  accountNo: string;
  accountHolder: string;
}): string {
  return JSON.stringify({
    accountNumber: accountNo,
    accountName: accountHolder,
    bankCode: "NARBNPKA",
    accountType: "NABIL GENERAL SAVING ACCOUNT",
    bankCodeCIPS: "0401",
  });
}

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

/**
 * Draws the visual Bill Card (Billed To + Breakdown + Large Payment Instructions & Nabil Bank QR)
 * onto an HTML5 Canvas at 2x Retina resolution and returns both a PNG Blob and base64 string.
 *
 * NOTE: The "Unpaid" badge at the top right has been removed per user instruction.
 */
export async function generateBillCardPng(
  data: InvoiceReminderData
): Promise<{ blob: Blob; base64: string }> {
  const scale = 2;
  const width = 560;
  const hasPreviousBalance = Boolean(data.previousBalance && Number(data.previousBalance) > 0);
  const extraRowHeight = hasPreviousBalance ? 37 : 0;
  const height = 486 + extraRowHeight;

  const canvas = document.createElement("canvas");
  canvas.width = width * scale;
  canvas.height = height * scale;
  const ctx = canvas.getContext("2d")!;
  ctx.scale(scale, scale);

  const roundRect = (x: number, y: number, w: number, h: number, r: number) => {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  };

  // Outer background
  ctx.fillStyle = "#f8fafc";
  ctx.fillRect(0, 0, width, height);

  const monthLabel = formatNepaliMonth(data.billingMonth);
  const tenantDisplay = data.tenantName?.trim() || `Room ${data.roomNo} Tenant`;
  const avatarChar = (
    data.tenantName ? data.tenantName.trim().charAt(0) : String(data.roomNo).charAt(0)
  ).toUpperCase();
  const sideLabel = (data.roomSide || "MAIN").toUpperCase();

  // Top Header Title (clean, without any "Unpaid" pill)
  ctx.fillStyle = "#0f172a";
  ctx.font = "bold 18px system-ui, -apple-system, sans-serif";
  ctx.fillText(`Rent Bill • ${monthLabel}`, 24, 38);

  // Subtle brand tag on top right instead of "Unpaid"
  ctx.textAlign = "right";
  ctx.fillStyle = "#94a3b8";
  ctx.font = "bold 11px system-ui, -apple-system, sans-serif";
  ctx.fillText("DIGITAL RENTAL STATEMENT", width - 24, 38);
  ctx.textAlign = "left";

  // --- Card 1: Billed To ---
  const c1Y = 56;
  const c1H = 108;
  roundRect(24, c1Y, width - 48, c1H, 16);
  ctx.fillStyle = "#ffffff";
  ctx.fill();
  ctx.lineWidth = 1;
  ctx.strokeStyle = "#e2e8f0";
  ctx.stroke();

  ctx.fillStyle = "#94a3b8";
  ctx.font = "bold 11px system-ui, -apple-system, sans-serif";
  ctx.fillText("BILLED TO", 46, c1Y + 26);

  // Avatar Box
  roundRect(46, c1Y + 38, 48, 48, 14);
  const grad = ctx.createLinearGradient(46, c1Y + 38, 94, c1Y + 86);
  grad.addColorStop(0, "#a855f7");
  grad.addColorStop(1, "#4f46e5");
  ctx.fillStyle = grad;
  ctx.fill();

  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 18px system-ui, -apple-system, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(avatarChar, 70, c1Y + 68);
  ctx.textAlign = "left";

  // Tenant Name
  ctx.fillStyle = "#0f172a";
  ctx.font = "bold 19px system-ui, -apple-system, sans-serif";
  ctx.fillText(tenantDisplay, 108, c1Y + 60);

  // Side Pill next to name
  const nameWidth = ctx.measureText(tenantDisplay).width;
  const pillX = Math.min(108 + nameWidth + 10, width - 190);
  roundRect(pillX, c1Y + 44, 56, 20, 10);
  ctx.fillStyle = "#f1f5f9";
  ctx.fill();
  ctx.fillStyle = "#475569";
  ctx.font = "bold 10px system-ui, -apple-system, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(sideLabel, pillX + 28, c1Y + 58);
  ctx.textAlign = "left";

  if (data.phoneNumber) {
    ctx.fillStyle = "#94a3b8";
    ctx.font = "500 12px ui-monospace, monospace";
    ctx.fillText(data.phoneNumber, 108, c1Y + 80);
  }

  // LOCATION (Right aligned)
  ctx.textAlign = "right";
  ctx.fillStyle = "#94a3b8";
  ctx.font = "bold 11px system-ui, -apple-system, sans-serif";
  ctx.fillText("LOCATION", width - 46, c1Y + 44);

  ctx.fillStyle = "#334155";
  ctx.font = "bold 18px ui-monospace, monospace";
  ctx.fillText(`Room ${data.roomNo}`, width - 46, c1Y + 70);
  ctx.textAlign = "left";

  // --- Card 2: Breakdown ---
  const c2Y = 178;
  const c2H = 284 + extraRowHeight;
  roundRect(24, c2Y, width - 48, c2H, 16);
  ctx.fillStyle = "#ffffff";
  ctx.fill();
  ctx.strokeStyle = "#e2e8f0";
  ctx.stroke();

  ctx.fillStyle = "#334155";
  ctx.font = "bold 13px system-ui, -apple-system, sans-serif";
  ctx.fillText("BREAKDOWN", 46, c2Y + 29);

  ctx.beginPath();
  ctx.moveTo(24, c2Y + 44);
  ctx.lineTo(width - 24, c2Y + 44);
  ctx.strokeStyle = "#f1f5f9";
  ctx.stroke();

  const items: { label: string; value: number; isArrears?: boolean }[] = [
    { label: "Base Rent", value: Number(data.rentAmount || 0) },
    { label: "Electricity", value: Number(data.electricityCost || 0) },
    { label: "Water (shared)", value: Number(data.waterShare || 0) },
    { label: "WiFi (shared)", value: Number(data.wifiShare || 0) },
    { label: "Garbage (shared)", value: Number(data.garbageShare || 0) },
  ];

  if (hasPreviousBalance) {
    items.push({
      label: "Previous Unpaid Balance",
      value: Number(data.previousBalance),
      isArrears: true,
    });
  }

  let rowY = c2Y + 44;
  const rowH = 37;

  items.forEach((item, idx) => {
    if (item.isArrears) {
      ctx.fillStyle = "#b45309";
      ctx.font = "bold 14px system-ui, -apple-system, sans-serif";
      ctx.fillText(item.label, 46, rowY + 24);

      ctx.textAlign = "right";
      ctx.fillStyle = "#b45309";
      ctx.font = "bold 15px ui-monospace, monospace";
      ctx.fillText(`Rs. ${item.value.toLocaleString()}`, width - 46, rowY + 24);
      ctx.textAlign = "left";
    } else {
      ctx.fillStyle = "#64748b";
      ctx.font = "500 14px system-ui, -apple-system, sans-serif";
      ctx.fillText(item.label, 46, rowY + 24);

      ctx.textAlign = "right";
      ctx.fillStyle = "#0f172a";
      ctx.font = "bold 15px ui-monospace, monospace";
      ctx.fillText(`Rs. ${item.value.toLocaleString()}`, width - 46, rowY + 24);
      ctx.textAlign = "left";
    }

    rowY += rowH;
    if (idx < items.length - 1) {
      ctx.beginPath();
      ctx.moveTo(24, rowY);
      ctx.lineTo(width - 24, rowY);
      ctx.strokeStyle = "#f1f5f9";
      ctx.stroke();
    }
  });

  // Total Due Footer inside Card 2
  const footerY = c2Y + 44 + items.length * rowH;
  const footerH = c2H - (44 + items.length * rowH);

  ctx.save();
  roundRect(24, c2Y, width - 48, c2H, 16);
  ctx.clip();
  ctx.fillStyle = "#f8fafc";
  ctx.fillRect(24, footerY, width - 48, footerH);
  ctx.restore();

  ctx.beginPath();
  ctx.moveTo(24, footerY);
  ctx.lineTo(width - 24, footerY);
  ctx.strokeStyle = "#e2e8f0";
  ctx.stroke();

  ctx.fillStyle = "#0f172a";
  ctx.font = "bold 16px system-ui, -apple-system, sans-serif";
  ctx.fillText("Total Due", 46, footerY + 36);

  ctx.textAlign = "right";
  ctx.fillStyle = "#0f172a";
  ctx.font = "bold 22px ui-monospace, monospace";
  ctx.fillText(`Rs. ${Number(data.totalDue).toLocaleString()}`, width - 46, footerY + 38);
  ctx.textAlign = "left";

  const dataUrl = canvas.toDataURL("image/png");
  const base64 = dataUrl.split(",")[1] || "";

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => {
      if (b) resolve(b);
      else reject(new Error("Canvas toBlob failed"));
    }, "image/png");
  });

  return { blob, base64 };
}

/**
 * Opens WhatsApp directly on mobile devices (PWA / browser) or desktop.
 * Uses native URL schemes and universal links that reliably punch out of PWA standalone mode.
 */
export function openWhatsAppDirectly(
  phoneNumber: string | null | undefined,
  text: string
): boolean {
  if (typeof window === "undefined") return false;

  const cleanPhone = normalizePhoneNumber(phoneNumber);
  const encodedText = encodeURIComponent(text);

  const isIOS = /iPad|iPhone|iPod/i.test(navigator.userAgent);
  const isAndroid = /Android/i.test(navigator.userAgent);
  const isMobile =
    isIOS ||
    isAndroid ||
    (navigator.maxTouchPoints > 0 && window.innerWidth < 768) ||
    window.matchMedia("(display-mode: standalone)").matches ||
    Boolean((navigator as unknown as { standalone?: boolean }).standalone);

  // Native WhatsApp scheme (launches native app directly without loading intermediate web pages)
  const appSchemeUrl = cleanPhone
    ? `whatsapp://send?phone=${cleanPhone}&text=${encodedText}`
    : `whatsapp://send?text=${encodedText}`;

  // Universal WhatsApp link (official fallback that works across web and mobile)
  const universalUrl = cleanPhone
    ? `https://wa.me/${cleanPhone}?text=${encodedText}`
    : `https://wa.me/?text=${encodedText}`;

  if (isMobile) {
    // In mobile PWA or mobile browser:
    // Create an anchor with target="_blank" to escape PWA container sandbox cleanly
    try {
      const a = document.createElement("a");
      a.href = appSchemeUrl;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      // Fallback timer: if document stays visible and active after 1000ms (meaning custom scheme
      // was not handled, e.g. WhatsApp is not installed or strict browser), navigate to wa.me
      setTimeout(() => {
        if (!document.hidden) {
          window.location.href = universalUrl;
        }
      }, 1000);

      return true;
    } catch {
      window.location.href = universalUrl;
      return true;
    }
  }

  // Desktop: open universal link in a new tab
  window.open(universalUrl, "_blank", "noopener,noreferrer");
  return true;
}

/**
 * Sends or shares the bill statement + QR card image with the tenant.
 * - When Cloud / Local WhatsApp Bot is connected: Automatically delivers BOTH the Bill Card PNG
 *   and the standalone high-res eSewa QR Code image in the background.
 * - If not yet connected: Opens the ReminderModal so landlord can link WhatsApp or send directly.
 */
export async function sendBillViaWhatsApp(
  data: InvoiceReminderData,
  options?: { forceDirect?: boolean }
): Promise<{ sent: boolean; needsModal: boolean; error?: string }> {
  if (!data.phoneNumber || !data.phoneNumber.trim()) {
    return {
      sent: false,
      needsModal: true,
      error: "No phone number saved for this tenant.",
    };
  }

  // 1. If forced direct (e.g. user tapped "WhatsApp Direct"):
  if (options?.forceDirect) {
    try {
      const text = buildWhatsAppBillMessage(data);
      openWhatsAppDirectly(data.phoneNumber, text);
      return { sent: true, needsModal: false };
    } catch (err: unknown) {
      return {
        sent: false,
        needsModal: false,
        error: err instanceof Error ? err.message : "Could not open WhatsApp.",
      };
    }
  }

  // 2. Check 24/7 Cloud WhatsApp Bot (or local bot)
  try {
    const statusRes = await fetch("/api/whatsapp", { cache: "no-store" });
    if (statusRes.ok) {
      const statusJson = await statusRes.json();
      if (statusJson.status === "connected") {
        const { base64 } = await generateBillCardPng(data);
        const nepaliMonth = formatNepaliMonth(data.billingMonth);
        const caption =
          `Here is your rent bill statement for *${nepaliMonth}* (*Room ${data.roomNo}*):\n\n` +
          `*Total Due: Rs. ${Number(data.totalDue).toLocaleString()}*`;

        const res = await fetch("/api/whatsapp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "send",
            phone: data.phoneNumber,
            imageBase64: base64,
            caption,
            sendCompanionQr: true,
            amount: Number(data.totalDue),
          }),
        });

        if (res.ok) {
          const json = await res.json();
          if (json.success) {
            return { sent: true, needsModal: false };
          }
        }
      }
    }
  } catch {
    // Bot unreachable
  }

  // 3. If bot is not connected yet, open ReminderModal so landlord can link it via QR code,
  // or use the instant "Send with QR Image" / "WhatsApp Direct" buttons!
  return { sent: false, needsModal: true };
}
