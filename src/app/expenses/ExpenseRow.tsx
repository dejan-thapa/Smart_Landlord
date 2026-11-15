"use client";

import { useState } from "react";
import { Edit2, Trash2, Loader2 } from "lucide-react";
import { Expense, deleteExpense } from "./actions";
import { CATEGORIES } from "./constants";

export default function ExpenseRow({ 
  expense, 
  onEdit 
}: { 
  expense: Expense; 
  onEdit: (exp: Expense) => void;
}) {
  const [isDeleting, setIsDeleting] = useState(false);
  
  const cat = CATEGORIES.find(c => c.id === expense.category) || CATEGORIES[CATEGORIES.length - 1];
  const Icon = cat.icon;

  const handleDelete = async () => {
    if (!confirm("Delete this expense?")) return;
    setIsDeleting(true);
    try {
      await deleteExpense(expense.id);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="flex items-center justify-between p-3 bg-white border border-slate-100 rounded-2xl hover:border-slate-300 group transition-all">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${cat.color}`}>
          <Icon size={16} />
        </div>
        <div>
          <p className="text-sm font-bold text-slate-900 leading-tight">{expense.description}</p>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{expense.category}</p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <p className="text-sm font-bold text-slate-900 font-mono">Rs.{expense.amount.toLocaleString()}</p>
        
        <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
          <button 
            type="button"
            aria-label={`Edit ${expense.description}`}
            onClick={() => onEdit(expense)}
            className="p-2 text-slate-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-all"
          >
            <Edit2 size={14} />
          </button>
          <button 
            type="button"
            aria-label={`Delete ${expense.description}`}
            onClick={handleDelete}
            disabled={isDeleting}
            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
          >
            {isDeleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
          </button>
        </div>
      </div>
    </div>
  );
}
