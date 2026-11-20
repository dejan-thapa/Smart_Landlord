"use client";

import { useState, useEffect, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  ArrowLeft, Wallet, Calculator, TrendingDown, Info, 
  TableProperties, ListFilter, PlusCircle
} from "lucide-react";
import { Expense, fetchExpenses } from "./actions";
import MonthlyLedger from "./MonthlyLedger";
import LogView from "./LogView";
import QuickAdd from "./QuickAdd";
import MonthSelector from "@/components/MonthSelector";
import { CATEGORIES } from "./constants";

export default function ExpensesClient({
  initialExpenses,
  month,
}: {
  initialExpenses: Expense[];
  month: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [expenses, setExpenses] = useState<Expense[]>(initialExpenses);
  const [activeTab, setActiveTab] = useState<"ledger" | "feed">("ledger");
  const [showQuickAdd, setShowQuickAdd] = useState(true);

  // Sync state when server-side month changes
  useEffect(() => {
    setExpenses(initialExpenses);
  }, [initialExpenses, month]);

  // Client refresh for optimistic updates after add/edit/delete
  const handleRefresh = async (silent = true) => {
    startTransition(() => {
      router.refresh();
    });
    const fresh = await fetchExpenses(month);
    setExpenses(fresh);
  };

  const totalExpenses = expenses.reduce((sum, exp) => sum + Number(exp.amount), 0);
  const categoryTotals = expenses.reduce<Record<string, number>>((acc, exp) => {
    acc[exp.category] = (acc[exp.category] || 0) + Number(exp.amount);
    return acc;
  }, {});

  const sortedCategories = Object.entries(categoryTotals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4);

  return (
    <div className="max-w-5xl mx-auto p-3.5 sm:p-6 pb-24">
      {/* Top Header */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-3 sm:gap-4">
          <Link
            href={`/?month=${month}`}
            aria-label="Back to Dashboard"
            className="h-9 w-9 rounded-full bg-white border border-slate-200 shadow-xs flex items-center justify-center text-slate-600 hover:bg-slate-50 transition-colors shrink-0"
          >
            <ArrowLeft size={18} />
          </Link>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-teal-50 text-teal-600 rounded-xl">
              <Wallet size={20} />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight uppercase">
                Expense Ledger
              </h1>
              <p className="text-[10px] text-slate-400 font-semibold tracking-wider uppercase">
                House & Maintenance Accounting
              </p>
            </div>
          </div>
        </div>

        <MonthSelector currentMonth={month} basePath="/expenses" />
      </header>

      {/* KPI Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
        {/* Total Spend */}
        <div className="bg-slate-900 rounded-2xl sm:rounded-3xl p-4 sm:p-5 text-white flex items-center justify-between shadow-lg shadow-slate-900/10">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 mb-1">
              Total Monthly Spend
            </p>
            <p className="text-2xl sm:text-3xl font-black font-mono">
              Rs.{totalExpenses.toLocaleString()}
            </p>
            <p className="text-[11px] text-slate-400 font-medium mt-1">
              {expenses.length} {expenses.length === 1 ? "entry" : "entries"} recorded
            </p>
          </div>
          <Calculator className="text-slate-700 shrink-0" size={36} />
        </div>

        {/* Main Categories Breakdown */}
        <div className="sm:col-span-2 bg-white border border-slate-200/80 rounded-2xl sm:rounded-3xl p-4 sm:p-5 flex flex-col justify-center shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <TrendingDown size={14} className="text-rose-500" />
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                Top Spending Categories
              </p>
            </div>
            <button
              onClick={() => setShowQuickAdd(!showQuickAdd)}
              className="text-xs font-bold text-teal-600 hover:text-teal-700 flex items-center gap-1 cursor-pointer"
            >
              <PlusCircle size={13} />
              <span>{showQuickAdd ? "Hide Quick Add" : "Quick Add"}</span>
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            {sortedCategories.map(([cat, amt]) => {
              const meta = CATEGORIES.find((c) => c.id === cat);
              return (
                <div
                  key={cat}
                  className="bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100 flex items-center gap-2"
                >
                  <span className="text-[10px] font-bold text-slate-500 uppercase">{cat}</span>
                  <span className="text-xs font-black text-slate-900 font-mono">
                    Rs.{amt.toLocaleString()}
                  </span>
                </div>
              );
            })}
            {sortedCategories.length === 0 && (
              <p className="text-slate-400 text-xs italic py-1">
                No spending logged for this month yet. Use Quick Add or the ledger below to start.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Quick Add Bar (Collapsible / Default Open) */}
      {showQuickAdd && (
        <QuickAdd
          defaultDate={
            month === new Date().toISOString().slice(0, 7)
              ? new Date().toISOString().slice(0, 10)
              : `${month}-01`
          }
          onSaved={() => handleRefresh(true)}
        />
      )}

      {/* View Switcher Tabs & Info Tip */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
        <div className="inline-flex p-1 bg-slate-200/60 rounded-xl self-start">
          <button
            type="button"
            onClick={() => setActiveTab("ledger")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === "ledger"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <TableProperties size={14} />
            <span>30-Day Ledger</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("feed")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === "feed"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <ListFilter size={14} />
            <span>Activity Feed ({expenses.length})</span>
          </button>
        </div>

        {activeTab === "ledger" && (
          <div className="text-[11px] text-slate-500 flex items-center gap-1.5 bg-blue-50/70 border border-blue-100 text-blue-700 px-3 py-1 rounded-lg">
            <Info size={13} className="shrink-0" />
            <span>Type directly into any row and press Enter or Save.</span>
          </div>
        )}
      </div>

      {/* Main View Area */}
      {activeTab === "ledger" ? (
        <MonthlyLedger
          expenses={expenses}
          month={month}
          refresh={handleRefresh}
        />
      ) : (
        <LogView
          expenses={expenses}
          refresh={handleRefresh}
        />
      )}
    </div>
  );
}
