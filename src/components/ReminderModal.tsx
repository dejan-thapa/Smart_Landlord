"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  MessageSquare,
  Phone,
  Copy,
  Check,
  X,
  Download,
  AlertTriangle,
  Send,
  Loader2,
  QrCode,
  CheckCircle2,
  Banknote,
} from "lucide-react";
import { InvoiceReminderData, formatNepaliMonth } from "@/lib/reminder-utils";
import { generateBillCardPng, sendBillViaWhatsApp } from "@/lib/bill-image";

interface ReminderModalProps {
  data: InvoiceReminderData;
  isOpen: boolean;
  onClose: () => void;
  onSent?: () => void;
}

type WAStatus = "disconnected" | "connecting" | "qr_ready" | "connected";

interface WAStatusResponse {
  status: WAStatus;
  qrDataUrl: string | null;
  userPhone: string | null;
  lastError: string | null;
}

export default function ReminderModal({
  data,
  isOpen,
  onClose,
  onSent,
}: ReminderModalProps) {
  const [customPhone, setCustomPhone] = useState(data.phoneNumber || "");
  const [copiedImage, setCopiedImage] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [sentSuccess, setSentSuccess] = useState(false);

  const [waStatus, setWaStatus] = useState<WAStatus>("connecting");
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [waUserPhone, setWaUserPhone] = useState<string | null>(null);

  const wasDisconnectedRef = useRef(false);
  const autoSentRef = useRef(false);

  const handleSendDirect = useCallback(async () => {
    if (!customPhone.trim()) {
      setErrorMsg("Please enter a tenant WhatsApp number above.");
      return;
    }
    setIsSending(true);
    setErrorMsg(null);
    setStatusMsg(null);
    try {
      const res = await sendBillViaWhatsApp({
        ...data,
        phoneNumber: customPhone.trim(),
      });
      if (res.sent) {
        setSentSuccess(true);
        setStatusMsg("✓ Sent to WhatsApp!");
        onSent?.();
        setTimeout(() => {
          onClose();
        }, 1400);
      } else if (res.needsModal) {
        wasDisconnectedRef.current = true;
        setWaStatus("qr_ready");
        setErrorMsg(res.error || "Please link your WhatsApp by scanning the QR code.");
      } else {
        setErrorMsg(res.error || "Failed to send bill on WhatsApp.");
      }
    } finally {
      setIsSending(false);
    }
  }, [customPhone, data, onClose, onSent]);

  // Poll /api/whatsapp every 2.5s while modal is open and not yet connected
  useEffect(() => {
    if (!isOpen) return;

    let cancelled = false;
    let timer: ReturnType<typeof setInterval> | null = null;

    const pollStatus = async () => {
      try {
        const res = await fetch("/api/whatsapp", { cache: "no-store" });
        if (!res.ok || cancelled) return;
        const json: WAStatusResponse = await res.json();
        if (cancelled) return;

        setWaStatus(json.status);
        setQrDataUrl(json.qrDataUrl);
        setWaUserPhone(json.userPhone);
        if (json.lastError && json.status !== "connected") {
          setErrorMsg(json.lastError);
        }

        if (json.status !== "connected") {
          wasDisconnectedRef.current = true;
        } else {
          if (timer) {
            clearInterval(timer);
            timer = null;
          }
          // Auto-send once when transitioning from disconnected/QR to connected
          if (
            wasDisconnectedRef.current &&
            !autoSentRef.current &&
            customPhone.trim()
          ) {
            autoSentRef.current = true;
            handleSendDirect();
          }
        }
      } catch {
        // Keep polling on transient dev errors
      }
    };

    pollStatus();
    timer = setInterval(pollStatus, 2500);

    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
    };
  }, [isOpen, customPhone, handleSendDirect]);

  if (!isOpen) return null;

  const hasPhone = Boolean(customPhone.trim());
  const nepaliMonth = formatNepaliMonth(data.billingMonth);
  const tenantDisplay = data.tenantName?.trim() || `Room ${data.roomNo} Tenant`;
  const avatarChar = (
    data.tenantName ? data.tenantName.trim().charAt(0) : String(data.roomNo).charAt(0)
  ).toUpperCase();

  const accountHolder = data.bankDetails?.accountHolder || "Dejan Thapa";
  const bankName = data.bankDetails?.bankName || "eSewa";
  const accountNo = data.bankDetails?.accountNo || "9842835084";

  const lineItems = [
    { label: "Base Rent", value: Number(data.rentAmount || 0) },
    { label: "Electricity", value: Number(data.electricityCost || 0) },
    { label: "Water (shared)", value: Number(data.waterShare || 0) },
    { label: "WiFi (shared)", value: Number(data.wifiShare || 0) },
    { label: "Garbage (shared)", value: Number(data.garbageShare || 0) },
  ];

  const handleCopyBillImage = async () => {
    setIsGenerating(true);
    setErrorMsg(null);
    try {
      const { blob } = await generateBillCardPng({ ...data, phoneNumber: customPhone });
      await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
      setCopiedImage(true);
      setStatusMsg("Bill card image copied to clipboard! Paste (Ctrl+V) in WhatsApp.");
      setTimeout(() => setCopiedImage(false), 3500);
    } catch {
      setErrorMsg("Could not copy automatically — use Save PNG instead.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadImage = async () => {
    setIsGenerating(true);
    setErrorMsg(null);
    try {
      const { blob } = await generateBillCardPng({ ...data, phoneNumber: customPhone });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Bill-Room-${data.roomNo}-${data.billingMonth}.png`;
      a.click();
      URL.revokeObjectURL(url);
      setStatusMsg("Bill image downloaded!");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-slate-50 dark:bg-slate-900 rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#25D366] text-white flex items-center justify-center shadow-md shadow-emerald-500/20">
              <MessageSquare size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-tight">
                  Send Bill Card on WhatsApp
                </h3>
                {waStatus === "connected" && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    WhatsApp Connected{waUserPhone ? ` (${waUserPhone})` : ""}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {nepaliMonth} • {tenantDisplay}
              </p>
            </div>
          </div>
          <button
            type="button"
            aria-label="Close bill card modal"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {/* One-Time WhatsApp Link QR Card when not connected */}
          {waStatus !== "connected" && (
            <div className="bg-white dark:bg-slate-800/90 border border-emerald-200 dark:border-emerald-800 rounded-2xl p-4 space-y-3 shadow-xs">
              <div className="flex items-center gap-2">
                <QrCode size={18} className="text-[#25D366] shrink-0" />
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                  Link Your WhatsApp (One-Time Setup)
                </h4>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                Open WhatsApp on your phone → <strong>Linked Devices</strong> →{" "}
                <strong>Link a Device</strong> → Scan this QR code. Once linked, bills send in 1 click!
              </p>
              <div className="flex flex-col items-center justify-center py-2">
                {qrDataUrl ? (
                  <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-xs">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={qrDataUrl}
                      alt="WhatsApp Link QR Code"
                      className="w-52 h-52 object-contain"
                    />
                  </div>
                ) : (
                  <div className="w-52 h-52 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center gap-2 text-slate-500 dark:text-slate-400">
                    <Loader2 size={24} className="animate-spin text-[#25D366]" />
                    <span className="text-xs font-medium">Generating QR code…</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Recipient Phone Row */}
          <div className="bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl p-3 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-200">
              <Phone size={14} className="text-teal-600" />
              <span>Tenant WhatsApp No:</span>
            </div>
            <input
              type="tel"
              placeholder="98XXXXXXXX"
              value={customPhone}
              onChange={(e) => setCustomPhone(e.target.value)}
              className="text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-slate-900 dark:text-white font-mono font-bold focus:outline-none focus:border-teal-500 w-40 text-right"
            />
          </div>

          {!hasPhone && (
            <div className="flex items-center gap-2 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl p-2.5 text-xs text-amber-800 dark:text-amber-300">
              <AlertTriangle size={14} className="text-amber-600 shrink-0" />
              <span>No phone number saved for this tenant. Enter a mobile number above to send directly.</span>
            </div>
          )}

          {errorMsg && (
            <div className="flex items-center gap-2 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl p-2.5 text-xs text-rose-700 dark:text-rose-300">
              <AlertTriangle size={14} className="text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {statusMsg && (
            <div className="bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-semibold px-3.5 py-2.5 rounded-xl flex items-center gap-2">
              <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
              <span>{statusMsg}</span>
            </div>
          )}

          {/* VISUAL BILL CARD PREVIEW (Billed To + Breakdown + Payment Instructions & QR) */}
          <div className="space-y-3 bg-slate-100/80 dark:bg-slate-950/60 p-3.5 rounded-2xl border border-slate-200/70 dark:border-slate-800">
            {/* Billed To Card */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs rounded-2xl p-4 sm:p-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider">Billed To</p>
                <div className="flex items-center gap-3">
                  <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-purple-400 to-indigo-600 flex items-center justify-center text-white font-bold text-base shadow-md shadow-purple-500/20 shrink-0">
                    {avatarChar}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                        {tenantDisplay}
                      </p>
                      <span className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider">
                        {data.roomSide || "Main"}
                      </span>
                    </div>
                    {customPhone && (
                      <p className="text-slate-400 text-xs font-mono mt-0.5">{customPhone}</p>
                    )}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs font-bold text-slate-400 mb-1 uppercase tracking-wider">Location</p>
                <p className="text-base font-bold text-slate-700 dark:text-slate-200 font-mono">
                  Room {data.roomNo}
                </p>
              </div>
            </div>

            {/* Breakdown Card */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs rounded-2xl overflow-hidden">
              <div className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-800">
                <h4 className="font-bold text-slate-700 dark:text-slate-300 text-xs uppercase tracking-wider">
                  Breakdown
                </h4>
              </div>
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {lineItems.map((item) => (
                  <div key={item.label} className="flex justify-between items-center px-5 py-2.5">
                    <span className="text-slate-500 dark:text-slate-400 text-xs font-medium">{item.label}</span>
                    <span className="font-bold font-mono text-xs sm:text-sm text-slate-900 dark:text-white">
                      Rs. {item.value.toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
              <div className="bg-slate-50 dark:bg-slate-800/60 px-5 py-3.5 flex justify-between items-center border-t border-slate-200 dark:border-slate-800">
                <span className="font-bold text-sm text-slate-900 dark:text-white">Total Due</span>
                <span className="text-xl font-bold font-mono text-slate-900 dark:text-white">
                  Rs. {Number(data.totalDue).toLocaleString()}
                </span>
              </div>
            </div>

            {/* Payment Instructions & QR Card */}
            <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-900 rounded-2xl p-4 sm:p-5">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-emerald-900 dark:text-emerald-200 font-bold text-sm flex items-center gap-1.5">
                  <Banknote size={16} /> Payment Instructions
                </h4>
                <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
                  Scan QR or Bank Transfer
                </span>
              </div>
              <div className="flex flex-col sm:flex-row gap-4 items-center">
                <div className="bg-white p-2.5 rounded-2xl border border-emerald-200/80 shadow-xs shrink-0 flex flex-col items-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/payment-qr-only.png"
                    alt="Payment QR Code"
                    className="w-36 h-36 object-contain"
                  />
                  <span className="text-[9px] uppercase tracking-wider font-bold text-emerald-700 mt-1">
                    Scan to Pay
                  </span>
                </div>
                <div className="space-y-2 text-xs text-emerald-800 dark:text-emerald-200 flex-1 w-full">
                  <div className="bg-white/80 dark:bg-slate-900/70 px-3.5 py-2.5 rounded-xl border border-emerald-100 dark:border-slate-800">
                    <p className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400 tracking-wider">
                      Account Name
                    </p>
                    <p className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">{accountHolder}</p>
                  </div>
                  <div className="bg-white/80 dark:bg-slate-900/70 px-3.5 py-2.5 rounded-xl border border-emerald-100 dark:border-slate-800">
                    <p className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400 tracking-wider">
                      Payment Method
                    </p>
                    <p className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">{bankName}</p>
                  </div>
                  <div className="bg-white/80 dark:bg-slate-900/70 px-3.5 py-2.5 rounded-xl border border-emerald-100 dark:border-slate-800">
                    <p className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400 tracking-wider">
                      eSewa ID / Mobile
                    </p>
                    <p className="font-bold font-mono text-sm sm:text-base text-emerald-950 dark:text-emerald-200">{accountNo}</p>
                  </div>
                </div>
              </div>
              <p className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium mt-3 text-center">
                Please send a screenshot of the payment confirmation after transfer.
              </p>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={isGenerating}
              onClick={handleCopyBillImage}
              className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 text-slate-700 dark:text-slate-200 text-xs font-bold transition-colors cursor-pointer"
            >
              {copiedImage ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
              {copiedImage ? "Image Copied!" : "Copy Bill Image"}
            </button>

            <button
              type="button"
              disabled={isGenerating}
              onClick={handleDownloadImage}
              className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 text-slate-700 dark:text-slate-200 text-xs font-bold transition-colors cursor-pointer"
              title="Download Bill Card PNG"
            >
              <Download size={14} />
              Save PNG
            </button>
          </div>

          <button
            type="button"
            disabled={isSending || sentSuccess || !hasPhone || waStatus !== "connected"}
            onClick={handleSendDirect}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#25D366] hover:bg-[#20ba59] disabled:opacity-50 text-white text-xs font-bold shadow-md shadow-emerald-500/20 transition-all cursor-pointer"
          >
            {isSending ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                Sending…
              </>
            ) : sentSuccess ? (
              <>
                <CheckCircle2 size={14} />
                Sent!
              </>
            ) : (
              <>
                <Send size={14} />
                Send Bill on WhatsApp
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
