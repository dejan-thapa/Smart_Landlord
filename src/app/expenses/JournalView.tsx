"use client";

import { useEffect, useRef } from "react";
import { Expense } from "./actions";
import ExpenseRow from "./ExpenseRow";
import { Calendar, Info } from "lucide-react";

export default function JournalView({ 
  expenses, 
  month,
  onEdit 
}: { 
  expenses: Expense[]; 
  month: string;
  onEdit: (exp: Expense) => void;
}) {
  const [year, mo] = month.split("-").map(Number);
  const daysInMonth = new Date(year, mo, 0).getDate();
  const todayDate = new Date().toISOString().slice(0, 10);
  const todayRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to Today
  useEffect(() => {
    if (todayRef.current) {
      todayRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, []);

  const days = Array.from({ length: daysInMonth }, (_, i) => {
    const day = i + 1;
    const dateStr = `${month}-${String(day).padStart(2, "0")}`;
    const dayExpenses = expenses.filter(e => e.expense_date === dateStr);
    const dayTotal = dayExpenses.reduce((sum, e) => sum + Number(e.amount), 0);
    
    return {
      day,
      dateStr,
      expenses: dayExpenses,
      total: dayTotal,
      isToday: dateStr === todayDate
    };
  });

  return (
    <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2 scrollbar-hide custom-scrollbar">
      <div className="bg-blue-50 border border-blue-100 p-4 rounded-2xl flex items-start gap-3 mb-6">
        <Info className="text-blue-500 mt-0.5" size={18} />
        <p className="text-sm text-blue-700 leading-relaxed">
          Showing the full <span className="font-bold">30-day journal</span> for {month}. Days with spending expand to show your records.
        </p>
      </div>

      <div className="space-y-2">
        {days.map((d) => (
          <div 
            key={d.dateStr}
            ref={d.isToday ? todayRef : null}
            className={`flex items-start gap-4 rounded-[24px] transition-all p-2 ${d.isToday ? 'bg-slate-900 shadow-xl' : 'hover:bg-slate-50'}`}
          >
            {/* Date Indicator */}
            <div className={`w-14 h-14 rounded-2xl flex flex-col items-center justify-center flex-shrink-0 border ${d.isToday ? 'bg-white border-transparent text-slate-900 shadow-lg' : 'bg-slate-50 border-slate-100 text-slate-400'}`}>
              <span className="text-[10px] font-bold uppercase tracking-tight">{new Date(d.dateStr).toLocaleDateString(undefined, { weekday: 'short' })}</span>
              <span className="text-xl font-bold leading-none">{d.day}</span>
            </div>

            {/* Daily Content */}
            <div className="flex-1 min-h-[56px] flex flex-col justify-center">
              {d.expenses.length > 0 ? (
                <div className="space-y-1.5">
                   <div className="flex items-center justify-between px-1 mb-1">
                      <p className={`text-[10px] font-bold uppercase tracking-widest ${d.isToday ? 'text-slate-300' : 'text-slate-400'}`}>Daily Activity</p>
                      <p className={`text-sm font-bold font-mono ${d.isToday ? 'text-white' : 'text-slate-700'}`}>Rs.{d.total.toLocaleString()}</p>
                   </div>
                   {d.expenses.map(exp => (
                     <ExpenseRow key={exp.id} expense={exp} onEdit={onEdit} />
                   ))}
                </div>
              ) : (
                <div className="flex items-center justify-between px-1">
                   <p className={`text-sm font-medium italic ${d.isToday ? 'text-slate-400' : 'text-slate-300'}`}>No records for this day</p>
                   <p className={`text-xs font-bold font-mono ${d.isToday ? 'text-slate-400' : 'text-slate-200'}`}>Rs.0</p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
