"use client";

import { useState } from "react";

import Image from "next/image";

export default function PaymentQR() {
  const [error, setError] = useState(false);

  if (error) return null;

  return (
    <div className="bg-white p-3 rounded-2xl shadow-sm border border-emerald-100 transition-transform active:scale-95">
      <a href="/payment-qr-only.png" target="_blank" rel="noreferrer" title="View Full Size">
        <Image
          src="/payment-qr-only.png"
          alt="Payment QR Code"
          width={160}
          height={160}
          className="w-40 h-40 object-contain cursor-zoom-in"
          onError={() => setError(true)}
          priority
        />
        <p className="text-[10px] text-center mt-2 font-bold text-blue-600 uppercase tracking-tighter">Click to enlarge / Save</p>
      </a>
    </div>
  );
}
