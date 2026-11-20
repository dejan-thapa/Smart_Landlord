"use client";

import { useState, useMemo, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CreditCard,
  CheckCircle2,
  Clock,
  Search,
  Download,
  Printer,
  Wallet,
  RotateCcw,
  ExternalLink,
  Check,
  Building2,
  FileText,
  Loader2,
  X,
  Banknote,
  MessageSquare,
} from "lucide-react";
import NepaliDate from "nepali-date-converter";
import MonthSelector from "@/components/MonthSelector";
import ReceiptModal from "./ReceiptModal";
import ReminderModal from "@/components/ReminderModal";
import { InvoiceReminderData } from "@/lib/reminder-utils";
import { sendBillViaWhatsApp } from "@/lib/bill-image";
import { getInvoicePreviousBalance, getInvoiceAmountPaid, getInvoiceBalance } from "@/lib/types";
import { PaymentRecord, recordPaymentAction, revertPaymentAction } from "./actions";

function formatNepaliMonthLabel(billingMonth: string): string {
  try {
    return new NepaliDate(new Date(billingMonth + "-15")).format("MMMM YYYY");
  } catch {
    return billingMonth;
  }
}

function formatNepaliDate(dateStr: string): string {
  if (!dateStr) return "";
  try {
    return new NepaliDate(new Date(dateStr)).format("YYYY-MM-DD");
  } catch {
    return "";
  }
}

function compareRoomAsc(a: PaymentRecord, b: PaymentRecord): number {
  const roomA = a.tenants?.room_no || "";
  const roomB = b.tenants?.room_no || "";
  const numA = parseInt((roomA.match(/\d+/) || [""])[0], 10);
  const numB = parseInt((roomB.match(/\d+/) || [""])[0], 10);
  if (!isNaN(numA) && !isNaN(numB) && numA !== numB) return numA - numB;
  const sideA = a.tenants?.room_side || "";
  const sideB = b.tenants?.room_side || "";
  return (
    roomA.localeCompare(roomB, undefined, { numeric: true, sensitivity: "base" }) ||
    sideA.localeCompare(sideB)
  );
}

function PaymentMethodBadge({ method }: { method: PaymentRecord["payment_method"] }) {
  const badgeClass =
    method === "esewa"
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : method === "bank_transfer"
      ? "bg-blue-50 text-blue-700 border-blue-200"
      : method === "cash"
      ? "bg-green-50 text-green-700 border-green-200"
      : method === "cheque"
      ? "bg-purple-50 text-purple-700 border-purple-200"
      : "bg-slate-100 text-slate-700 border-slate-200";

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border whitespace-nowrap ${badgeClass}`}>
      {method === "esewa" ? (
        <CreditCard size={12} />
      ) : method === "cash" ? (
        <Banknote size={12} />
      ) : method === "bank_transfer" ? (
        <Building2 size={12} />
      ) : (
        <Wallet size={12} />
      )}
      {method ? method.replace("_", " ").toUpperCase() : "CASH"}
    </span>
  );
}

interface PaymentsViewProps {
  initialPayments: PaymentRecord[];
  month: string;
}

export default function PaymentsView({ initialPayments, month }: PaymentsViewProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  const [searchQuery, setSearchQuery] = useState("");
  const [methodFilter, setMethodFilter] = useState<string>("all");
  const [statusTab, setStatusTab] = useState<"all" | "paid" | "unpaid">("paid");
  const [selectedReceipt, setSelectedReceipt] = useState<PaymentRecord | null>(null);

  // Quick Payment Modal State
  const [recordingInvoice, setRecordingInvoice] = useState<PaymentRecord | null>(null);
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().slice(0, 10));
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "esewa" | "bank_transfer" | "cheque" | "other">("cash");
  const [paymentNotes, setPaymentNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Revert Confirmation State
  const [revertingId, setRevertingId] = useState<string | null>(null);

  // WhatsApp Reminder State
  const [selectedReminder, setSelectedReminder] = useState<InvoiceReminderData | null>(null);
  const [sendingWaId, setSendingWaId] = useState<string | null>(null);
  const [sentWaId, setSentWaId] = useState<string | null>(null);

  const monthLabel = month === "all" ? "All Time" : formatNepaliMonthLabel(month);

  // Filtered & sorted payments (unpaid sorted serially by room number)
  const filteredPayments = useMemo(() => {
    const filtered = initialPayments.filter((p) => {
      if (statusTab === "paid" && p.payment_status !== "paid") return false;
      if (statusTab === "unpaid" && p.payment_status !== "unpaid") return false;
      if (methodFilter !== "all" && p.payment_method !== methodFilter) return false;

      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const tenantName = p.tenants?.name?.toLowerCase() || "";
        const roomNo = p.tenants?.room_no?.toLowerCase() || "";
        const notes = p.payment_notes?.toLowerCase() || "";
        const id = p.id.toLowerCase();
        return (
          tenantName.includes(query) ||
          roomNo.includes(query) ||
          notes.includes(query) ||
          id.includes(query)
        );
      }

      return true;
    });

    if (statusTab === "unpaid") {
      return [...filtered].sort(compareRoomAsc);
    }
    return filtered;
  }, [initialPayments, statusTab, methodFilter, searchQuery]);

  // Statistics
  const stats = useMemo(() => {
    const paidList = initialPayments.filter((p) => p.payment_status === "paid");
    const unpaidList = initialPayments.filter((p) => p.payment_status === "unpaid");

    // Collected = money actually received (includes partial payments on unpaid bills)
    const totalCollected = initialPayments.reduce((sum, p) => sum + getInvoiceAmountPaid(p), 0);
    const totalOutstanding = unpaidList.reduce((sum, p) => sum + getInvoiceBalance(p), 0);
    const totalBilled = totalCollected + totalOutstanding;
    const collectionRate = totalBilled > 0 ? Math.round((totalCollected / totalBilled) * 100) : 0;

    // Method breakdowns
    const byMethod = initialPayments.filter((p) => getInvoiceAmountPaid(p) > 0).reduce((acc, p) => {
      const m = p.payment_method || "cash";
      acc[m] = (acc[m] || 0) + getInvoiceAmountPaid(p);
      return acc;
    }, {} as Record<string, number>);

    const digitalTotal = (byMethod.esewa || 0) + (byMethod.bank_transfer || 0);
    const digitalPercent = totalCollected > 0 ? Math.round((digitalTotal / totalCollected) * 100) : 0;

    return {
      totalCollected,
      totalOutstanding,
      totalBilled,
      collectionRate,
      paidCount: paidList.length,
      unpaidCount: unpaidList.length,
      byMethod,
      digitalPercent,
    };
  }, [initialPayments]);

  // Handle Export CSV
  const handleExportCSV = () => {
    const headers = [
      "Bill ID",
      "Billing Month",
      "Tenant Name",
      "Room No",
      "Amount (NPR)",
      "Status",
      "Payment Date",
      "Payment Method",
      "Notes",
    ];

    const rows = filteredPayments.map((p) => [
      p.id,
      p.billing_month,
      `"${p.tenants?.name || "Tenant"}"`,
      `"${p.tenants?.room_no || ""}${p.tenants?.room_side ? ` (${p.tenants.room_side})` : ""}"`,
      p.total_due,
      p.payment_status.toUpperCase(),
      p.payment_date || "",
      p.payment_method || "",
      `"${(p.payment_notes || "").replace(/"/g, '""')}"`,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `payment_ledger_${month}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Handle Quick Record Payment
  const handleRecordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recordingInvoice) return;

    setIsSubmitting(true);
    const res = await recordPaymentAction(recordingInvoice.id, {
      payment_date: paymentDate,
      payment_method: paymentMethod,
      payment_notes: paymentNotes,
    });
    setIsSubmitting(false);

    if (res.success) {
      setRecordingInvoice(null);
      setPaymentNotes("");
      startTransition(() => {
        router.refresh();
      });
    } else {
      alert("Error recording payment: " + res.error);
    }
  };

  // Handle Revert Payment
  const handleRevert = async (id: string) => {
    if (!confirm("Are you sure you want to revert this payment to Unpaid?")) return;
    setRevertingId(id);
    const res = await revertPaymentAction(id);
    setRevertingId(null);
    if (res.success) {
      startTransition(() => {
        router.refresh();
      });
    } else {
      alert("Error reverting payment: " + res.error);
    }
  };

  const openRecordModal = (payment: PaymentRecord) => {
    setRecordingInvoice(payment);
    setPaymentDate(new Date().toISOString().slice(0, 10));
    setPaymentMethod("cash");
    setPaymentNotes("");
  };

  const handleSendWhatsApp = async (payment: PaymentRecord) => {
    const rentAmount = Number(payment.rent_amount || 0);
    const electricityCost = Number(payment.electricity_cost || 0);
    const waterShare = Number(payment.water_share || payment.waste_water_cost || 0);
    const wifiShare = Number(payment.wifi_share || 0);
    const garbageShare = Number(payment.garbage_share || 0);
    const payload: InvoiceReminderData = {
      tenantName: payment.tenants?.name || "",
      roomNo: payment.tenants?.room_no || "",
      roomSide: payment.tenants?.room_side || "",
      phoneNumber: payment.tenants?.phone_number || "",
      billingMonth: payment.billing_month,
      totalDue: Number(payment.total_due),
      rentAmount,
      electricityCost,
      waterShare,
      wifiShare,
      garbageShare,
      previousBalance: getInvoicePreviousBalance({
        total_due: Number(payment.total_due || 0),
        rent_amount: rentAmount,
        electricity_cost: electricityCost,
        water_share: waterShare,
        wifi_share: wifiShare,
        garbage_share: garbageShare,
      }),
    };
    setSendingWaId(payment.id);
    try {
      const res = await sendBillViaWhatsApp(payload);
      if (res.sent) {
        setSentWaId(payment.id);
        setTimeout(() => setSentWaId((curr) => (curr === payment.id ? null : curr)), 3000);
      } else if (res.needsModal) {
        setSelectedReminder(payload);
      } else {
        alert("Failed to send WhatsApp: " + (res.error || "Unknown error"));
      }
    } finally {
      setSendingWaId(null);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-6 pb-20">
      {/* Header Bar */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-3 md:gap-4 mb-5 md:mb-8 pt-1 md:pt-2">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
              <CreditCard size={20} />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                Payment Ledger
              </h1>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Audit log of collected rental income, transaction history & receipts
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Month selector */}
          <MonthSelector currentMonth={month === "all" ? new Date().toISOString().slice(0, 7) : month} basePath="/payments" />
          
          {/* All Time toggle */}
          <Link
            href={month === "all" ? `/payments?month=${new Date().toISOString().slice(0, 7)}` : "/payments?month=all"}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition-all border ${
              month === "all"
                ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
            }`}
          >
            {month === "all" ? "Viewing All Time" : "All Time"}
          </Link>

          {/* Export CSV */}
          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            title="Download CSV Spreadsheet"
          >
            <Download size={14} className="text-slate-500" />
            Export CSV
          </button>
        </div>
      </header>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6">
        {/* Total Collected */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 md:p-5 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Total Collected
            </span>
            <span className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 size={16} />
            </span>
          </div>
          <p className="text-xl md:text-2xl font-black text-slate-900 font-mono">
            Rs. {stats.totalCollected.toLocaleString()}
          </p>
          <div className="flex items-center gap-1.5 mt-2">
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-emerald-100 text-emerald-700">
              {stats.collectionRate}%
            </span>
            <span className="text-[11px] text-slate-500 font-medium">of billed amount</span>
          </div>
        </div>

        {/* Outstanding Receivables */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 md:p-5 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Outstanding Due
            </span>
            <span className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock size={16} />
            </span>
          </div>
          <p className="text-xl md:text-2xl font-black text-amber-600 font-mono">
            Rs. {stats.totalOutstanding.toLocaleString()}
          </p>
          <p className="text-[11px] text-slate-500 font-medium mt-2">
            {stats.unpaidCount} unpaid bill{stats.unpaidCount === 1 ? "" : "s"}
          </p>
        </div>

        {/* Digital Collection Share */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 md:p-5 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Digital vs Cash
            </span>
            <span className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <CreditCard size={16} />
            </span>
          </div>
          <p className="text-xl md:text-2xl font-black text-slate-900 font-mono">
            {stats.digitalPercent}% Digital
          </p>
          <p className="text-[11px] text-slate-500 font-medium mt-2">
            {100 - stats.digitalPercent}% Cash payments
          </p>
        </div>

        {/* Verified Receipts */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 md:p-5 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Recorded Receipts
            </span>
            <span className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <FileText size={16} />
            </span>
          </div>
          <p className="text-xl md:text-2xl font-black text-slate-900 font-mono">
            {stats.paidCount} Receipts
          </p>
          <p className="text-[11px] text-slate-500 font-medium mt-2">
            {monthLabel} period
          </p>
        </div>
      </div>

      {/* Method Summary Bar (compact grid on mobile, inline flex on desktop) */}
      <div className="bg-slate-900 text-white rounded-2xl p-3 md:p-4 mb-4 md:mb-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-2.5 md:gap-4">
        <div className="flex items-center gap-2">
          <Wallet size={15} className="text-blue-400 shrink-0" />
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-300">
            Payment Method Split
          </span>
        </div>
        <div className="grid grid-cols-3 md:flex md:flex-wrap items-center gap-2 md:gap-3 text-xs">
          <div className="flex flex-col md:flex-row md:items-center gap-0.5 md:gap-1.5 bg-slate-800/80 px-2.5 py-1.5 rounded-xl border border-slate-700/80">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0"></span>
              <span className="text-slate-300 font-medium text-[11px]">eSewa</span>
            </div>
            <span className="font-bold font-mono text-xs">Rs. {(stats.byMethod.esewa || 0).toLocaleString()}</span>
          </div>
          <div className="flex flex-col md:flex-row md:items-center gap-0.5 md:gap-1.5 bg-slate-800/80 px-2.5 py-1.5 rounded-xl border border-slate-700/80">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-green-400 shrink-0"></span>
              <span className="text-slate-300 font-medium text-[11px]">Cash</span>
            </div>
            <span className="font-bold font-mono text-xs">Rs. {(stats.byMethod.cash || 0).toLocaleString()}</span>
          </div>
          <div className="flex flex-col md:flex-row md:items-center gap-0.5 md:gap-1.5 bg-slate-800/80 px-2.5 py-1.5 rounded-xl border border-slate-700/80">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-blue-400 shrink-0"></span>
              <span className="text-slate-300 font-medium text-[11px]">Bank</span>
            </div>
            <span className="font-bold font-mono text-xs">Rs. {(stats.byMethod.bank_transfer || 0).toLocaleString()}</span>
          </div>
          {(stats.byMethod.cheque || 0) > 0 && (
            <div className="flex items-center gap-1.5 bg-slate-800/80 px-2.5 py-1.5 rounded-xl border border-slate-700/80 col-span-3 md:col-span-1">
              <span className="w-2 h-2 rounded-full bg-purple-400 shrink-0"></span>
              <span className="text-slate-300 font-medium">Cheque:</span>
              <span className="font-bold font-mono">Rs. {(stats.byMethod.cheque || 0).toLocaleString()}</span>
            </div>
          )}
        </div>
      </div>

      {/* Control Filter Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-3.5 md:p-4 mb-4 md:mb-6 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3 md:gap-4">
        {/* Status Tabs */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl w-full md:w-auto">
          <button
            type="button"
            onClick={() => setStatusTab("paid")}
            className={`flex-1 md:flex-initial px-3 md:px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              statusTab === "paid"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Paid ({initialPayments.filter((p) => p.payment_status === "paid").length})
          </button>
          <button
            type="button"
            onClick={() => setStatusTab("unpaid")}
            className={`flex-1 md:flex-initial px-3 md:px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              statusTab === "unpaid"
                ? "bg-white text-amber-700 shadow-xs"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Unpaid ({initialPayments.filter((p) => p.payment_status === "unpaid").length})
          </button>
          <button
            type="button"
            onClick={() => setStatusTab("all")}
            className={`flex-1 md:flex-initial px-3 md:px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              statusTab === "all"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            All ({initialPayments.length})
          </button>
        </div>

        {/* Search & Method Pill Filters */}
        <div className="flex flex-col sm:flex-row items-center gap-2.5 sm:gap-3 w-full md:w-auto">
          {/* Search Input */}
          <div className="relative w-full sm:w-60">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search tenant, room, notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
            {searchQuery && (
              <button
                type="button"
                aria-label="Clear search"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* Method Select */}
          <select
            value={methodFilter}
            onChange={(e) => setMethodFilter(e.target.value)}
            aria-label="Filter by payment method"
            className="w-full sm:w-auto text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 font-semibold focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="all">All Methods</option>
            <option value="esewa">eSewa</option>
            <option value="cash">Cash</option>
            <option value="bank_transfer">Bank Transfer</option>
            <option value="cheque">Cheque</option>
            <option value="other">Other</option>
          </select>
        </div>
      </div>

      {/* Ledger Cards (Mobile) & Table (Desktop) */}
      <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-xs">
        {filteredPayments.length === 0 ? (
          <div className="text-center py-16 px-4">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
              <CreditCard size={24} />
            </div>
            <h3 className="text-base font-bold text-slate-800">No payment records found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
              {searchQuery || methodFilter !== "all"
                ? "Try clearing filters or search term to see more transactions."
                : `No payments recorded for ${monthLabel}. When you mark bills as paid, they will appear here.`}
            </p>
          </div>
        ) : (
          <>
            {/* Mobile Card List (avoids horizontal cutoff & squished columns) */}
            <div className="md:hidden divide-y divide-slate-100">
              {filteredPayments.map((payment) => {
                const isPaid = payment.payment_status === "paid";
                const tenant = payment.tenants;
                const dateStr = payment.payment_date || (payment.updated_at ? payment.updated_at.slice(0, 10) : "");
                const billingLabel = formatNepaliMonthLabel(payment.billing_month);

                return (
                  <div key={payment.id} className="p-4 space-y-3">
                    {/* Top row: Tenant & Room on left, Amount prominently on right */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-bold text-sm text-slate-900 truncate">
                          {tenant?.name || "Tenant"}
                        </p>
                        <div className="flex flex-wrap items-center gap-1.5 mt-1">
                          <span className="inline-block px-2 py-0.5 bg-slate-100 rounded-md text-slate-700 font-mono font-semibold text-xs whitespace-nowrap">
                            Room {tenant?.room_no || "N/A"}{tenant?.room_side ? ` · ${tenant.room_side}` : ""}
                          </span>
                          {isPaid ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 whitespace-nowrap">
                              <CheckCircle2 size={11} /> Paid
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200 whitespace-nowrap">
                              <Clock size={11} /> Unpaid
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-black font-mono text-base text-slate-900 whitespace-nowrap">
                          Rs. {Number(payment.total_due).toLocaleString()}
                        </p>
                        <p className="text-xs text-slate-400 font-medium whitespace-nowrap">
                          {billingLabel}
                        </p>
                      </div>
                    </div>

                    {/* Paid metadata & notes */}
                    {(isPaid || payment.payment_notes) && (
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                        {isPaid && (
                          <div className="flex items-center gap-2">
                            <PaymentMethodBadge method={payment.payment_method} />
                            <span className="font-mono text-slate-600">
                              {dateStr || "Recorded"}
                            </span>
                          </div>
                        )}
                        {payment.payment_notes && (
                          <p className="text-xs text-slate-500 truncate max-w-full">
                            {payment.payment_notes}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Touch-friendly Action Bar */}
                    <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                      {isPaid ? (
                        <>
                          <button
                            type="button"
                            onClick={() => setSelectedReceipt(payment)}
                            className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
                          >
                            <Printer size={14} />
                            Receipt
                          </button>
                          <Link
                            href={`/invoices/${payment.id}`}
                            aria-label={`Open full bill for Room ${payment.tenants?.room_no}`}
                            className="inline-flex items-center justify-center gap-1 px-3 py-2 rounded-xl border border-slate-200 text-slate-600 hover:text-teal-600 text-xs font-semibold transition-colors"
                          >
                            <ExternalLink size={14} />
                            Bill
                          </Link>
                          <button
                            type="button"
                            aria-label={`Revert payment for Room ${payment.tenants?.room_no} to unpaid`}
                            onClick={() => handleRevert(payment.id)}
                            disabled={revertingId === payment.id}
                            className="p-2 rounded-xl border border-slate-200 text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                            title="Revert to Unpaid"
                          >
                            {revertingId === payment.id ? (
                              <Loader2 size={14} className="animate-spin text-rose-500" />
                            ) : (
                              <RotateCcw size={14} />
                            )}
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => openRecordModal(payment)}
                            className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
                          >
                            <Check size={14} aria-hidden="true" />
                            Record Payment
                          </button>
                          <button
                            type="button"
                            disabled={sendingWaId === payment.id}
                            aria-label={`Send WhatsApp bill for Room ${payment.tenants?.room_no}`}
                            onClick={() => handleSendWhatsApp(payment)}
                            className={`inline-flex items-center justify-center gap-1 px-3 py-2.5 rounded-xl border text-xs font-bold transition-colors cursor-pointer disabled:opacity-60 ${
                              sentWaId === payment.id
                                ? "bg-emerald-600 text-white border-emerald-600"
                                : "bg-emerald-50 text-emerald-700 border-emerald-200/70 hover:bg-emerald-100"
                            }`}
                            title="Send bill & QR on WhatsApp"
                          >
                            {sendingWaId === payment.id ? (
                              <Loader2 size={14} className="animate-spin" />
                            ) : sentWaId === payment.id ? (
                              <CheckCircle2 size={14} />
                            ) : (
                              <MessageSquare size={14} />
                            )}
                          </button>
                          <Link
                            href={`/invoices/${payment.id}`}
                            aria-label={`Open full bill for Room ${payment.tenants?.room_no}`}
                            className="p-2.5 rounded-xl border border-slate-200 text-slate-500 hover:text-teal-600 transition-colors"
                            title="Open full bill"
                          >
                            <ExternalLink size={14} />
                          </Link>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80 dark:bg-slate-800/80 text-[11px] font-black uppercase tracking-wider text-slate-500">
                    <th className="py-3.5 px-4 md:px-6">Status / Date</th>
                    <th className="py-3.5 px-4">Tenant / Room</th>
                    <th className="py-3.5 px-4">Billing Month</th>
                    <th className="py-3.5 px-4">Method</th>
                    <th className="py-3.5 px-4 text-right">Amount (NPR)</th>
                    <th className="py-3.5 px-4">Notes</th>
                    <th className="py-3.5 px-4 md:px-6 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredPayments.map((payment) => {
                    const isPaid = payment.payment_status === "paid";
                    const tenant = payment.tenants;
                    const dateStr = payment.payment_date || (payment.updated_at ? payment.updated_at.slice(0, 10) : "");
                    const nepaliDateStr = formatNepaliDate(dateStr);
                    const billingLabel = formatNepaliMonthLabel(payment.billing_month);

                    return (
                      <tr
                        key={payment.id}
                        className="hover:bg-slate-50/80 transition-colors group"
                      >
                        {/* Status / Date Paid */}
                        <td className="py-4 px-4 md:px-6 font-medium text-slate-900 whitespace-nowrap">
                          {isPaid ? (
                            <div>
                              <span className="font-semibold text-slate-900">{dateStr || "Recorded"}</span>
                              {nepaliDateStr && (
                                <p className="text-[10px] text-slate-400 font-mono">BS: {nepaliDateStr}</p>
                              )}
                            </div>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                              <Clock size={11} /> Unpaid
                            </span>
                          )}
                        </td>

                        {/* Tenant / Room */}
                        <td className="py-4 px-4 whitespace-nowrap">
                          <div className="font-bold text-slate-900">
                            {tenant?.name || "Tenant"}
                          </div>
                          <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                            <span className="inline-block px-1.5 py-0.5 bg-slate-100 rounded text-slate-700 font-mono font-medium whitespace-nowrap">
                              Room {tenant?.room_no || "N/A"}{tenant?.room_side ? ` (${tenant.room_side})` : ""}
                            </span>
                          </div>
                        </td>

                        {/* Billing Month */}
                        <td className="py-4 px-4 whitespace-nowrap">
                          <span className="text-slate-800 font-medium">{billingLabel}</span>
                          <p className="text-[10px] text-slate-400 font-mono">{payment.billing_month}</p>
                        </td>

                        {/* Payment Method Badge */}
                        <td className="py-4 px-4 whitespace-nowrap">
                          {isPaid ? (
                            <PaymentMethodBadge method={payment.payment_method} />
                          ) : (
                            <span className="text-slate-400 text-xs italic">—</span>
                          )}
                        </td>

                        {/* Total Due / Paid */}
                        <td className="py-4 px-4 text-right whitespace-nowrap">
                          <span className="font-black font-mono text-sm text-slate-900">
                            Rs. {Number(payment.total_due).toLocaleString()}
                          </span>
                        </td>

                        {/* Notes / Reference */}
                        <td className="py-4 px-4 max-w-[200px]">
                          {payment.payment_notes ? (
                            <span className="text-slate-600 text-xs truncate block" title={payment.payment_notes}>
                              {payment.payment_notes}
                            </span>
                          ) : (
                            <span className="text-slate-300 text-xs">—</span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="py-4 px-4 md:px-6 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1.5">
                            {isPaid ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => setSelectedReceipt(payment)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
                                  title="View & Print Official Receipt"
                                >
                                  <Printer size={13} />
                                  Receipt
                                </button>

                                <Link
                                  href={`/invoices/${payment.id}`}
                                  aria-label={`Open full bill for Room ${payment.tenants?.room_no}`}
                                  className="p-2 rounded-lg text-slate-400 hover:text-teal-600 hover:bg-teal-50 transition-colors"
                                  title="Open full bill"
                                >
                                  <ExternalLink size={14} />
                                </Link>

                                <button
                                  type="button"
                                  aria-label={`Revert payment for Room ${payment.tenants?.room_no} to unpaid`}
                                  onClick={() => handleRevert(payment.id)}
                                  disabled={revertingId === payment.id}
                                  className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                                  title="Revert to Unpaid"
                                >
                                  {revertingId === payment.id ? (
                                    <Loader2 size={14} className="animate-spin text-rose-500" />
                                  ) : (
                                    <RotateCcw size={14} />
                                  )}
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  type="button"
                                  onClick={() => openRecordModal(payment)}
                                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
                                >
                                  <Check size={13} aria-hidden="true" />
                                  Record Payment
                                </button>

                                <button
                                  type="button"
                                  disabled={sendingWaId === payment.id}
                                  aria-label={`Send WhatsApp bill for Room ${payment.tenants?.room_no}`}
                                  onClick={() => handleSendWhatsApp(payment)}
                                  className={`p-2 rounded-lg transition-colors cursor-pointer disabled:opacity-60 ${
                                    sentWaId === payment.id
                                      ? "bg-emerald-600 text-white"
                                      : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                                  }`}
                                  title="Send bill & QR on WhatsApp"
                                >
                                  {sendingWaId === payment.id ? (
                                    <Loader2 size={14} className="animate-spin" />
                                  ) : sentWaId === payment.id ? (
                                    <CheckCircle2 size={14} />
                                  ) : (
                                    <MessageSquare size={14} />
                                  )}
                                </button>

                                <Link
                                  href={`/invoices/${payment.id}`}
                                  aria-label={`Open full bill for Room ${payment.tenants?.room_no}`}
                                  className="p-2 rounded-lg text-slate-400 hover:text-teal-600 hover:bg-teal-50 transition-colors"
                                  title="Open full bill"
                                >
                                  <ExternalLink size={14} />
                                </Link>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Official Receipt Modal */}
      {selectedReceipt && (
        <ReceiptModal
          payment={selectedReceipt}
          onClose={() => setSelectedReceipt(null)}
        />
      )}

      {/* WhatsApp / SMS Reminder Modal */}
      {selectedReminder && (
        <ReminderModal
          data={selectedReminder}
          isOpen={Boolean(selectedReminder)}
          onClose={() => setSelectedReminder(null)}
        />
      )}

      {/* Quick Record Payment Modal */}
      {recordingInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <Banknote size={18} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Record Rent Payment</h3>
                  <p className="text-xs text-slate-500">
                    Room {recordingInvoice.tenants?.room_no} • {recordingInvoice.tenants?.name || "Tenant"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                aria-label="Close payment modal"
                onClick={() => setRecordingInvoice(null)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleRecordSubmit} className="mt-4 space-y-4">
              {/* Due Amount info */}
              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 flex items-center justify-between">
                <span className="text-xs text-slate-500 font-medium">Total Amount Due</span>
                <span className="text-base font-black font-mono text-slate-900">
                  Rs. {Number(recordingInvoice.total_due).toLocaleString()}
                </span>
              </div>

              {/* Payment Date */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Payment Date Received
                </label>
                <input
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  required
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-xl bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              {/* Payment Method Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Payment Method
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {([
                    { id: "cash", label: "Cash", icon: Banknote },
                    { id: "esewa", label: "eSewa", icon: CreditCard },
                    { id: "bank_transfer", label: "Bank Transfer", icon: Building2 },
                    { id: "cheque", label: "Cheque", icon: FileText },
                  ] as const).map((m) => {
                    const Icon = m.icon;
                    const isSelected = paymentMethod === m.id;
                    return (
                      <button
                        type="button"
                        key={m.id}
                        onClick={() => setPaymentMethod(m.id)}
                        className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                          isSelected
                            ? "bg-emerald-50 border-emerald-500 text-emerald-800 shadow-xs"
                            : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        <Icon size={14} className={isSelected ? "text-emerald-600" : "text-slate-400"} />
                        <span>{m.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Notes / Reference ID (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. eSewa Txn #928374 or Cash handed to landlord"
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-xl bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setRecordingInvoice(null)}
                  className="px-4 py-2 rounded-xl text-slate-600 text-xs font-semibold hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-500/20 disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Check size={14} />
                      Confirm & Save Payment
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
