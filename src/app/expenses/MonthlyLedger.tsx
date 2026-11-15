"use client";

import { useState, useMemo } from "react";
import { Plus, Loader2, Save, Trash2, Edit2, Check, X } from "lucide-react";
import { Expense, addExpense, editExpense, deleteExpense } from "./actions";
import { CATEGORIES } from "./constants";

export default function MonthlyLedger({ 
  expenses, 
  month,
  refresh
}: { 
  expenses: Expense[]; 
  month: string;
  refresh: (silent?: boolean) => void;
}) {
  const [year, mo] = month.split("-").map(Number);
  const daysInMonth = new Date(year, mo, 0).getDate();
  const [activeEditingId, setActiveEditingId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Group expenses by day
  const expensesByDay = useMemo(() => {
    return expenses.reduce<Record<number, Expense[]>>((acc, exp) => {
      // Robust day parsing: take the first 10 chars (YYYY-MM-DD), then split
      const datePart = exp.expense_date.substring(0, 10);
      const day = Number(datePart.split("-")[2]);
      
      if (!acc[day]) acc[day] = [];
      acc[day].push(exp);
      return acc;
    }, {});
  }, [expenses]);

  return (
    <div className="bg-white border border-slate-200 rounded-[24px] overflow-hidden shadow-sm">
      {/* Table Header */}
      <div className="grid grid-cols-[80px_1fr_1.5fr_1fr_100px] gap-4 bg-slate-50 px-6 py-3 border-b border-slate-200 text-[10px] font-black text-slate-400 uppercase tracking-widest">
        <div>Date</div>
        <div>Category</div>
        <div>Description</div>
        <div className="text-right">Amount (Rs.)</div>
        <div className="text-center">Action</div>
      </div>

      <div className="divide-y divide-slate-100 max-h-[75vh] overflow-y-auto custom-scrollbar">
        {Array.from({ length: daysInMonth }, (_, i) => {
          const day = i + 1;
          const dateStr = `${month}-${String(day).padStart(2, "0")}`;
          const dayRecords = expensesByDay[day] || [];
          
          return (
            <LedgerDayGroup 
              key={dateStr}
              day={day}
              dateStr={dateStr}
              records={dayRecords}
              refresh={refresh}
            />
          );
        })}
      </div>
    </div>
  );
}

function LedgerDayGroup({ day, dateStr, records, refresh }: { day: number, dateStr: string, records: Expense[], refresh: (silent?: boolean) => void }) {
  const [isAdding, setIsAdding] = useState(false);
  const isToday = dateStr === new Date().toISOString().slice(0, 10);

  return (
    <div className={`group transition-colors ${isToday ? 'bg-blue-50/30' : ''}`}>
      {records.length > 0 ? (
        <div className="divide-y divide-slate-50">
          {records.map((rec, i) => (
            <LedgerRow 
              key={rec.id} 
              expense={rec} 
              isFirst={i === 0} 
              dayDisplay={i === 0 ? day : ""} 
              dateStr={dateStr}
              refresh={refresh}
            />
          ))}
          {/* Always show one empty input row for days with records to allow adding more instantly */}
          <LedgerInputRow 
            dateStr={dateStr} 
            dayDisplay="" 
            placeholder
            refresh={refresh}
          />
        </div>
      ) : (
        <LedgerInputRow 
          dateStr={dateStr} 
          dayDisplay={day} 
          placeholder
          refresh={refresh}
        />
      )}
    </div>
  );
}

function LedgerRow({ expense, dayDisplay, refresh }: { expense: Expense, dayDisplay: string | number, isFirst: boolean, dateStr: string, refresh: (silent?: boolean) => void }) {
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [form, setForm] = useState({
    amount: String(expense.amount),
    description: expense.description,
    category: expense.category
  });

  const cat = CATEGORIES.find(c => c.id === expense.category) || CATEGORIES[CATEGORIES.length - 1];

  const handleUpdate = async () => {
    try {
      await editExpense(expense.id, {
        ...form,
        amount: Number(form.amount),
        expense_date: expense.expense_date
      });
      setIsEditing(false);
      refresh(true);
    } catch (e) {
      alert("Error saving");
    }
  };

  const handleDelete = async () => {
    if (!confirm("Delete?")) return;
    setIsDeleting(true);
    await deleteExpense(expense.id);
    setIsDeleting(false);
    refresh(true);
  };

  if (isEditing) {
    return (
      <div className="grid grid-cols-[80px_1fr_1.5fr_1fr_100px] gap-4 px-6 py-1.5 items-center bg-amber-50 animate-in fade-in duration-200">
        <div className="text-sm font-black text-slate-400">{dayDisplay}</div>
        <select 
          value={form.category}
          onChange={e => setForm({...form, category: e.target.value as Expense["category"]})}
          className="bg-white border border-slate-200 rounded px-2 py-1 text-xs font-bold focus:outline-none"
        >
          {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.id}</option>)}
        </select>
        <input 
          type="text" 
          value={form.description}
          onChange={e => setForm({...form, description: e.target.value})}
          className="bg-white border border-slate-200 rounded px-2 py-1 text-xs font-medium focus:outline-none"
        />
        <input 
          type="number" 
          value={form.amount}
          onChange={e => setForm({...form, amount: e.target.value})}
          className="bg-white border border-slate-200 rounded px-2 py-1 text-xs font-bold font-mono text-right focus:outline-none"
        />
        <div className="flex items-center justify-center gap-1">
          <button onClick={handleUpdate} className="p-1 text-emerald-600 hover:bg-emerald-100 rounded"><Check size={14} /></button>
          <button onClick={() => setIsEditing(false)} className="p-1 text-slate-400 hover:bg-slate-100 rounded"><X size={14} /></button>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-[80px_1fr_1.5fr_1fr_100px] gap-4 px-6 py-2.5 items-center hover:bg-slate-50 transition-colors">
      <div className="text-sm font-black text-slate-300">{dayDisplay}</div>
      <div className="flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full ${cat.color.split(' ')[1].replace('text-', 'bg-')}`}></div>
        <span className="text-[10px] font-bold text-slate-600 uppercase truncate">{expense.category}</span>
      </div>
      <div className="text-xs font-medium text-slate-900 truncate">{expense.description}</div>
      <div className="text-sm font-bold text-slate-900 font-mono text-right">Rs.{Number(expense.amount).toLocaleString()}</div>
      <div className="flex items-center justify-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
        <button type="button" aria-label="Edit expense" onClick={() => setIsEditing(true)} className="p-1.5 text-slate-400 hover:text-teal-600 rounded"><Edit2 size={13} /></button>
        <button type="button" aria-label="Delete expense" onClick={handleDelete} disabled={isDeleting} className="p-1.5 text-slate-400 hover:text-red-500 rounded">
          {isDeleting ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
        </button>
      </div>
    </div>
  );
}

function LedgerInputRow({ dateStr, dayDisplay, onCancel, onSave, placeholder, refresh }: { dateStr: string, dayDisplay: string | number, onCancel?: () => void, onSave?: () => void, placeholder?: boolean, refresh: (silent?: boolean) => void }) {
  const [form, setForm] = useState({ amount: "", description: "", category: "Other" });
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!form.amount) return;
    setIsSaving(true);
    const res = await addExpense({
      ...form,
      amount: Number(form.amount),
      expense_date: dateStr
    });
    setIsSaving(false);
    if (res.success) {
      setForm({ amount: "", description: "", category: "Other" });
      onSave?.();
      refresh(true);
    } else {
      console.error("Ledger Save Error:", res.error);
      alert("Save failed: " + res.error);
    }
  };

  return (
    <div className={`grid grid-cols-[80px_1fr_1.5fr_1fr_100px] gap-4 px-6 py-1.5 items-center ${placeholder ? 'opacity-40 hover:opacity-100 focus-within:opacity-100' : ''} transition-opacity`}>
      <div className="text-sm font-black text-slate-200">{dayDisplay}</div>
      <select 
        value={form.category}
        onChange={e => setForm({...form, category: e.target.value})}
        className="bg-transparent border-b border-slate-100 py-1 text-[10px] font-bold text-slate-500 uppercase focus:outline-none focus:border-slate-300 transition-all hover:bg-slate-50 cursor-pointer"
      >
        {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.id}</option>)}
      </select>
      <input 
        type="text" 
        placeholder="Add expense..."
        value={form.description}
        onChange={e => setForm({...form, description: e.target.value})}
        className="bg-transparent border-b border-slate-100 py-1 text-xs font-medium focus:outline-none focus:border-slate-300 transition-all"
        onKeyDown={e => e.key === 'Enter' && handleSave()}
      />
      <div className="relative">
        <span className="absolute left-0 top-1/2 -translate-y-1/2 text-[10px] text-slate-300">Rs.</span>
        <input 
          type="number" 
          placeholder="0"
          value={form.amount}
          onChange={e => setForm({...form, amount: e.target.value})}
          className="w-full bg-transparent border-b border-slate-100 pl-4 py-1 text-xs font-bold font-mono text-right focus:outline-none focus:border-slate-300 transition-all"
          onKeyDown={e => e.key === 'Enter' && handleSave()}
        />
      </div>
      <div className="flex items-center justify-center gap-1">
        <button 
          onClick={handleSave} 
          disabled={!form.amount || isSaving}
          className="p-1 px-2.5 bg-slate-900 text-white rounded-lg text-[10px] font-bold hover:bg-slate-800 disabled:opacity-20 transition-all"
        >
          {isSaving ? <Loader2 size={12} className="animate-spin" /> : "Save"}
        </button>
        {onCancel && <button onClick={onCancel} className="p-1 text-slate-300"><X size={12} /></button>}
      </div>
    </div>
  );
}
