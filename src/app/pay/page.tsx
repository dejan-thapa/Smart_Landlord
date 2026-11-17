import Link from "next/link";
import { Check, Copy, Download, ExternalLink, QrCode, ShieldCheck, Smartphone } from "lucide-react";
import CopyButton from "./CopyButton";

export const metadata = {
  title: "Pay Rent via eSewa | Smart Landlord",
  description: "Scan eSewa QR code or copy eSewa ID to pay rent directly.",
};

export default async function PayPage({
  searchParams,
}: {
  searchParams: Promise<{
    room?: string;
    month?: string;
    amount?: string;
    tenant?: string;
  }>;
}) {
  const { room, month, amount, tenant } = await searchParams;

  const accountHolder = process.env.PAYMENT_ACCOUNT_HOLDER || "Dejan Thapa";
  const accountNo = process.env.PAYMENT_ACCOUNT_NO || "9842835084";
  const bankName = process.env.PAYMENT_BANK_NAME || "eSewa";

  const numAmount = amount ? Number(amount) : null;
  const formattedAmount = numAmount ? `Rs. ${numAmount.toLocaleString()}` : null;

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col justify-between py-6 px-4 sm:py-12">
      <div className="max-w-md w-full mx-auto space-y-4">
        {/* Brand Header */}
        <div className="text-center space-y-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 text-xs font-bold uppercase tracking-wider">
            <ShieldCheck size={14} /> Verified Rental Payment
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            eSewa Rent Payment
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Scan the official QR code or transfer directly to the eSewa ID below
          </p>
        </div>

        {/* Bill Summary (if query params provided) */}
        {(room || formattedAmount || month) && (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                {month ? `Bill for ${month}` : "Rent Statement"}
              </p>
              <h2 className="text-sm font-extrabold text-slate-900 dark:text-white">
                {room ? `Room ${room}` : "Room Rental"}{tenant ? ` • ${tenant}` : ""}
              </h2>
            </div>
            {formattedAmount && (
              <div className="text-right">
                <p className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                  Total Due
                </p>
                <p className="text-lg font-black font-mono text-slate-900 dark:text-white">
                  {formattedAmount}
                </p>
              </div>
            )}
          </div>
        )}

        {/* QR Code Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xl space-y-5 text-center">
          <div className="inline-flex items-center gap-2 text-xs font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-3 py-1 rounded-full">
            <QrCode size={14} /> Official eSewa QR Code
          </div>

          {/* QR Image Box */}
          <div className="relative mx-auto w-64 h-64 sm:w-72 sm:h-72 bg-white p-3 rounded-2xl border-2 border-emerald-500 shadow-lg shadow-emerald-500/10 flex flex-col items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/payment-qr-only.png"
              alt="Official eSewa QR Code for Dejan Thapa"
              className="w-full h-full object-contain"
            />
          </div>

          <div className="space-y-1">
            <p className="text-xs font-medium text-slate-600 dark:text-slate-300">
              Open <strong>eSewa app</strong> → Tap <strong>Scan QR</strong> → Select this photo from Gallery
            </p>
            <p className="text-[11px] text-slate-400">
              Or scan directly from another phone screen
            </p>
          </div>

          {/* Download QR Button */}
          <a
            href="/payment-qr-only.png"
            download="eSewa-QR-Dejan-Thapa.png"
            className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 text-emerald-800 dark:text-emerald-300 font-bold text-xs border border-emerald-200 dark:border-emerald-800 transition-colors"
          >
            <Download size={15} /> Save QR Image to Gallery
          </a>
        </div>

        {/* Direct eSewa ID Transfer Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Smartphone size={16} className="text-[#25D366]" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Direct Transfer
              </h3>
            </div>
            <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md">
              {bankName}
            </span>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
              <div>
                <p className="text-[10px] font-bold uppercase text-slate-400">eSewa ID / Mobile Number</p>
                <p className="text-base font-black font-mono text-slate-900 dark:text-white tracking-wider">
                  {accountNo}
                </p>
              </div>
              <CopyButton textToCopy={accountNo} label="Copy ID" />
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
              <p className="text-[10px] font-bold uppercase text-slate-400">Account Holder Name</p>
              <p className="text-sm font-bold text-slate-900 dark:text-white">
                {accountHolder}
              </p>
            </div>
          </div>
        </div>

        {/* Notice */}
        <p className="text-center text-xs text-slate-500 dark:text-slate-400 px-4">
          Please take a screenshot of your transfer confirmation and send it back to the landlord via WhatsApp. Thank you! 🙏
        </p>
      </div>

      <div className="text-center text-[11px] text-slate-400 mt-8">
        Smart Landlord OS • Secure Digital Rent Management
      </div>
    </div>
  );
}
