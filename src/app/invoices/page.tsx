import Link from "next/link";
import { ArrowLeft, FileText } from "lucide-react";
import { fetchInvoices } from "./invoice-actions";
import NepaliDate from "nepali-date-converter";
import BulkEmailButton from "./BulkEmailButton";
import MonthSelector from "@/components/MonthSelector";
import InvoiceCardItem from "./InvoiceCardItem";
import { getInvoiceAmountPaid, type InvoiceWithTenant } from "@/lib/types";

export const dynamic = "force-dynamic";

function normalizeSide(side?: string | null): "Side A" | "Side B" | "Other" {
  if (!side) return "Other";
  const s = side.trim().toLowerCase();
  if (s === "side a" || s === "a" || s === "side_a") return "Side A";
  if (s === "side b" || s === "b" || s === "side_b") return "Side B";
  return "Other";
}

function sortInvoicesByRoomAsc(invoices: InvoiceWithTenant[]): InvoiceWithTenant[] {
  return [...invoices].sort((a, b) => {
    const roomA = a.tenants?.room_no || "";
    const roomB = b.tenants?.room_no || "";
    const numA = parseInt((roomA.match(/\d+/) || [""])[0], 10);
    const numB = parseInt((roomB.match(/\d+/) || [""])[0], 10);
    if (!isNaN(numA) && !isNaN(numB) && numA !== numB) {
      return numA - numB;
    }
    return roomA.localeCompare(roomB, undefined, { numeric: true, sensitivity: "base" });
  });
}

export default async function InvoicesPage({ searchParams }: { searchParams: Promise<{ filter?: string; month?: string }> }) {
  const { filter = "unpaid", month: rawMonth } = await searchParams;
  const currentMonth = new Date().toISOString().slice(0, 7);
  const month = rawMonth || currentMonth;
  const isHistorical = month !== currentMonth;

  const monthLabel = (() => {
    try {
      return new NepaliDate(new Date(month + "-15")).format("MMMM YYYY");
    } catch {
      return month;
    }
  })();

  const invoices = await fetchInvoices(month);

  const totalDue = invoices.reduce((sum, inv) => sum + Number(inv.total_due), 0);
  const totalPaid = invoices.reduce((sum, inv) => sum + getInvoiceAmountPaid(inv), 0);
  const unpaidCount = invoices.filter((i) => i.payment_status === "unpaid").length;

  const unpaidWithEmail = invoices.filter(
    (inv) => inv.payment_status === "unpaid" && inv.tenants?.email
  );

  const displayInvoices = invoices.filter((inv) => {
    if (filter === "paid") return inv.payment_status === "paid";
    if (filter === "unpaid") return inv.payment_status === "unpaid";
    return true;
  });

  const sideA = sortInvoicesByRoomAsc(displayInvoices.filter((inv) => normalizeSide(inv.tenants?.room_side) === "Side A"));
  const sideB = sortInvoicesByRoomAsc(displayInvoices.filter((inv) => normalizeSide(inv.tenants?.room_side) === "Side B"));
  const sideOther = sortInvoicesByRoomAsc(displayInvoices.filter((inv) => normalizeSide(inv.tenants?.room_side) === "Other"));

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6 pb-12">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 sm:mb-8 pt-2 sm:pt-4 gap-3">
        <div className="flex items-center gap-3 sm:gap-4">
          <Link
            href="/"
            aria-label="Back to Dashboard"
            className="h-10 w-10 rounded-full bg-white border border-slate-200 shadow-sm flex items-center justify-center text-slate-600 hover:bg-slate-50 transition-colors shrink-0"
          >
            <ArrowLeft size={20} />
          </Link>
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2 text-slate-900">
              <FileText size={20} aria-hidden="true" className="text-teal-600 shrink-0" />
              Bills
            </h1>
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-slate-500 font-medium text-xs sm:text-sm">{monthLabel}</p>
              {isHistorical && (
                <span className="text-xs font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full uppercase tracking-wider border border-amber-200">
                  History
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between sm:justify-end gap-2 w-full sm:w-auto">
          <MonthSelector currentMonth={month} basePath="/invoices" extraParams={{ filter }} />
          <BulkEmailButton unpaidCount={unpaidWithEmail.length} month={month} />
        </div>
      </header>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-3 mb-6">
        <div className="col-span-2 sm:col-span-1 bg-white border border-slate-200 shadow-sm rounded-2xl p-3.5 sm:p-4">
          <p className="text-xs text-slate-400 uppercase font-bold tracking-wider mb-1">Total</p>
          <p className="text-lg font-bold text-slate-900 font-mono truncate">Rs.{totalDue.toLocaleString()}</p>
        </div>
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3.5 sm:p-4">
          <p className="text-xs text-emerald-600 uppercase font-bold tracking-wider mb-1">Collected</p>
          <p className="text-base sm:text-lg font-bold text-emerald-700 font-mono truncate">Rs.{totalPaid.toLocaleString()}</p>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3.5 sm:p-4">
          <p className="text-xs text-amber-600 uppercase font-bold tracking-wider mb-1">Unpaid</p>
          <p className="text-base sm:text-lg font-bold text-amber-700 truncate">{unpaidCount} rooms</p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex bg-slate-100 p-1 rounded-xl mb-6 text-sm font-bold shadow-inner">
        <Link href={`?filter=unpaid&month=${month}`} className={`flex-1 text-center py-2 rounded-lg transition-all ${filter === "unpaid" ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>Unpaid</Link>
        <Link href={`?filter=paid&month=${month}`} className={`flex-1 text-center py-2 rounded-lg transition-all ${filter === "paid" ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>Paid</Link>
        <Link href={`?filter=all&month=${month}`} className={`flex-1 text-center py-2 rounded-lg transition-all ${filter === "all" ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>All Accounts</Link>
      </div>

      {/* Bill List */}
      {displayInvoices.length === 0 ? (
        <div className="text-center py-20 text-slate-400">
          <FileText size={40} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium">No bills found</p>
          <p className="text-sm mt-1">Try changing the filter or generating bills.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          {/* Side A */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <h2 className="text-sm font-bold text-slate-800 bg-slate-100 px-3 py-1 rounded-lg tracking-wider uppercase">Side A</h2>
              <div className="h-px bg-slate-200 flex-1"></div>
            </div>
            {sideA.length === 0 ? (
              <p className="text-xs text-slate-400 font-medium">No bills for this side.</p>
            ) : (
              sideA.map((inv) => (
                <InvoiceCardItem key={inv.id} inv={inv} />
              ))
            )}
          </div>

          {/* Side B */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <h2 className="text-sm font-bold text-slate-800 bg-slate-100 px-3 py-1 rounded-lg tracking-wider uppercase">Side B</h2>
              <div className="h-px bg-slate-200 flex-1"></div>
            </div>
            {sideB.length === 0 ? (
              <p className="text-xs text-slate-400 font-medium">No bills for this side.</p>
            ) : (
              sideB.map((inv) => (
                <InvoiceCardItem key={inv.id} inv={inv} />
              ))
            )}
          </div>

          {/* Other / Extra Rooms if any */}
          {sideOther.length > 0 && (
            <div className="space-y-4 lg:col-span-2">
              <div className="flex items-center gap-2 mb-2">
                <h2 className="text-sm font-bold text-slate-800 bg-slate-100 px-3 py-1 rounded-lg tracking-wider uppercase">Other / Commercial</h2>
                <div className="h-px bg-slate-200 flex-1"></div>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {sideOther.map((inv) => (
                  <InvoiceCardItem key={inv.id} inv={inv} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
