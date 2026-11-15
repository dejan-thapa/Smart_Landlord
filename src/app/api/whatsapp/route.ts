import { NextResponse } from "next/server";
import {
  getWhatsAppStatus,
  sendWhatsAppBillImage,
  logoutWhatsApp,
} from "@/lib/whatsapp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
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
