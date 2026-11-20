"use client";

import { useState } from "react";
import { Expense, editExpense, deleteExpense } from "./actions";
import { History, Calendar, Edit2, Trash2, Loader2, Check, X } from "lucide-react";
import { CATEGORIES } from "./constants";

export default function LogView({
  expenses,
  refresh,
}: {
  expenses: Expense[];
  refresh: (silent?: boolean) => void;
}) {
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [editForm, setEditForm] = useState({ description: "", amount: "", category: "Other" });
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Group only active expenses for the feed
  const groupedByDate = expenses.reduce<Record<string, Expense[]>>((acc, exp) => {
    const d = exp.expense_date.substring(0, 10);
    if (!acc[d]) acc[d] = [];
    acc[d].push(exp);
    return acc;
  }, {});

  const sortedDates = Object.keys(groupedByDate).sort((a, b) => b.localeCompare(a));

  const startEdit = (exp: Expense) => {
    setEditingExpense(exp);
    setEditForm({
      description: exp.description,
      amount: String(exp.amount),
      category: exp.category,
    });
  };

  const saveEdit = async () => {
    if (!editingExpense || !editForm.amount) return;
    setIsSaving(true);
    try {
      await editExpense(editingExpense.id, {
        description: editForm.description,
        amount: Number(editForm.amount),
        category: editForm.category,
        expense_date: editingExpense.expense_date,
      });
      setEditingExpense(null);
      refresh(true);
    } catch {
      alert("Error updating expense");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string, desc: string) => {
    if (!confirm(`Delete "${desc}"?`)) return;
    setDeletingId(id);
    try {
      await deleteExpense(id);
      refresh(true);
    } finally {
      setDeletingId(null);
    }
  };

  if (sortedDates.length === 0) {
    return (
      <div className="text-center py-16 bg-white border border-dashed border-slate-200 rounded-3xl p-6">
        <History size={40} className="mx-auto mb-3 text-slate-300" />
        <h3 className="text-base font-bold text-slate-800 mb-1">No expenses recorded for this month</h3>
        <p className="text-slate-400 text-xs max-w-sm mx-auto">
          Use the Quick Add bar above or switch to the 30-Day Ledger to log your expenses.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-h-[75vh] overflow-y-auto pr-1 custom-scrollbar">
      {sortedDates.map((date) => {
        const dayRecords = groupedByDate[date];
        const dayTotal = dayRecords.reduce((sum, e) => sum + Number(e.amount), 0);
        const dateObj = new Date(date + "T00:00:00");
        const formattedDate = dateObj.toLocaleDateString("en-US", {
          weekday: "short",
          month: "short",
          day: "numeric",
        });

        return (
          <div key={date} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
            {/* Day Header */}
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Calendar size={14} className="text-teal-600" />
                <span className="text-xs font-bold text-slate-800">{formattedDate}</span>
                <span className="text-[10px] text-slate-400 font-mono">({dayRecords.length} {dayRecords.length === 1 ? "item" : "items"})</span>
              </div>
              <span className="text-xs font-black font-mono text-slate-900 bg-slate-100 px-2.5 py-1 rounded-lg">
                Rs.{dayTotal.toLocaleString()}
              </span>
            </div>

            {/* List of expenses for this date */}
            <div className="space-y-2">
              {dayRecords.map((exp) => {
                const cat = CATEGORIES.find((c) => c.id === exp.category) || CATEGORIES[CATEGORIES.length - 1];
                const Icon = cat.icon;

                if (editingExpense?.id === exp.id) {
                  return (
                    <div key={exp.id} className="p-3 bg-amber-50 rounded-xl border border-amber-200 space-y-2">
                      <div className="flex flex-col sm:flex-row gap-2">
                        <select
                          value={editForm.category}
                          onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                          className="bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold"
                        >
                          {CATEGORIES.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.id}
                            </option>
                          ))}
                        </select>
                        <input
                          type="text"
                          value={editForm.description}
                          onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                          placeholder="Description..."
                          className="flex-1 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-medium"
                        />
                        <div className="relative sm:w-32">
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                            Rs.
                          </span>
                          <input
                            type="number"
                            value={editForm.amount}
                            onChange={(e) => setEditForm({ ...editForm, amount: e.target.value })}
                            className="w-full bg-white border border-slate-200 rounded-lg pl-8 pr-2.5 py-1.5 text-xs font-bold font-mono text-right"
                          />
                        </div>
                      </div>
                      <div className="flex justify-end gap-1.5">
                        <button
                          onClick={saveEdit}
                          disabled={isSaving}
                          className="px-3 py-1 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 flex items-center gap-1"
                        >
                          {isSaving ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />} Save
                        </button>
                        <button
                          onClick={() => setEditingExpense(null)}
                          className="px-2.5 py-1 bg-slate-200 text-slate-600 rounded-lg text-xs font-semibold hover:bg-slate-300"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  );
                }

                return (
                  <div
                    key={exp.id}
                    className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 transition-colors group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`p-2 rounded-xl shrink-0 ${cat.color}`}>
                        <Icon size={16} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-900 truncate">
                          {exp.description || exp.category}
                        </p>
                        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-tight">
                          {exp.category}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-sm font-bold font-mono text-slate-900">
                        Rs.{Number(exp.amount).toLocaleString()}
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          aria-label="Edit expense"
                          onClick={() => startEdit(exp)}
                          className="p-1.5 text-slate-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors cursor-pointer"
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          type="button"
                          aria-label="Delete expense"
                          onClick={() => handleDelete(exp.id, exp.description || exp.category)}
                          disabled={deletingId === exp.id}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        >
                          {deletingId === exp.id ? (
                            <Loader2 size={13} className="animate-spin" />
                          ) : (
                            <Trash2 size={13} />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
