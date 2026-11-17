import { NextResponse } from "next/server";
import {
  getWhatsAppStatus,
  sendWhatsAppBillImage,
  logoutWhatsApp,
} from "@/lib/whatsapp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BOT_URL = process.env.WHATSAPP_BOT_URL ? process.env.WHATSAPP_BOT_URL.replace(/\/+$/, "") : null;
const BOT_API_KEY = process.env.BOT_API_KEY || "smart-landlord-secret-key";

export async function GET() {
  // If cloud bot microservice is configured (e.g. on Render / Railway), proxy to it
  if (BOT_URL) {
    try {
      const res = await fetch(`${BOT_URL}/api/status`, {
        headers: { "x-api-key": BOT_API_KEY },
        cache: "no-store",
      });
      if (res.ok) {
        const json = await res.json();
        return NextResponse.json(json);
      }
    } catch (err) {
      console.warn("Cloud bot unreachable, falling back to local:", err);
    }
  }

  try {
    const status = await getWhatsAppStatus();
    return NextResponse.json(status);
  } catch (err) {
    return NextResponse.json(
      {
        status: "disconnected",
        qrDataUrl: null,
        userPhone: null,
        lastError: err instanceof Error ? err.message : "Failed to fetch WhatsApp status.",
      },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const action = body?.action || "send";

    // Proxy to Cloud Bot if configured
    if (BOT_URL) {
      try {
        const targetEndpoint = action === "logout" ? `${BOT_URL}/api/logout` : `${BOT_URL}/api/send`;
        const res = await fetch(targetEndpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": BOT_API_KEY,
          },
          body: JSON.stringify(body),
        });
        const json = await res.json();
        return NextResponse.json(json, { status: res.status });
      } catch (err) {
        console.warn("Cloud bot failed, falling back to local:", err);
      }
    }

    if (action === "logout") {
      await logoutWhatsApp();
      return NextResponse.json({ success: true });
    }

    const phone = typeof body?.phone === "string" ? body.phone : "";
    const imageBase64 = typeof body?.imageBase64 === "string" ? body.imageBase64 : "";
    const caption = typeof body?.caption === "string" ? body.caption : "";
    const sendCompanionQr = body?.sendCompanionQr !== undefined ? Boolean(body.sendCompanionQr) : true;
    const amount = typeof body?.amount === "number" ? body.amount : undefined;

    if (!phone.trim() || !imageBase64.trim()) {
      return NextResponse.json(
        { success: false, error: "Phone number and bill image are required." },
        { status: 400 }
      );
    }

    const result = await sendWhatsAppBillImage({
      phone,
      imageBase64,
      caption,
      sendCompanionQr,
      amount,
    });
    if (result.needsAuth) {
      const statusInfo = await getWhatsAppStatus();
      return NextResponse.json({
        success: false,
        needsAuth: true,
        ...statusInfo,
      });
    }

    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : "Invalid request payload.",
      },
      { status: 500 }
    );
  }
}
