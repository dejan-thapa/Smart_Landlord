import Link from "next/link";
import {
  Zap,
  CheckCircle2,
  Clock,
  AlertCircle,
  Receipt,
  ChevronRight,
  ArrowRight,
  MessageSquare,
  FileText,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import MonthSelector from "@/components/MonthSelector";
import NepaliDate from "nepali-date-converter";
import { normalizeTenant, type InvoiceTenant, type InvoiceWithTenant, getInvoicePreviousBalance } from "@/lib/types";
import { normalizePhoneNumber, buildWhatsAppBillMessage } from "@/lib/reminder-utils";

export const dynamic = "force-dynamic";

function formatNPR(amount: number): string {
  return `Rs. ${Math.round(amount).toLocaleString("en-US")}`;
}

interface TenantWithDetails {
  id: string;
  name: string | null;
  room_no: string;
  room_side: string | null;
  email: string | null;
  phone_number: string | null;
  base_rent: number;
}

async function getDashboardData(month: string) {
  const [{ data: activeTenants }, { data: monthInvoices }] = await Promise.all([
    // Active tenants
    supabase
      .from("tenants")
      .select("id, name, room_no, room_side, email, phone_number, base_rent")
      .eq("is_active", true),
    // Bills for selected month
    supabase
      .from("invoices")
      .select("*, tenants(id, name, room_no, room_side, email, phone_number)")
      .eq("billing_month", month)
      .order("created_at", { ascending: true }),
  ]);

  // Natural numeric room sort (e.g., Room 2 before Room 10)
  const sortedTenants: TenantWithDetails[] = (activeTenants || []).slice().sort((a, b) => {
    return a.room_no.localeCompare(b.room_no, undefined, { numeric: true, sensitivity: "base" });
  });

  const invoices: InvoiceWithTenant[] = (monthInvoices || []).map((inv) => ({
    ...inv,
    tenants: normalizeTenant<InvoiceTenant>(inv.tenants),
  }));

  // Date checking for overdue calculation
  const currentMonthStr = new Date().toISOString().slice(0, 7);
  const todayDay = new Date().getDate();
  const isHistoricalMonth = month < currentMonthStr;
  const isPastDueDay = month === currentMonthStr && todayDay > 10;

  const totalTenants = sortedTenants.length;
  const billsGenerated = invoices.length;
  const billsDraft = Math.max(0, totalTenants - billsGenerated);

  const paidInvoices = invoices.filter((inv) => inv.payment_status === "paid");
  const unpaidInvoices = invoices.filter((inv) => inv.payment_status === "unpaid");

  const overdueInvoices = unpaidInvoices.filter(() => isHistoricalMonth || isPastDueDay);
  const regularUnpaidInvoices = unpaidInvoices.filter(() => !isHistoricalMonth && !isPastDueDay);

  const billsPaid = paidInvoices.length;
  const billsUnpaid = regularUnpaidInvoices.length;
  const billsOverdue = overdueInvoices.length;

  const totalAmountBilled = invoices.reduce((sum, inv) => sum + Number(inv.total_due || 0), 0);
  const totalAmountCollected = paidInvoices.reduce((sum, inv) => sum + Number(inv.total_due || 0), 0);
  const totalOutstanding = totalAmountBilled - totalAmountCollected;

  return {
    tenants: sortedTenants,
    totalTenants,
    invoices,
    billsGenerated,
    billsDraft,
    billsPaid,
    billsUnpaid,
    billsOverdue,
    totalAmountBilled,
    totalAmountCollected,
    totalOutstanding,
    isHistoricalMonth,
    isPastDueDay,
  };
}

export default async function Dashboard({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; filter?: string }>;
}) {
  const { month: rawMonth, filter: rawFilter } = await searchParams;
  const currentMonth = new Date().toISOString().slice(0, 7);
  const month = rawMonth || currentMonth;
  const filter = rawFilter || "all";

  const stats = await getDashboardData(month);

  const nepaliMonthLabel = (() => {
    try {
      return new NepaliDate(new Date(month + "-15")).format("MMMM YYYY");
    } catch {
      return month;
    }
  })();

  const paidPct = stats.billsGenerated > 0 ? Math.round((stats.billsPaid / stats.billsGenerated) * 100) : 0;

  // Build room-level status cards (Option B: All Rooms Compact)
  const roomCards = stats.tenants.map((tenant) => {
    const inv = stats.invoices.find((i) => i.tenant_id === tenant.id);
    const hasBill = !!inv;
    const isPaid = inv?.payment_status === "paid";
    const isOverdue = hasBill && !isPaid && (stats.isHistoricalMonth || stats.isPastDueDay);
    const isUnpaid = hasBill && !isPaid && !isOverdue;

    let status: "paid" | "overdue" | "unpaid" | "no_bill" = "no_bill";
    if (isPaid) status = "paid";
    else if (isOverdue) status = "overdue";
    else if (isUnpaid) status = "unpaid";

    return {
      tenant,
      invoice: inv,
      hasBill,
      status,
      totalDue: inv ? Number(inv.total_due) : Number(tenant.base_rent),
    };
  });

  // Filtered room cards
  const filteredRooms = roomCards.filter((room) => {
    if (filter === "paid") return room.status === "paid";
    if (filter === "unpaid") return room.status === "unpaid" || room.status === "overdue";
    if (filter === "no_bill") return room.status === "no_bill";
    return true;
  });

  const unpaidCount = roomCards.filter((r) => r.status === "unpaid" || r.status === "overdue").length;
  const paidCount = roomCards.filter((r) => r.status === "paid").length;
  const noBillCount = roomCards.filter((r) => r.status === "no_bill").length;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 pb-16">
      
      {/* Clean Header Bar */}
      <header className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                Dashboard
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Overview &amp; collection status for <strong className="text-slate-700 dark:text-slate-200">{nepaliMonthLabel}</strong>
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <MonthSelector currentMonth={month} basePath="/" labelPrefix="Period: " />

              <Link
                href={`/meter-input?month=${month}`}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                <Zap size={14} aria-hidden="true" />
                Record Readings
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">

        {/* Action Banner (Only visible when attention is needed) */}
        {stats.billsDraft > 0 ? (
          <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-400 shrink-0">
                <AlertCircle size={18} />
              </div>
              <div>
                <p className="text-xs font-bold text-amber-900 dark:text-amber-200">
                  {stats.billsDraft} room{stats.billsDraft > 1 ? "s" : ""} need meter readings
                </p>
                <p className="text-xs text-amber-700 dark:text-amber-400">
                  Enter electricity readings to generate bills for {nepaliMonthLabel}.
                </p>
              </div>
            </div>
            <Link
              href={`/meter-input?month=${month}`}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl transition-colors shrink-0"
            >
              Enter Readings <ArrowRight size={13} />
            </Link>
          </div>
        ) : stats.billsOverdue > 0 ? (
          <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-rose-100 dark:bg-rose-900/60 text-rose-700 dark:text-rose-400 shrink-0">
                <AlertCircle size={18} />
              </div>
              <div>
                <p className="text-xs font-bold text-rose-900 dark:text-rose-200">
                  {stats.billsOverdue} bill{stats.billsOverdue > 1 ? "s are" : " is"} overdue for collection
                </p>
                <p className="text-xs text-rose-700 dark:text-rose-400">
                  Rent grace period has passed for {nepaliMonthLabel}. Follow up with pending tenants.
                </p>
              </div>
            </div>
            <Link
              href={`/?month=${month}&filter=unpaid`}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition-colors shrink-0"
            >
              View Overdue <ArrowRight size={13} />
            </Link>
          </div>
        ) : null}

        {/* 3 Focused KPI Cards (No Expenses Card) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          
          {/* Total Billed */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Total Billed
              </span>
              <div className="p-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl">
                <Receipt size={16} />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-bold font-mono text-slate-900 dark:text-white">
                {formatNPR(stats.totalAmountBilled)}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {stats.billsGenerated} of {stats.totalTenants} bills generated
              </p>
            </div>
          </div>

          {/* Total Collected */}
          <Link
            href={`/payments?month=${month}`}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs flex flex-col justify-between hover:border-emerald-300 dark:hover:border-emerald-700 transition-all group"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider group-hover:text-emerald-600 transition-colors">
                Total Collected
              </span>
              <div className="p-2 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 rounded-xl">
                <CheckCircle2 size={16} />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
                {formatNPR(stats.totalAmountCollected)}
              </div>
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mt-1">
                <span>{stats.billsPaid} bills paid ({paidPct}%)</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold group-hover:underline inline-flex items-center gap-0.5">
                  Ledger <ArrowRight size={11} />
                </span>
              </div>
            </div>
          </Link>

          {/* Pending Due */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Pending Due
              </span>
              <div className="p-2 bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 rounded-xl">
                <Clock size={16} />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-bold font-mono text-amber-600 dark:text-amber-400">
                {formatNPR(stats.totalOutstanding)}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {stats.billsUnpaid + stats.billsOverdue} bills awaiting payment
              </p>
            </div>
          </div>

        </div>

        {/* Room Collection Grid (Option B) */}
        <div className="space-y-4">
          
          {/* Header & Filter Pills */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                Room Collection Status
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                  {roomCards.length} Rooms
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Payment state for each active room in {nepaliMonthLabel}
              </p>
            </div>

            {/* Filter Pills */}
            <div className="inline-flex p-1 bg-slate-200/70 dark:bg-slate-800/80 rounded-xl text-xs font-semibold">
              <Link
                href={`/?month=${month}&filter=all`}
                className={`px-3 py-1 rounded-lg transition-all ${
                  filter === "all"
                    ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-bold"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                All ({roomCards.length})
              </Link>
              <Link
                href={`/?month=${month}&filter=unpaid`}
                className={`px-3 py-1 rounded-lg transition-all ${
                  filter === "unpaid"
                    ? "bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 shadow-xs font-bold"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                Unpaid ({unpaidCount})
              </Link>
              <Link
                href={`/?month=${month}&filter=paid`}
                className={`px-3 py-1 rounded-lg transition-all ${
                  filter === "paid"
                    ? "bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs font-bold"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                Paid ({paidCount})
              </Link>
              {noBillCount > 0 && (
                <Link
                  href={`/?month=${month}&filter=no_bill`}
                  className={`px-3 py-1 rounded-lg transition-all ${
                    filter === "no_bill"
                      ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-bold"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  Needs Bill ({noBillCount})
                </Link>
              )}
            </div>
          </div>

          {/* Cards Grid */}
          {filteredRooms.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-10 text-center">
              <FileText size={32} className="mx-auto mb-2 text-slate-300 dark:text-slate-700" />
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">No rooms match this filter</p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                Switch filters above or select another billing month.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {filteredRooms.map(({ tenant, invoice, hasBill, status, totalDue }) => {
                const tenantName = tenant.name || `Tenant`;
                const roomLabel = `Room ${tenant.room_no}`;
                const sideLabel = tenant.room_side || "Main";

                // WhatsApp Reminder Link with normalized phone number and full statement
                const accountHolder = process.env.PAYMENT_ACCOUNT_HOLDER || "Dejan Thapa";
                const bankName = process.env.PAYMENT_BANK_NAME || "eSewa";
                const accountNo = process.env.PAYMENT_ACCOUNT_NO || "9842835084";

                const cleanPhone = normalizePhoneNumber(tenant.phone_number);
                const whatsappUrl = cleanPhone
                  ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(
                      buildWhatsAppBillMessage({
                        tenantName: tenant.name || "",
                        roomNo: String(tenant.room_no),
                        roomSide: tenant.room_side || "",
                        phoneNumber: tenant.phone_number,
                        billingMonth: month,
                        totalDue: totalDue,
                        rentAmount: Number(invoice?.rent_amount || tenant.base_rent || 0),
                        electricityCost: Number(invoice?.electricity_cost || 0),
                        waterShare: Number(invoice?.water_share || 0),
                        wifiShare: Number(invoice?.wifi_share || 0),
                        garbageShare: Number(invoice?.garbage_share || 0),
                        previousBalance: invoice ? getInvoicePreviousBalance(invoice) : 0,
                        bankDetails: {
                          accountHolder,
                          bankName,
                          accountNo,
                        },
                      })
                    )}`
                  : null;

                return (
                  <div
                    key={tenant.id}
                    className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-4 shadow-xs hover:border-teal-400/50 dark:hover:border-teal-600/50 transition-all flex flex-col justify-between"
                  >
                    <div>
                      {/* Top Row: Room & Status Badge */}
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold text-xs px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200">
                            {roomLabel}
                          </span>
                          <span className="text-[11px] text-slate-400 dark:text-slate-500">
                            {sideLabel}
                          </span>
                        </div>

                        {status === "paid" ? (
                          <span className="inline-flex items-center gap-1 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 text-[11px] font-bold px-2 py-0.5 rounded-full">
                            <CheckCircle2 size={11} /> Paid
                          </span>
                        ) : status === "overdue" ? (
                          <span className="inline-flex items-center gap-1 bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800 text-[11px] font-bold px-2 py-0.5 rounded-full">
                            <AlertCircle size={11} /> Overdue
                          </span>
                        ) : status === "unpaid" ? (
                          <span className="inline-flex items-center gap-1 bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800 text-[11px] font-bold px-2 py-0.5 rounded-full">
                            <Clock size={11} /> Unpaid
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 text-[11px] font-medium px-2 py-0.5 rounded-full">
                            <Zap size={11} className="text-teal-500" /> Needs Meter
                          </span>
                        )}
                      </div>

                      {/* Tenant Name */}
                      <p className="font-bold text-sm text-slate-900 dark:text-white truncate">
                        {tenantName}
                      </p>

                      {/* Amount Due */}
                      <div className="mt-2 flex items-baseline justify-between">
                        <div>
                          <div className="text-lg font-bold font-mono text-slate-900 dark:text-white">
                            {formatNPR(totalDue)}
                          </div>
                          <p className="text-[10px] text-slate-400 dark:text-slate-500">
                            {hasBill ? "Total calculated bill" : "Base rent (meter pending)"}
                          </p>
                        </div>

                        {status === "paid" && invoice?.payment_method && (
                          <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                            via {invoice.payment_method.replace("_", " ")}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Bottom Actions */}
                    <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2">
                      {hasBill && invoice ? (
                        <>
                          <Link
                            href={`/invoices/${invoice.id}`}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-teal-600 dark:text-teal-400 hover:underline"
                          >
                            View Bill <ChevronRight size={13} />
                          </Link>

                          {status !== "paid" && whatsappUrl && (
                            <a
                              href={whatsappUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-xs font-semibold transition-colors"
                              title="Send WhatsApp payment reminder"
                            >
                              <MessageSquare size={12} /> WhatsApp
                            </a>
                          )}
                        </>
                      ) : (
                        <Link
                          href={`/meter-input?month=${month}`}
                          className="w-full inline-flex items-center justify-center gap-1 py-1 text-xs font-bold text-teal-600 dark:text-teal-400 hover:underline"
                        >
                          <Zap size={12} /> Enter Reading &amp; Generate Bill
                        </Link>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Footer navigation */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 dark:text-slate-400 gap-2">
            <span>
              Showing {filteredRooms.length} of {roomCards.length} rooms
            </span>
            <div className="flex items-center gap-4">
              <Link
                href={`/invoices?month=${month}`}
                className="font-semibold text-slate-700 dark:text-slate-300 hover:text-teal-600 dark:hover:text-teal-400 flex items-center gap-1"
              >
                View Full Bill Register <ArrowRight size={12} />
              </Link>
              <Link
                href={`/payments?month=${month}`}
                className="font-semibold text-slate-700 dark:text-slate-300 hover:text-teal-600 dark:hover:text-teal-400 flex items-center gap-1"
              >
                View Payment Ledger <ArrowRight size={12} />
              </Link>
            </div>
          </div>

        </div>

      </main>
    </div>
  );
}
