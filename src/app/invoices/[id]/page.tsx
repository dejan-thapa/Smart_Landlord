import Link from "next/link";
import { ArrowLeft, FileText, CheckCircle2, Clock, Banknote, Calendar, CreditCard, StickyNote } from "lucide-react";
import { fetchInvoiceById } from "../invoice-actions";
import { notFound } from "next/navigation";
import InvoiceActions from "./InvoiceActions";
import PaymentQR from "./PaymentQR";
import PreviousBalanceEditor from "./PreviousBalanceEditor";
import NepaliDate from "nepali-date-converter";
import { supabase } from "@/lib/supabase";
import { getInvoicePreviousBalance } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const invoice = await fetchInvoiceById(id);
  if (!invoice) notFound();

  const tenant = invoice.tenants;
  if (!tenant) notFound();
  const isPaid = invoice.payment_status === "paid";

  const { data: meterReading } = await supabase
    .from("meter_readings")
    .select("previous_reading, current_reading, rate_per_unit")
    .eq("tenant_id", tenant.id)
    .eq("billing_month", invoice.billing_month)
    .maybeSingle();

  const electricityUnits = meterReading
    ? Math.max(0, Number(meterReading.current_reading) - Number(meterReading.previous_reading || 0))
    : null;

  const previousBalance = getInvoicePreviousBalance(invoice);

  // Check if tenant has prior unpaid invoices from months before this billing month
  const { data: priorUnpaidInvoices } = await supabase
    .from("invoices")
    .select("billing_month, total_due")
    .eq("tenant_id", tenant.id)
    .lt("billing_month", invoice.billing_month)
    .eq("payment_status", "unpaid")
    .order("billing_month", { ascending: true });

  const lineItems = [
    { label: "Base Rent", value: invoice.rent_amount, detail: null },
    {
      label: "Electricity",
      value: invoice.electricity_cost,
      detail: meterReading && electricityUnits !== null
        ? `${meterReading.current_reading} − ${meterReading.previous_reading} = ${electricityUnits} units @ Rs. ${meterReading.rate_per_unit}/unit`
        : null,
    },
    { label: "Water (shared)", value: invoice.water_share, detail: null },
    { label: "WiFi (shared)", value: invoice.wifi_share, detail: null },
    { label: "Garbage (shared)", value: invoice.garbage_share, detail: null },
  ];

  return (
    <main className="max-w-xl mx-auto p-4 md:p-6 pb-56 sm:pb-64">
      {/* Header */}
      <header className="flex items-center gap-4 mb-8 pt-4">
        <Link
          href="/invoices"
          aria-label="Back to Bills"
          className="h-10 w-10 rounded-full bg-white border border-slate-200 shadow-sm flex items-center justify-center text-slate-600 hover:bg-slate-50 transition-colors"
        >
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2 text-slate-900">
            <FileText size={20} aria-hidden="true" className="text-teal-600" />
            Bill
          </h1>
          <p className="text-slate-500 font-medium text-sm">
            {new NepaliDate(new Date(invoice.billing_month + "-01")).format("MMMM YYYY")}
          </p>
        </div>
        <div className="ml-auto">
          {isPaid ? (
            <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-700 text-sm font-bold px-3 py-1.5 rounded-full">
              <CheckCircle2 size={14} /> Paid
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-700 text-sm font-bold px-3 py-1.5 rounded-full">
              <Clock size={14} /> Unpaid
            </span>
          )}
        </div>
      </header>

      {/* Tenant Info */}
      <div className="bg-white border border-slate-200 shadow-sm rounded-2xl mb-4 overflow-hidden">
        <div className="p-6 sm:p-8 flex items-center justify-between">
          <div>
            <p className="text-sm font-bold text-slate-400 mb-2 uppercase tracking-wider">Billed To</p>
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-purple-400 to-indigo-600 flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-purple-500/20">
                {tenant.name ? tenant.name.charAt(0).toUpperCase() : tenant.room_no.charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-xl font-bold text-slate-900">{tenant.name || `Room ${tenant.room_no} Tenant`}</p>
                  <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider shadow-inner">{tenant.room_side || "Other"}</span>
                </div>
                {tenant.phone_number && <p className="text-slate-400 text-xs mt-0.5">{tenant.phone_number}</p>}
              </div>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm font-bold text-slate-400 mb-1 uppercase tracking-wider">Location</p>
            <p className="text-lg font-bold text-slate-700 font-mono">Room {tenant.room_no}</p>
          </div>
        </div>
      </div>

      {/* Breakdown */}
      <div className="bg-white border border-slate-200 shadow-sm rounded-2xl overflow-hidden mb-6">
        <div className="p-5 border-b border-slate-100">
          <h2 className="font-bold text-slate-700 text-sm uppercase tracking-wider">Breakdown</h2>
        </div>
        <div className="divide-y divide-slate-100">
          {lineItems.map((item) => (
            <div key={item.label} className="flex justify-between items-center px-5 py-3">
              <div>
                <span className="text-slate-700 dark:text-slate-300 text-sm font-medium">{item.label}</span>
                {item.detail && (
                  <p className="text-[11px] text-teal-600 dark:text-teal-400 font-mono font-medium mt-0.5">
                    {item.detail}
                  </p>
                )}
              </div>
              <span className="font-bold font-mono text-slate-900 dark:text-white">Rs. {Number(item.value).toLocaleString()}</span>
            </div>
          ))}
        </div>

        {/* Previous Balance / Arrears Editor */}
        <PreviousBalanceEditor
          invoiceId={invoice.id}
          initialBalance={previousBalance}
          isPaid={isPaid}
          priorUnpaid={priorUnpaidInvoices || []}
        />

        <div className="bg-slate-50 px-5 py-4 flex justify-between items-center border-t border-slate-200">
          <span className="font-bold text-slate-900">Total Due</span>
          <span className="text-2xl font-bold font-mono text-slate-900">
            Rs. {Number(invoice.total_due).toLocaleString()}
          </span>
        </div>
      </div>

      {/* Payment Details — shown when paid */}
      {isPaid && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 mb-4">
          <h3 className="text-sm font-bold text-emerald-900 mb-3 flex items-center gap-2">
            <CheckCircle2 size={16} className="text-emerald-600" /> Payment Recorded
          </h3>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="bg-white/60 rounded-xl p-3">
              <div className="flex items-center gap-1.5 text-[10px] uppercase font-bold text-emerald-700 tracking-wider mb-1">
                <Calendar size={10} /> Date Paid
              </div>
              <p className="font-semibold text-slate-900">
                {invoice.payment_date
                  ? new Date(invoice.payment_date).toLocaleDateString("en-NP", { day: "numeric", month: "long", year: "numeric" })
                  : <span className="text-slate-400 font-normal text-xs">Not recorded</span>}
              </p>
            </div>
            <div className="bg-white/60 rounded-xl p-3">
              <div className="flex items-center gap-1.5 text-[10px] uppercase font-bold text-emerald-700 tracking-wider mb-1">
                <CreditCard size={10} /> Method
              </div>
              <p className="font-semibold text-slate-900 capitalize">
                {invoice.payment_method
                  ? invoice.payment_method.replace("_", " ")
                  : <span className="text-slate-400 font-normal text-xs">Not recorded</span>}
              </p>
            </div>
          </div>
          {invoice.payment_notes && (
            <div className="mt-3 bg-white/60 rounded-xl p-3">
              <div className="flex items-center gap-1.5 text-[10px] uppercase font-bold text-emerald-700 tracking-wider mb-1">
                <StickyNote size={10} /> Notes
              </div>
              <p className="text-sm text-slate-700">{invoice.payment_notes}</p>
            </div>
          )}
        </div>
      )}

      {/* Payment Instructions */}
      <div className="bg-emerald-50 border border-emerald-100 rounded-3xl p-6 mb-8">
        <h3 className="text-emerald-900 font-bold mb-4 flex items-center gap-2">
          <Banknote size={18} /> Payment Instructions (eSewa)
        </h3>
        
        <div className="flex flex-col md:flex-row gap-6 items-center">
          <PaymentQR />
          
          <div className="space-y-2 text-sm text-emerald-800 flex-1">
            <div className="bg-white/50 p-3 rounded-xl">
              <p className="text-[10px] uppercase font-bold text-emerald-600 tracking-wider mb-1">Account Name</p>
              <p className="font-bold text-lg">{process.env.PAYMENT_ACCOUNT_HOLDER || "Dejan Thapa"}</p>
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-white/50 p-3 rounded-xl">
                <p className="text-[10px] uppercase font-bold text-emerald-600 tracking-wider mb-1">Payment Method</p>
                <p className="font-bold">{process.env.PAYMENT_BANK_NAME || "eSewa"}</p>
              </div>
              <div className="bg-white/50 p-3 rounded-xl">
                <p className="text-[10px] uppercase font-bold text-emerald-600 tracking-wider mb-1">eSewa ID / Mobile</p>
                <p className="font-bold font-mono">{process.env.PAYMENT_ACCOUNT_NO || "9842835084"}</p>
              </div>
            </div>
          </div>
        </div>
        
        <p className="text-[11px] text-emerald-600 font-medium mt-4 text-center">
          Please send a screenshot of the payment confirmation after transfer.
        </p>
      </div>

      {/* Actions */}
      <InvoiceActions
        invoiceId={invoice.id}
        isPaid={isPaid}
        reminderData={{
          tenantName: tenant?.name || "",
          roomNo: tenant?.room_no || "",
          roomSide: tenant?.room_side || "",
          phoneNumber: tenant?.phone_number || "",
          billingMonth: invoice.billing_month,
          totalDue: Number(invoice.total_due),
          rentAmount: Number(invoice.rent_amount),
          electricityCost: Number(invoice.electricity_cost),
          waterShare: Number(invoice.water_share),
          wifiShare: Number(invoice.wifi_share),
          garbageShare: Number(invoice.garbage_share),
          previousBalance: previousBalance,
        }}
      />
    </main>
  );
}
