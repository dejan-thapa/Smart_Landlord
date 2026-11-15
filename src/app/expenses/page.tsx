"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { 
  ArrowLeft, Wallet, Calculator, TrendingDown, Info
} from "lucide-react";
import { fetchExpenses, Expense } from "./actions";
import MonthlyLedger from "./MonthlyLedger";
import MonthSelector from "@/components/MonthSelector";

function ExpensesContent() {
  const searchParams = useSearchParams();
  const urlMonth = searchParams.get("month");

  // Month comes straight from the URL (MonthSelector navigates via ?month=)
  const currentMonth = urlMonth || new Date().toISOString().slice(0, 7);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loadedMonth, setLoadedMonth] = useState<string | null>(null);
  const loading = loadedMonth !== currentMonth;

  const loadData = async (silent = false) => {
    if (!silent) setLoadedMonth(null);
    const data = await fetchExpenses(currentMonth);
    setExpenses(data);
    setLoadedMonth(currentMonth);
  };

  useEffect(() => {
    let cancelled = false;
    fetchExpenses(currentMonth).then((data) => {
      if (cancelled) return; // ignore stale responses after a month switch
      setExpenses(data);
      setLoadedMonth(currentMonth);
    });
    return () => {
      cancelled = true;
    };
  }, [currentMonth]);

  const totalExpenses = expenses.reduce((sum, exp) => sum + Number(exp.amount), 0);
  const categoryTotals = expenses.reduce<Record<string, number>>((acc, exp) => {
    acc[exp.category] = (acc[exp.category] || 0) + Number(exp.amount);
    return acc;
  }, {});

  return (
    <main className="max-w-5xl mx-auto p-4 md:p-6 pb-20">
      {/* Mini Header */}
      <header className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link
            href={`/?month=${currentMonth}`}
            aria-label="Back to Dashboard"
            className="h-9 w-9 rounded-full bg-white border border-slate-200 shadow-sm flex items-center justify-center text-slate-600 hover:bg-slate-50 transition-colors"
          >
            <ArrowLeft size={18} />
          </Link>
          <div className="flex items-center gap-3">
             <Wallet size={20} aria-hidden="true" className="text-teal-600" />
             <h1 className="text-xl font-black text-slate-900 tracking-tighter uppercase">Ledger</h1>
          </div>
        </div>

        <MonthSelector
          currentMonth={currentMonth}
          basePath="/expenses"
        />
      </header>

      {/* High Density Stats */}
      <div className="flex items-stretch gap-4 mb-6">
        <div className="flex-1 bg-slate-900 rounded-3xl p-5 text-white flex items-center justify-between shadow-xl shadow-slate-200">
           <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-50 mb-1">Total Monthly Spend</p>
              <p className="text-3xl font-black font-mono">Rs.{totalExpenses.toLocaleString()}</p>
           </div>
           <Calculator className="opacity-20" size={40} />
        </div>

        <div className="flex-[1.5] bg-white border border-slate-100 rounded-3xl p-5 flex flex-col justify-center">
           <div className="flex items-center gap-2 mb-2">
              <TrendingDown size={14} className="text-rose-500" />
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Main Categories</p>
           </div>
           <div className="flex gap-2">
              {Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([cat, amt]) => (
                <div key={cat} className="bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100">
                  <span className="text-[9px] font-bold text-slate-400 uppercase mr-2">{cat}</span>
                  <span className="text-xs font-black text-slate-800 font-mono">Rs.{amt.toLocaleString()}</span>
                </div>
              ))}
              {Object.keys(categoryTotals).length === 0 && <p className="text-slate-300 text-xs italic">Start entering to see stats...</p>}
           </div>
        </div>
      </div>

      <div className="mb-4 bg-blue-50/50 border border-blue-100 text-blue-600 px-4 py-2 rounded-xl flex items-center gap-2 text-[11px] font-medium">
        <Info size={14} />
        <span>Type directly into any row and press <kbd className="bg-blue-100 px-1 rounded font-bold">Enter</kbd> to save. All 30 days are visible below.</span>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 animate-pulse">
           <p className="text-slate-300 font-bold text-sm tracking-widest uppercase">Opening Ledger...</p>
        </div>
      ) : (
        <MonthlyLedger expenses={expenses} month={currentMonth} refresh={loadData} />
      )}
    </main>
  );
}

export default function ExpensesPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center min-h-screen animate-pulse">
        <p className="text-slate-300 font-bold text-sm tracking-widest uppercase">Opening Ledger...</p>
      </div>
    }>
      <ExpensesContent />
    </Suspense>
  );
}
