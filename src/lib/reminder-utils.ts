import NepaliDate from "nepali-date-converter";

export interface InvoiceReminderData {
  tenantName: string;
  roomNo: string;
  roomSide?: string;
  phoneNumber?: string | null;
  billingMonth: string;
  totalDue: number;
  rentAmount?: number;
  electricityCost?: number;
  waterShare?: number;
  wifiShare?: number;
  garbageShare?: number;
  previousBalance?: number;
  dueDate?: string;
  bankDetails?: {
    accountHolder: string;
    bankName: string;
    accountNo: string;
  };
}

/**
 * Normalizes Nepali / international phone numbers into standard digits for wa.me / sms.
 * e.g., "9812345678" -> "9779812345678"
 * "+977 9812345678" -> "9779812345678"
 */
export function normalizePhoneNumber(rawPhone?: string | null): string {
  if (!rawPhone) return "";
  const cleaned = rawPhone.replace(/[^\d+]/g, "").replace(/^\+/, "");
  if (!cleaned) return "";

  // If 10 digits starting with 98 or 97 (standard Nepal mobile), prefix 977
  if (cleaned.length === 10 && (cleaned.startsWith("98") || cleaned.startsWith("97"))) {
    return `977${cleaned}`;
  }

  return cleaned;
}

/**
 * Formats Nepali Bikram Sambat (BS) month name
 */
export function formatNepaliMonth(monthStr: string): string {
  try {
    return new NepaliDate(new Date(monthStr + "-15")).format("MMMM YYYY");
  } catch {
    return monthStr;
  }
}

/**
 * Generates an English / Nepali friendly payment reminder message
 */
export function generateReminderText(
  data: InvoiceReminderData,
  variant: "friendly" | "formal" | "urgent" = "friendly"
): string {
  const nepaliMonth = formatNepaliMonth(data.billingMonth);
  const name = data.tenantName ? data.tenantName.trim() : `Tenant (Room ${data.roomNo})`;
  const total = Number(data.totalDue).toLocaleString();

  const bankHolder = data.bankDetails?.accountHolder || "Dejan Thapa";
  const bankName = data.bankDetails?.bankName || "eSewa";
  const accountNo = data.bankDetails?.accountNo || "9842835084";

  if (variant === "urgent") {
    return `⚠️ *URGENT RENT DUE NOTICE*
Namaste ${name},
Your rent and utilities bill for *${nepaliMonth} (Room ${data.roomNo})* is currently overdue.

*Total Pending Amount: Rs. ${total}*

Please settle this payment as soon as possible via Bank Transfer or eSewa:
🏦 *${bankName}*
• A/C Name: ${bankHolder}
• A/C No: \`${accountNo}\`

Kindly share the payment screenshot once transferred. Thank you!`;
  }

  if (variant === "formal") {
    return `Namaste ${name},
This is a formal billing statement for *Room ${data.roomNo}* for the period of *${nepaliMonth}*.

*Bill Summary:*
• Base Rent: Rs. ${Number(data.rentAmount || 0).toLocaleString()}
• Electricity: Rs. ${Number(data.electricityCost || 0).toLocaleString()}
• Shared Utilities: Rs. ${Number((data.waterShare || 0) + (data.wifiShare || 0) + (data.garbageShare || 0)).toLocaleString()}
━━━━━━━━━━━━━━━━━━━━
*Total Amount Due: Rs. ${total}*

*Payment Information:*
Bank: ${bankName}
Account Name: ${bankHolder}
Account Number: \`${accountNo}\`

Please reply with the payment confirmation screenshot once transferred.
Regards,
Smart Landlord OS`;
  }

  // Default: friendly reminder
  return `Namaste ${name} ji 🙏
Here is your rental bill statement for *${nepaliMonth}* (*Room ${data.roomNo}*):

*Total Due: Rs. ${total}*
• Rent: Rs. ${Number(data.rentAmount || 0).toLocaleString()}
• Electricity: Rs. ${Number(data.electricityCost || 0).toLocaleString()}
• Water/WiFi/Garbage: Rs. ${Number((data.waterShare || 0) + (data.wifiShare || 0) + (data.garbageShare || 0)).toLocaleString()}

*Payment Options:*
🏦 Bank: ${bankName} (${accountNo})
👤 Name: ${bankHolder}

Please send the screenshot after payment. Dhanyabad!`;
}

/**
 * Builds standard clean WhatsApp bill statement with itemized breakdown and payment details
 */
export function buildWhatsAppBillMessage(data: InvoiceReminderData): string {
  const nepaliMonth = formatNepaliMonth(data.billingMonth);
  const total = Number(data.totalDue).toLocaleString();
  const accountHolder = data.bankDetails?.accountHolder || "Dejan Thapa";
  const bankName = data.bankDetails?.bankName || "eSewa";
  const accountNo = data.bankDetails?.accountNo || "9842835084";
  const greeting = data.tenantName ? `Namaste ${data.tenantName.trim()}!` : "Namaste!";

  const breakdownLines: string[] = [];
  if (data.rentAmount !== undefined && Number(data.rentAmount) > 0) {
    breakdownLines.push(`• Base Rent: Rs. ${Number(data.rentAmount).toLocaleString()}`);
  }
  if (data.electricityCost !== undefined && Number(data.electricityCost) > 0) {
    breakdownLines.push(`• Electricity: Rs. ${Number(data.electricityCost).toLocaleString()}`);
  }
  if (data.waterShare !== undefined && Number(data.waterShare) > 0) {
    breakdownLines.push(`• Water (shared): Rs. ${Number(data.waterShare).toLocaleString()}`);
  }
  if (data.wifiShare !== undefined && Number(data.wifiShare) > 0) {
    breakdownLines.push(`• WiFi (shared): Rs. ${Number(data.wifiShare).toLocaleString()}`);
  }
  if (data.garbageShare !== undefined && Number(data.garbageShare) > 0) {
    breakdownLines.push(`• Garbage (shared): Rs. ${Number(data.garbageShare).toLocaleString()}`);
  }
  if (data.previousBalance !== undefined && Number(data.previousBalance) > 0) {
    breakdownLines.push(`• Previous Unpaid Balance: Rs. ${Number(data.previousBalance).toLocaleString()}`);
  }

  let breakdownSection = "";
  if (breakdownLines.length > 0) {
    breakdownSection = `📋 *Bill Breakdown:*\n${breakdownLines.join("\n")}\n\n`;
  }

  const appUrl =
    (typeof process !== "undefined" && process.env?.NEXT_PUBLIC_APP_URL) ||
    "https://smart-landlord-os.vercel.app";
  const payUrl = `${appUrl}/pay?room=${encodeURIComponent(data.roomNo)}&amount=${encodeURIComponent(String(data.totalDue))}&month=${encodeURIComponent(nepaliMonth)}`;

  return `${greeting}\n` +
    `Here is your rent bill statement for *${nepaliMonth}* (*Room ${data.roomNo}*):\n\n` +
    breakdownSection +
    `💰 *Total Due: Rs. ${total}*\n\n` +
    `📱 *Payment Details (${bankName}):*\n` +
    `• Account Name: *${accountHolder}*\n` +
    `• eSewa ID / Number: *${accountNo}*\n\n` +
    `📲 *Scan to Pay (eSewa QR Code):*\n` +
    `${payUrl}\n\n` +
    `Please reply with the payment confirmation screenshot once transferred. Thank you! 🙏`;
}

/**
 * Builds a direct WhatsApp web/app link with encoded text
 */
export function getWhatsAppUrl(phoneNumber: string | null | undefined, message: string): string {
  const normalized = normalizePhoneNumber(phoneNumber);
  const encodedMsg = encodeURIComponent(message);
  if (normalized) {
    return `https://wa.me/${normalized}?text=${encodedMsg}`;
  }
  return `https://wa.me/?text=${encodedMsg}`;
}

/**
 * Builds standard SMS URI
 */
export function getSmsUrl(phoneNumber: string | null | undefined, message: string): string {
  const cleanPhone = (phoneNumber || "").replace(/[^\d+]/g, "");
  const encodedMsg = encodeURIComponent(message);
  // SMS URI format: sms:phone?body=message or sms:phone&body=message (iOS vs Android)
  return `sms:${cleanPhone}?body=${encodedMsg}`;
}
