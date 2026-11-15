"use client";

import { Expense } from "./actions";
import ExpenseRow from "./ExpenseRow";
import { History } from "lucide-react";

export default function LogView({ 
  expenses, 
  onEdit 
}: { 
  expenses: Expense[]; 
  onEdit: (exp: Expense) => void;
}) {
  // Group only active expenses for the feed
  const groupedByDate = expenses.reduce<Record<string, Expense[]>>((acc, exp) => {
    if (!acc[exp.expense_date]) acc[exp.expense_date] = [];
    acc[exp.expense_date].push(exp);
    return acc;
  }, {});

  const sortedDates = Object.keys(groupedByDate).sort((a, b) => b.localeCompare(a));

  return (
    <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
      {sortedDates.length === 0 ? (
        <div className="text-center py-20 bg-slate-50 border border-dashed border-slate-200 rounded-[32px]">
          <History size={40} className="mx-auto mb-3 text-slate-200" />
          <p className="text-slate-500 font-medium">No records found for this month.</p>
        </div>
      ) : (
        sortedDates.map((date) => (
          <div key={date} className="space-y-2">
            <div className="flex items-center gap-2">
               <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-100 px-2 py-1 rounded">
                {new Date(date).toLocaleDateString(undefined, { day: 'numeric', month: 'short', weekday: 'short' })}
               </h3>
               <div className="h-px bg-slate-100 flex-1"></div>
            </div>
            <div className="space-y-1.5">
              {groupedByDate[date].map((exp: Expense) => (
                <ExpenseRow key={exp.id} expense={exp} onEdit={onEdit} />
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
