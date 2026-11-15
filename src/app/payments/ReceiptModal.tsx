"use client";

import { useRef } from "react";
import { X, Printer, CheckCircle2, Building2, Calendar, CreditCard, User, Home } from "lucide-react";
import NepaliDate from "nepali-date-converter";
import { PaymentRecord } from "./actions";

interface ReceiptModalProps {
  payment: PaymentRecord;
  onClose: () => void;
}

export default function ReceiptModal({ payment, onClose }: ReceiptModalProps) {
  const receiptRef = useRef<HTMLDivElement>(null);

  const tenant = payment.tenants;
  const tenantName = tenant?.name || "Tenant";
  const roomNo = tenant?.room_no || "N/A";
  const roomSide = tenant?.room_side ? ` (${tenant.room_side})` : "";

  const paymentDate = payment.payment_date || payment.updated_at.slice(0, 10);
  const nepaliDateStr = (() => {
    try {
      return new NepaliDate(new Date(paymentDate)).format("YYYY-MM-DD");
    } catch {
      return "";
    }
  })();

  const billingMonthLabel = (() => {
    try {
      return new NepaliDate(new Date(payment.billing_month + "-15")).format("MMMM YYYY");
    } catch {
      return payment.billing_month;
    }
  })();

  const methodLabel = {
    cash: "Cash",
    esewa: "eSewa",
    bank_transfer: "Bank Transfer",
    cheque: "Cheque",
    other: "Other",
  }[payment.payment_method || "cash"] || "Cash";

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        {/* Top Control Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/80">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Payment Receipt
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-700 hover:bg-teal-600 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            >
              <Printer size={14} aria-hidden="true" />
              Print
            </button>
            <button
              type="button"
              aria-label="Close receipt modal"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-200/60 transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Printable Receipt Paper */}
        <div ref={receiptRef} className="p-6 md:p-8 space-y-6 print:p-0">
          {/* Header */}
          <div className="flex items-start justify-between border-b border-slate-200 pb-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md">
                <Building2 size={22} />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900 leading-tight">
                  Smart Landlord OS
                </h2>
                <p className="text-xs text-slate-500">Official Rent & Utility Receipt</p>
              </div>
            </div>

            <div className="text-right">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                <CheckCircle2 size={12} /> PAID
              </span>
              <p className="text-[10px] text-slate-400 font-mono mt-1">
                Ref: {payment.id.slice(0, 8).toUpperCase()}
              </p>
            </div>
          </div>

          {/* Metadata Grid */}
          <div className="grid grid-cols-2 gap-4 text-xs bg-slate-50 p-4 rounded-2xl border border-slate-100">
            <div>
              <p className="text-slate-400 uppercase text-[10px] font-bold">Tenant</p>
              <p className="font-semibold text-slate-800 flex items-center gap-1 mt-0.5">
                <User size={13} className="text-slate-400" />
                {tenantName}
              </p>
              <p className="text-slate-500 text-[11px] flex items-center gap-1 mt-0.5">
                <Home size={12} className="text-slate-400" />
                Room {roomNo}{roomSide}
              </p>
            </div>

            <div>
              <p className="text-slate-400 uppercase text-[10px] font-bold">Billing Period</p>
              <p className="font-semibold text-slate-800 mt-0.5">{billingMonthLabel}</p>
              <p className="text-slate-500 text-[11px] font-mono mt-0.5">{payment.billing_month}</p>
            </div>

            <div>
              <p className="text-slate-400 uppercase text-[10px] font-bold">Payment Date</p>
              <p className="font-semibold text-slate-800 flex items-center gap-1 mt-0.5">
                <Calendar size={13} className="text-slate-400" />
                {paymentDate}
              </p>
              {nepaliDateStr && (
                <p className="text-slate-500 text-[10px]">BS: {nepaliDateStr}</p>
              )}
            </div>

            <div>
              <p className="text-slate-400 uppercase text-[10px] font-bold">Payment Method</p>
              <p className="font-semibold text-slate-800 flex items-center gap-1 mt-0.5">
                <CreditCard size={13} className="text-slate-400" />
                {methodLabel}
              </p>
            </div>
          </div>

          {/* Notes if any */}
          {payment.payment_notes && (
            <div className="bg-amber-50/60 border border-amber-200/60 rounded-xl p-3 text-xs">
              <span className="font-semibold text-amber-900">Notes / Reference: </span>
              <span className="text-amber-800">{payment.payment_notes}</span>
            </div>
          )}

          {/* Amount Box */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white p-5 rounded-2xl flex items-center justify-between shadow-md">
            <div>
              <p className="text-xs uppercase font-medium text-slate-400">Total Amount Paid</p>
              <p className="text-xs text-slate-400">Rent & Utility settlement</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-black font-mono tracking-tight">
                Rs. {Number(payment.total_due).toLocaleString()}
              </p>
              <p className="text-[10px] text-emerald-400 font-semibold uppercase tracking-wider">
                Full Settlement
              </p>
            </div>
          </div>

          {/* Signoff */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
            <div>
              <p>Generated automatically</p>
              <p className="text-[10px]">Smart Landlord Management System</p>
            </div>
            <div className="text-right">
              <div className="w-24 border-b border-slate-300 mb-1"></div>
              <p className="text-[10px]">Landlord Signature</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 text-xs font-semibold transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
