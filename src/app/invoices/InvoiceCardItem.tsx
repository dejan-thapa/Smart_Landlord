"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronRight, MessageSquare, Mail, CheckCircle2, Clock, Loader2 } from "lucide-react";
import ReminderModal from "@/components/ReminderModal";
import { InvoiceReminderData } from "@/lib/reminder-utils";
import { sendBillViaWhatsApp } from "@/lib/bill-image";
import { getInvoicePreviousBalance, type InvoiceWithTenant } from "@/lib/types";

function StatusBadge({ status, emailedAt }: { status: string; emailedAt?: string | null }) {
  return (
    <div className="flex items-center gap-2">
      {status === "paid" ? (
        <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-700 text-xs font-bold px-2 py-1 rounded-full">
          <CheckCircle2 size={12} /> Paid
        </span>
      ) : (
        <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-700 text-xs font-bold px-2 py-1 rounded-full">
          <Clock size={12} /> Unpaid
        </span>
      )}
      {emailedAt && (
        <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-600 text-[10px] font-bold px-1.5 py-0.5 rounded border border-blue-100">
          <Mail size={10} /> Emailed
        </span>
      )}
    </div>
  );
}

export default function InvoiceCardItem({ inv }: { inv: InvoiceWithTenant }) {
  const [showReminder, setShowReminder] = useState(false);
  const [isSendingWA, setIsSendingWA] = useState(false);
  const [waSent, setWaSent] = useState(false);

  const tenant = inv.tenants;
  const isUnpaid = inv.payment_status === "unpaid";
  const previousBalance = getInvoicePreviousBalance(inv);

  const reminderData: InvoiceReminderData = {
    tenantName: tenant?.name || "",
    roomNo: tenant?.room_no || "",
    roomSide: tenant?.room_side || "",
    phoneNumber: tenant?.phone_number || "",
    billingMonth: inv.billing_month,
    totalDue: Number(inv.total_due),
    rentAmount: Number(inv.rent_amount),
    electricityCost: Number(inv.electricity_cost),
    waterShare: Number(inv.water_share),
    wifiShare: Number(inv.wifi_share),
    garbageShare: Number(inv.garbage_share),
    previousBalance: previousBalance,
  };

  return (
    <>
      <div className="bg-white border border-slate-200 shadow-xs rounded-2xl p-4 hover:border-purple-300 hover:shadow-md transition-all group relative">
        <div className="flex items-start justify-between gap-3">
          <Link href={`/invoices/${inv.id}`} className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <p className="font-bold text-slate-900 truncate">
                {tenant?.name || `Room ${tenant?.room_no} Tenant`}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 font-medium">Room {tenant?.room_no}</span>
              <StatusBadge status={inv.payment_status} emailedAt={inv.last_emailed_at} />
            </div>
          </Link>

          <div className="flex items-center gap-2 shrink-0">
            {/* Quick 1-Click WhatsApp Reminder Button for Unpaid Invoices */}
            {isUnpaid && (
              <button
                type="button"
                disabled={isSendingWA}
                aria-label={`Send WhatsApp bill for Room ${tenant?.room_no}`}
                onClick={async (e) => {
                  e.stopPropagation();
                  if (!tenant?.phone_number || !tenant.phone_number.trim()) {
                    setShowReminder(true);
                    return;
                  }
                  setIsSendingWA(true);
                  try {
                    const res = await sendBillViaWhatsApp(reminderData);
                    if (res.sent) {
                      setWaSent(true);
                      setTimeout(() => setWaSent(false), 3000);
                    } else if (res.needsModal) {
                      setShowReminder(true);
                    } else {
                      alert("Failed to send WhatsApp: " + (res.error || "Unknown error"));
                    }
                  } finally {
                    setIsSendingWA(false);
                  }
                }}
                className={`p-2.5 rounded-xl border shadow-xs transition-colors cursor-pointer disabled:opacity-60 ${
                  waSent
                    ? "bg-emerald-600 text-white border-emerald-600"
                    : "bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200/60"
                }`}
                title="Send bill & QR on WhatsApp"
              >
                {isSendingWA ? (
                  <Loader2 size={15} className="animate-spin" />
                ) : waSent ? (
                  <CheckCircle2 size={15} />
                ) : (
                  <MessageSquare size={15} />
                )}
              </button>
            )}

            <Link href={`/invoices/${inv.id}`} className="text-right flex items-center gap-2">
              <div>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Total Due</p>
                <p className="text-lg font-bold font-mono text-slate-900">
                  Rs.{Number(inv.total_due).toLocaleString()}
                </p>
                {previousBalance > 0 && (
                  <p className="text-[10px] font-bold text-amber-700 bg-amber-50 px-1 py-0.2 rounded border border-amber-200/70 inline-block mt-0.5">
                    +Rs.{previousBalance.toLocaleString()} Arrears
                  </p>
                )}
              </div>
              <ChevronRight size={18} aria-hidden="true" className="text-slate-300 group-hover:text-teal-500 transition-colors" />
            </Link>
          </div>
        </div>

        {/* Cost breakdown strip */}
        <Link href={`/invoices/${inv.id}`} className="mt-3 pt-3 border-t border-slate-100 grid grid-cols-4 gap-2 text-center block">
          {[
            { label: "Rent", value: inv.rent_amount },
            { label: "Elec.", value: inv.electricity_cost },
            { label: "Water", value: inv.water_share },
            { label: "WiFi+G", value: Number(inv.wifi_share) + Number(inv.garbage_share) },
          ].map((item) => (
            <div key={item.label}>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">{item.label}</p>
              <p className="text-xs font-bold text-slate-700 font-mono">{Number(item.value).toLocaleString()}</p>
            </div>
          ))}
        </Link>
      </div>

      {/* Reminder Modal */}
      {showReminder && (
        <ReminderModal
          data={reminderData}
          isOpen={showReminder}
          onClose={() => setShowReminder(false)}
          onSent={() => {
            setWaSent(true);
            setTimeout(() => setWaSent(false), 3000);
          }}
        />
      )}
    </>
  );
}
