"use client";

import { useEffect, useState } from "react";
import { generateBillCardPng } from "@/lib/bill-image";

export default function BillPreviewPage() {
  const [billUrl, setBillUrl] = useState<string | null>(null);

  useEffect(() => {
    generateBillCardPng({
      tenantName: "Djan Magar",
      roomNo: "2",
      roomSide: "Side A",
      phoneNumber: "9842835084",
      billingMonth: "2026-11",
      totalDue: 5000,
      rentAmount: 5000,
      electricityCost: 0,
      waterShare: 0,
      wifiShare: 0,
      garbageShare: 0,
    }).then(({ blob }) => setBillUrl(URL.createObjectURL(blob)));
  }, []);

  return (
    <div className="min-h-screen bg-slate-900 py-10 px-4 flex flex-col items-center">
      <div className="max-w-2xl w-full space-y-6">
        <div className="text-center text-white space-y-1">
          <h1 className="text-xl font-bold flex items-center justify-center gap-2">
            <span>📱</span> WhatsApp Chatbox Message Preview
          </h1>
          <p className="text-xs text-slate-400">
            Exactly what the tenant receives in their WhatsApp chatbox
          </p>
        </div>

        {/* WhatsApp Chat Simulation Bubble */}
        <div className="bg-[#0b141a] p-4 sm:p-6 rounded-3xl shadow-2xl border border-slate-800 space-y-4">
          {/* Message 1: Full Bill Card Image */}
          <div className="max-w-md ml-auto bg-[#005c4b] text-white p-2.5 rounded-2xl rounded-tr-xs shadow-md space-y-2">
            <div className="rounded-xl overflow-hidden bg-slate-100">
              {billUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img id="bill" src={billUrl} alt="Bill Card" className="w-full h-auto block" />
              ) : (
                <div className="p-8 text-center text-slate-500 text-xs">Generating bill image…</div>
              )}
            </div>
            <div className="px-1 text-xs text-emerald-50 whitespace-pre-line leading-relaxed">
              {`Here is your rent bill statement for *Kartik 2083* (*Room 2*):

*Total Due: Rs. 5,000*`}
            </div>
            <div className="text-[10px] text-emerald-200 text-right">11:15 PM ✓✓</div>
          </div>

          {/* Message 2: Companion Full-Res Standalone QR (Option 1) */}
          <div className="max-w-xs ml-auto bg-[#005c4b] text-white p-2.5 rounded-2xl rounded-tr-xs shadow-md space-y-2">
            <div className="rounded-xl overflow-hidden bg-white p-3 flex flex-col items-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/payment-qr-only.png"
                alt="Standalone Payment QR Code"
                className="w-56 h-56 object-contain"
              />
            </div>
            <div className="px-1 text-xs text-emerald-50 whitespace-pre-line leading-relaxed">
              {`📲 *Payment QR Code (eSewa)*
Scan or save this QR code to upload into your eSewa or mobile banking app to settle *Rs. 5,000*.

*eSewa Payment Details:*
• Name: *Dejan Thapa*
• eSewa ID / Number: \`9842835084\`

Please reply with the payment confirmation screenshot once transferred. Thank you!`}
            </div>
            <div className="text-[10px] text-emerald-200 text-right">11:15 PM ✓✓</div>
          </div>
        </div>
      </div>
    </div>
  );
}
