"use client";

import { useState, useMemo } from "react";
import { Loader2, Trash2, Edit2, Check, X, Plus } from "lucide-react";
import { Expense, addExpense, editExpense, deleteExpense } from "./actions";
import { CATEGORIES } from "./constants";

export default function MonthlyLedger({
  expenses,
  month,
  refresh,
}: {
  expenses: Expense[];
  month: string;
  refresh: (silent?: boolean) => void;
}) {
  const [year, mo] = month.split("-").map(Number);
  const daysInMonth = new Date(year, mo, 0).getDate();
  const todayStr = new Date().toISOString().slice(0, 10);

  // Group expenses by day
  const expensesByDay = useMemo(() => {
    return expenses.reduce<Record<number, Expense[]>>((acc, exp) => {
      const datePart = exp.expense_date.substring(0, 10);
      const day = Number(datePart.split("-")[2]);

      if (!acc[day]) acc[day] = [];
      acc[day].push(exp);
      return acc;
    }, {});
  }, [expenses]);

  return (
    <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-xs">
      {/* Desktop Table Header (hidden on mobile) */}
      <div className="hidden sm:grid sm:grid-cols-[64px_130px_1fr_130px_88px] gap-3 bg-slate-50/80 px-5 py-3 border-b border-slate-200 text-[10px] font-black text-slate-400 uppercase tracking-widest">
        <div>Date</div>
        <div>Category</div>
        <div>Description</div>
        <div className="text-right">Amount (Rs.)</div>
        <div className="text-center">Action</div>
      </div>

      {/* Days Rows */}
      <div className="divide-y divide-slate-100 max-h-[75vh] overflow-y-auto custom-scrollbar">
        {Array.from({ length: daysInMonth }, (_, i) => {
          const day = i + 1;
          const dateStr = `${month}-${String(day).padStart(2, "0")}`;
          const dayRecords = expensesByDay[day] || [];
          const isToday = dateStr === todayStr;

          return (
            <LedgerDayGroup
              key={dateStr}
              day={day}
              dateStr={dateStr}
              records={dayRecords}
              isToday={isToday}
              refresh={refresh}
            />
          );
        })}
      </div>
    </div>
  );
}

function LedgerDayGroup({
  day,
  dateStr,
  records,
  isToday,
  refresh,
}: {
  day: number;
  dateStr: string;
  records: Expense[];
  isToday: boolean;
  refresh: (silent?: boolean) => void;
}) {
  const dayTotal = records.reduce((sum, r) => sum + Number(r.amount), 0);

  return (
    <div
      className={`transition-colors ${
        isToday ? "bg-teal-50/30" : records.length > 0 ? "bg-slate-50/20" : ""
      }`}
    >
      {records.length > 0 ? (
        <div className="divide-y divide-slate-100/70">
          {records.map((rec, i) => (
            <LedgerRow
              key={rec.id}
              expense={rec}
              dayDisplay={i === 0 ? day : ""}
              dayTotal={i === 0 ? dayTotal : undefined}
              dateStr={dateStr}
              isToday={isToday}
              refresh={refresh}
            />
          ))}
          {/* Empty input row for days with records to allow adding more instantly */}
          <LedgerInputRow
            dateStr={dateStr}
            dayDisplay=""
            isToday={isToday}
            placeholder
            refresh={refresh}
          />
        </div>
      ) : (
        <LedgerInputRow
          dateStr={dateStr}
          dayDisplay={day}
          isToday={isToday}
          placeholder
          refresh={refresh}
        />
      )}
    </div>
  );
}

function LedgerRow({
  expense,
  dayDisplay,
  dayTotal,
  dateStr,
  isToday,
  refresh,
}: {
  expense: Expense;
  dayDisplay: string | number;
  dayTotal?: number;
  dateStr: string;
  isToday: boolean;
  refresh: (silent?: boolean) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [form, setForm] = useState({
    amount: String(expense.amount),
    description: expense.description,
    category: expense.category,
  });

  const cat =
    CATEGORIES.find((c) => c.id === expense.category) ||
    CATEGORIES[CATEGORIES.length - 1];

  const handleUpdate = async () => {
    try {
      await editExpense(expense.id, {
        ...form,
        amount: Number(form.amount),
        expense_date: expense.expense_date,
      });
      setIsEditing(false);
      refresh(true);
    } catch {
      alert("Error saving update");
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Delete "${expense.description || expense.category}"?`)) return;
    setIsDeleting(true);
    await deleteExpense(expense.id);
    setIsDeleting(false);
    refresh(true);
  };

  if (isEditing) {
    return (
      <div className="p-3 sm:px-5 sm:py-2 bg-amber-50/60 border-l-4 border-amber-400 animate-in fade-in duration-150">
        <div className="flex flex-col sm:grid sm:grid-cols-[64px_130px_1fr_130px_88px] gap-2 sm:gap-3 sm:items-center">
          <div className="flex items-center justify-between sm:justify-start">
            <span className="text-xs font-bold text-slate-700">Day {dayDisplay || expense.expense_date.slice(8)}</span>
            {isToday && (
              <span className="text-[9px] font-black bg-teal-600 text-white px-1.5 py-0.5 rounded uppercase">
                Today
              </span>
            )}
          </div>
          <select
            value={form.category}
            onChange={(e) =>
              setForm({ ...form, category: e.target.value as Expense["category"] })
            }
            className="bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold focus:outline-none"
          >
            {CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.id}
              </option>
            ))}
          </select>
          <input
            type="text"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-medium focus:outline-none"
            placeholder="Description..."
          />
          <div className="relative">
            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
              Rs.
            </span>
            <input
              type="number"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              className="w-full bg-white border border-slate-200 rounded-lg pl-8 pr-2.5 py-1.5 text-xs font-bold font-mono text-right focus:outline-none"
            />
          </div>
          <div className="flex items-center justify-end sm:justify-center gap-1.5 pt-1 sm:pt-0">
            <button
              onClick={handleUpdate}
              className="px-2.5 py-1 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 flex items-center gap-1"
            >
              <Check size={13} /> Save
            </button>
            <button
              onClick={() => setIsEditing(false)}
              className="p-1 text-slate-400 hover:bg-slate-200/50 rounded-lg"
            >
              <X size={15} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-3 sm:px-5 sm:py-2.5 hover:bg-slate-50/80 transition-colors">
      <div className="flex flex-col sm:grid sm:grid-cols-[64px_130px_1fr_130px_88px] gap-2 sm:gap-3 sm:items-center">
        {/* Date Display */}
        <div className="flex items-center justify-between sm:justify-start gap-1.5">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-black text-slate-900 font-mono">
              {dayDisplay}
            </span>
            {isToday && (
              <span className="text-[9px] font-black bg-teal-600 text-white px-1.5 py-0.2 rounded uppercase">
                Today
              </span>
            )}
          </div>
          {/* Mobile-only daily subtotal */}
          {dayTotal !== undefined && dayTotal > 0 && (
            <span className="sm:hidden text-[10px] font-bold text-slate-400 font-mono">
              Day Total: Rs.{dayTotal.toLocaleString()}
            </span>
          )}
        </div>

        {/* Category */}
        <div className="flex items-center gap-1.5">
          <div
            className={`w-2 h-2 rounded-full ${cat.color
              .split(" ")[1]
              .replace("text-", "bg-")}`}
          />
          <span className="text-[11px] font-bold text-slate-700 uppercase tracking-tight truncate">
            {expense.category}
          </span>
        </div>

        {/* Description */}
        <div className="text-xs font-medium text-slate-900 truncate">
          {expense.description || <span className="text-slate-400 italic">No description</span>}
        </div>

        {/* Amount */}
        <div className="text-sm font-bold text-slate-900 font-mono text-left sm:text-right">
          Rs.{Number(expense.amount).toLocaleString()}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end sm:justify-center gap-1">
          <button
            type="button"
            aria-label="Edit expense"
            onClick={() => setIsEditing(true)}
            className="p-1.5 text-slate-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors cursor-pointer"
          >
            <Edit2 size={13} />
          </button>
          <button
            type="button"
            aria-label="Delete expense"
            onClick={handleDelete}
            disabled={isDeleting}
            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
          >
            {isDeleting ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
          </button>
        </div>
      </div>
    </div>
  );
}

function LedgerInputRow({
  dateStr,
  dayDisplay,
  isToday,
  placeholder,
  refresh,
}: {
  dateStr: string;
  dayDisplay: string | number;
  isToday: boolean;
  placeholder?: boolean;
  refresh: (silent?: boolean) => void;
}) {
  const [form, setForm] = useState({
    amount: "",
    description: "",
    category: "Other",
  });
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!form.amount || Number(form.amount) <= 0 || isSaving) return;
    setIsSaving(true);
    const res = await addExpense({
      ...form,
      amount: Number(form.amount),
      expense_date: dateStr,
    });
    setIsSaving(false);
    if (res.success) {
      setForm({ amount: "", description: "", category: "Other" });
      refresh(true);
    } else {
      alert("Save failed: " + res.error);
    }
  };

  return (
    <div
      className={`p-2.5 sm:px-5 sm:py-2 transition-all ${
        placeholder
          ? "opacity-50 hover:opacity-100 focus-within:opacity-100"
          : ""
      }`}
    >
      <div className="flex flex-col sm:grid sm:grid-cols-[64px_130px_1fr_130px_88px] gap-2 sm:gap-3 sm:items-center">
        {/* Date */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs sm:text-sm font-black text-slate-400 font-mono">
            {dayDisplay}
          </span>
          {isToday && (
            <span className="text-[9px] font-black bg-teal-600 text-white px-1.5 py-0.2 rounded uppercase">
              Today
            </span>
          )}
        </div>

        {/* Category Selector */}
        <select
          value={form.category}
          onChange={(e) => setForm({ ...form, category: e.target.value })}
          className="bg-transparent border-b border-slate-200 py-1 text-[11px] font-bold text-slate-600 uppercase focus:outline-none focus:border-teal-500 cursor-pointer"
        >
          {CATEGORIES.map((c) => (
            <option key={c.id} value={c.id}>
              {c.id}
            </option>
          ))}
        </select>

        {/* Description Input */}
        <input
          type="text"
          placeholder="Add expense..."
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          className="bg-transparent border-b border-slate-200 py-1 text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-teal-500"
          onKeyDown={(e) => e.key === "Enter" && handleSave()}
        />

        {/* Amount Input */}
        <div className="relative">
          <span className="absolute left-0 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-mono">
            Rs.
          </span>
          <input
            type="number"
            placeholder="0"
            value={form.amount}
            onChange={(e) => setForm({ ...form, amount: e.target.value })}
            className="w-full bg-transparent border-b border-slate-200 pl-6 py-1 text-xs font-bold font-mono text-left sm:text-right text-slate-900 placeholder:text-slate-300 focus:outline-none focus:border-teal-500"
            onKeyDown={(e) => e.key === "Enter" && handleSave()}
          />
        </div>

        {/* Save Button */}
        <div className="flex items-center justify-end sm:justify-center">
          <button
            onClick={handleSave}
            disabled={!form.amount || isSaving}
            className="h-7 px-3 bg-slate-900 text-white rounded-lg text-xs font-bold hover:bg-slate-800 disabled:opacity-20 transition-all flex items-center gap-1 cursor-pointer"
          >
            {isSaving ? <Loader2 size={12} className="animate-spin" /> : <Plus size={13} />}
            <span>Save</span>
          </button>
        </div>
      </div>
    </div>
  );
}
