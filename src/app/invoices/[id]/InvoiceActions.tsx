"use client";

import { useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  RotateCcw,
  Loader2,
  Trash2,
  AlertTriangle,
  Mail,
  Send,
  Banknote,
  X,
  Calendar,
  CreditCard,
  FileText,
  MessageSquare,
  Smartphone,
  Landmark,
  FileCheck2,
  type LucideIcon,
} from "lucide-react";
import { markInvoicePaid, markInvoiceUnpaid, deleteInvoice, sendInvoiceEmail } from "../invoice-actions";
import ReminderModal from "@/components/ReminderModal";
import { InvoiceReminderData } from "@/lib/reminder-utils";
import { sendBillViaWhatsApp } from "@/lib/bill-image";

type PaymentMethod = "cash" | "esewa" | "bank_transfer" | "cheque" | "other";

const PAYMENT_METHODS: { value: PaymentMethod; label: string; icon: LucideIcon }[] = [
  { value: "cash", label: "Cash", icon: Banknote },
  { value: "esewa", label: "eSewa", icon: Smartphone },
  { value: "bank_transfer", label: "Bank Transfer", icon: Landmark },
  { value: "cheque", label: "Cheque", icon: FileCheck2 },
  { value: "other", label: "Other", icon: CreditCard },
];

function PaymentModal({
  onConfirm,
  onCancel,
  isPending,
  balanceDue,
}: {
  onConfirm: (details: { payment_date: string; payment_method: PaymentMethod; payment_notes: string; amount: number }) => void;
  onCancel: () => void;
  isPending: boolean;
  balanceDue: number;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const [paymentDate, setPaymentDate] = useState(today);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [paymentNotes, setPaymentNotes] = useState("");
  const [amountInput, setAmountInput] = useState(String(balanceDue));
  const amount = parseFloat(amountInput) || 0;
  const isPartialAmount = amount > 0 && amount < balanceDue - 0.01;
  const remainingAfter = Math.max(0, balanceDue - amount);

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
        onClick={onCancel}
      />

      {/* Modal */}
      <div className="fixed bottom-0 left-0 right-0 z-50 lg:top-1/2 lg:bottom-auto lg:left-1/2 lg:-translate-x-1/2 lg:-translate-y-1/2 lg:w-full lg:max-w-md">
        <div className="bg-white rounded-t-3xl lg:rounded-3xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 lg:slide-in-from-bottom-0 duration-300">
          {/* Header */}
          <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-100 flex items-center justify-center">
                <Banknote size={20} className="text-emerald-700" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">Record Payment</h3>
                <p className="text-xs text-slate-500">Fill in the payment details below</p>
              </div>
            </div>
            <button
              type="button"
              aria-label="Close payment modal"
              onClick={onCancel}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          <div className="px-6 py-5 space-y-5">
            {/* Amount Received */}
            <div>
              <label htmlFor="payment-amount-input" className="flex items-center gap-1.5 text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                <Banknote size={12} aria-hidden="true" />
                Amount Received
              </label>
              <div className="flex gap-2">
                <input
                  id="payment-amount-input"
                  type="number"
                  inputMode="decimal"
                  min={0}
                  value={amountInput}
                  onChange={(e) => setAmountInput(e.target.value)}
                  className="flex-1 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold font-mono text-slate-900 focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition-all bg-slate-50"
                />
                <button
                  type="button"
                  onClick={() => setAmountInput(String(balanceDue))}
                  className="px-3 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50"
                >
                  Full
                </button>
                <button
                  type="button"
                  onClick={() => setAmountInput(String(Math.round(balanceDue / 2)))}
                  className="px-3 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50"
                >
                  Half
                </button>
              </div>
              <p className={`text-[11px] font-medium mt-1.5 ${isPartialAmount ? "text-orange-600" : "text-slate-500"}`}>
                {isPartialAmount
                  ? `Partial payment · Rs.${remainingAfter.toLocaleString()} will remain due`
                  : `Balance due: Rs.${balanceDue.toLocaleString()}`}
              </p>
            </div>
            {/* Payment Date */}
            <div>
              <label htmlFor="payment-date-input" className="flex items-center gap-1.5 text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                <Calendar size={12} aria-hidden="true" />
                Payment Date
              </label>
              <input
                id="payment-date-input"
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                max={today}
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-slate-900 focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition-all bg-slate-50"
              />
            </div>

            {/* Payment Method */}
            <div>
              <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                <CreditCard size={12} aria-hidden="true" />
                Payment Method
              </label>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                {PAYMENT_METHODS.map((method) => {
                  const MethodIcon = method.icon;
                  return (
                    <button
                      key={method.value}
                      type="button"
                      onClick={() => setPaymentMethod(method.value)}
                      className={`flex flex-col items-center gap-1.5 py-2.5 px-1 rounded-xl border-2 text-xs font-semibold transition-all ${
                        paymentMethod === method.value
                          ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                          : "border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                      }`}
                    >
                      <MethodIcon size={18} aria-hidden="true" />
                      <span>{method.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                <FileText size={12} />
                Notes <span className="text-slate-400 font-normal normal-case tracking-normal">(optional)</span>
              </label>
              <textarea
                value={paymentNotes}
                onChange={(e) => setPaymentNotes(e.target.value)}
                rows={2}
                placeholder="e.g. Received in envelope, partial from last month..."
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition-all bg-slate-50 resize-none"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 pb-6 pt-2 flex gap-3">
            <button
              onClick={onCancel}
              className="flex-1 py-3.5 rounded-2xl border border-slate-200 text-slate-700 font-bold text-sm hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => onConfirm({ payment_date: paymentDate, payment_method: paymentMethod, payment_notes: paymentNotes, amount })}
              disabled={isPending || !paymentDate || amount <= 0}
              className="flex-1 py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition-all disabled:opacity-60"
            >
              {isPending ? (
                <><Loader2 size={16} className="animate-spin" /> Saving...</>
              ) : (
                <><CheckCircle2 size={16} /> {isPartialAmount ? "Record Partial" : "Confirm Payment"}</>
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

export default function InvoiceActions({
  invoiceId,
  isPaid,
  balanceDue,
  isPartial = false,
  reminderData,
}: {
  invoiceId: string;
  isPaid: boolean;
  balanceDue: number;
  isPartial?: boolean;
  reminderData?: InvoiceReminderData;
}) {
  const [isPending, startTransition] = useTransition();
  const [isEmailing, setIsEmailing] = useState(false);
  const [emailStatus, setEmailStatus] = useState<"idle" | "success" | "error">("idle");
  const [isSendingWA, setIsSendingWA] = useState(false);
  const [waStatus, setWaStatus] = useState<"idle" | "success" | "error">("idle");
  const [isConfirmingMsg, setIsConfirmingMsg] = useState(false);
  const [showOverride, setShowOverride] = useState(false);
  const [overrideEmail, setOverrideEmail] = useState("");
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showReminderModal, setShowReminderModal] = useState(false);
  const router = useRouter();

  const handleMarkPaid = (details: { payment_date: string; payment_method: PaymentMethod; payment_notes: string; amount: number }) => {
    startTransition(async () => {
      const result = await markInvoicePaid(invoiceId, {
        payment_date: details.payment_date,
        payment_method: details.payment_method,
        payment_notes: details.payment_notes,
        amount: details.amount,
      });
      if (result.success) {
        setShowPaymentModal(false);
        router.refresh();
      } else {
        alert("Failed to record payment: " + (result.error || "Unknown error"));
      }
    });
  };

  const handleMarkUnpaid = () => {
    startTransition(async () => {
      await markInvoiceUnpaid(invoiceId);
      router.refresh();
    });
  };

  const handleSendEmail = async () => {
    setIsEmailing(true);
    setEmailStatus("idle");
    try {
      const result = await sendInvoiceEmail(invoiceId, overrideEmail || undefined);
      if (result.success) {
        setEmailStatus("success");
        setOverrideEmail("");
        setShowOverride(false);
        setTimeout(() => setEmailStatus("idle"), 3000);
      } else {
        alert("Failed to send email: " + (result.error || "Unknown error"));
        setEmailStatus("error");
      }
    } catch {
      alert("Error sending email.");
      setEmailStatus("error");
    } finally {
      setIsEmailing(false);
    }
  };

  const handleSendWhatsApp = async () => {
    if (!reminderData) return;
    if (!reminderData.phoneNumber || !reminderData.phoneNumber.trim()) {
      setShowReminderModal(true);
      return;
    }
    setIsSendingWA(true);
    setWaStatus("idle");
    try {
      const res = await sendBillViaWhatsApp(reminderData);
      if (res.sent) {
        setWaStatus("success");
        setTimeout(() => setWaStatus("idle"), 3000);
      } else if (res.needsModal) {
        setShowReminderModal(true);
      } else {
        alert("Failed to send WhatsApp: " + (res.error || "Unknown error"));
        setWaStatus("error");
      }
    } finally {
      setIsSendingWA(false);
    }
  };

  const handleDelete = () => {
    if (!isConfirmingMsg) {
      setIsConfirmingMsg(true);
      return;
    }

    startTransition(async () => {
      try {
        const result = await deleteInvoice(invoiceId);
        if (result && !result.success) {
          alert("Failed to delete: " + result.error);
          return;
        }
        router.push("/invoices");
        router.refresh();
      } catch {
        alert("Error deleting bill.");
      }
    });
  };

  return (
    <>
      {/* Payment Recording Modal */}
      {showPaymentModal && (
        <PaymentModal
          onConfirm={handleMarkPaid}
          onCancel={() => setShowPaymentModal(false)}
          isPending={isPending}
          balanceDue={balanceDue}
        />
      )}

      {/* WhatsApp / SMS Reminder Modal */}
      {showReminderModal && reminderData && (
        <ReminderModal
          data={reminderData}
          isOpen={showReminderModal}
          onClose={() => setShowReminderModal(false)}
          onSent={() => {
            setWaStatus("success");
            setTimeout(() => setWaStatus("idle"), 3000);
          }}
        />
      )}

      {/* Docked Action Bar */}
      <div className="fixed bottom-0 left-0 w-full px-4 py-3 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200/90 dark:border-slate-800 shadow-2xl z-40">
        <div className="max-w-xl mx-auto space-y-2">
          {/* Email Override Input */}
          {showOverride && (
            <div className="bg-white border border-blue-200 rounded-2xl p-3 shadow-xl animate-in slide-in-from-bottom-2 duration-200">
              <label className="text-[10px] uppercase font-bold text-blue-600 tracking-wider mb-1.5 block">
                Recipient Email Override
              </label>
              <div className="flex gap-2">
                <input
                  type="email"
                  placeholder="Enter custom email address..."
                  value={overrideEmail}
                  onChange={(e) => setOverrideEmail(e.target.value)}
                  className="flex-1 bg-blue-50 border border-blue-100 rounded-xl px-3 py-2 text-xs sm:text-sm font-medium focus:outline-none focus:border-blue-400"
                />
                <button
                  onClick={() => { setShowOverride(false); setOverrideEmail(""); }}
                  className="px-3 py-1.5 text-slate-400 hover:text-slate-600 text-xs font-bold"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Main Action Row */}
          <div className="flex gap-2">
            {/* Mark Paid / Re-open */}
            <button
              onClick={isPaid ? handleMarkUnpaid : () => setShowPaymentModal(true)}
              disabled={isPending}
              className={`flex-1 rounded-xl py-3 font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-md transition-all disabled:opacity-60 cursor-pointer ${
                isPaid
                  ? "bg-slate-200 text-slate-700 hover:bg-slate-300 shadow-slate-200/40"
                  : "bg-emerald-600 text-white hover:bg-emerald-500 shadow-emerald-500/25"
              }`}
            >
              {isPending ? (
                <><Loader2 size={16} className="animate-spin" /> ...</>
              ) : isPaid ? (
                <><RotateCcw size={15} /> Re-open</>
              ) : (
                <><CheckCircle2 size={15} /> {isPartial ? "Add Payment" : "Mark Paid"}</>
              )}
            </button>

            {/* WhatsApp 1-Click Button */}
            {reminderData && (
              <button
                onClick={handleSendWhatsApp}
                disabled={isSendingWA}
                className={`px-3 sm:px-4 rounded-xl py-3 font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-md transition-all disabled:opacity-60 cursor-pointer ${
                  waStatus === "success"
                    ? "bg-emerald-100 text-emerald-700 shadow-emerald-200/40"
                    : "bg-[#25D366] hover:bg-[#20ba59] text-white shadow-emerald-500/20"
                }`}
                title="Send bill & QR directly on WhatsApp"
              >
                {isSendingWA ? (
                  <>
                    <Loader2 size={15} className="animate-spin" />
                    <span>Sending…</span>
                  </>
                ) : waStatus === "success" ? (
                  <>
                    <CheckCircle2 size={15} />
                    <span>Sent!</span>
                  </>
                ) : (
                  <>
                    <MessageSquare size={15} />
                    <span>WhatsApp</span>
                  </>
                )}
              </button>
            )}

            {/* Send Email */}
            <div className="flex-1 flex gap-1">
              <button
                onClick={handleSendEmail}
                disabled={isEmailing}
                className={`flex-1 rounded-xl py-3 font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-md transition-all disabled:opacity-60 cursor-pointer ${
                  emailStatus === "success"
                    ? "bg-blue-100 text-blue-700 shadow-blue-200/40"
                    : "bg-blue-600 text-white hover:bg-blue-500 shadow-blue-500/20"
                }`}
              >
                {isEmailing ? (
                  <><Loader2 size={16} className="animate-spin" /> Sending…</>
                ) : emailStatus === "success" ? (
                  <><CheckCircle2 size={15} /> Sent!</>
                ) : (
                  <><Mail size={15} /> Email</>
                )}
              </button>
              {!showOverride && emailStatus !== "success" && (
                <button
                  type="button"
                  aria-label="Send to a different email address"
                  onClick={() => setShowOverride(true)}
                  className="w-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center hover:bg-blue-100 transition-colors cursor-pointer"
                  title="Send to different email"
                >
                  <Send size={14} />
                </button>
              )}
            </div>
          </div>

          {/* Delete Row - Compact */}
          <div className="flex justify-center pt-0.5">
            <button
              onClick={handleDelete}
              disabled={isPending}
              className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all disabled:opacity-60 ${
                isConfirmingMsg
                  ? "bg-red-600 text-white shadow-md shadow-red-500/30 hover:bg-red-500 py-1.5 px-4 font-bold"
                  : "text-red-400 hover:text-red-600 hover:bg-red-50/80"
              }`}
            >
              {isPending && isConfirmingMsg ? (
                <><Loader2 size={12} className="animate-spin" /> Deleting...</>
              ) : isConfirmingMsg ? (
                <><AlertTriangle size={13} /> Click again to confirm delete</>
              ) : (
                <><Trash2 size={12} /> Delete Bill</>
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
