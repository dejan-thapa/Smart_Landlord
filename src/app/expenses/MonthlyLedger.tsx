"use client";

import { useState, useMemo } from "react";
import { Loader2, Trash2, Edit2, Check, X, Plus, Calendar } from "lucide-react";
import NepaliDate from "nepali-date-converter";
import { Expense, addExpense, editExpense, deleteExpense } from "./actions";
import { CATEGORIES } from "./constants";
import { getNepalTodayDate } from "./QuickAdd";

function formatDayHeader(dateStr: string): { primary: string; nepali: string } {
  try {
    const d = new Date(dateStr + "T12:00:00");
    const primary = d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      weekday: "short",
    });
    const nepali = new NepaliDate(d).format("MMMM D");
    return { primary, nepali };
  } catch {
    return { primary: dateStr, nepali: "" };
  }
}

export default function MonthlyLedger({
  expenses,
  month,
  refresh,
}: {
  expenses: Expense[];
  month: string;
  refresh: (silent?: boolean) => void;
}) {
  const todayStr = getNepalTodayDate();
  const [year, mo] = month.split("-").map(Number);
  const daysInMonth = new Date(year, mo, 0).getDate();

  // Record new inline entries on today's actual recorded date (or within the viewed month)
  const recordedDateForMonth = useMemo(() => {
    if (todayStr.startsWith(month)) return todayStr;
    const todayDay = Number(todayStr.slice(8, 10)) || 1;
    const safeDay = String(Math.min(todayDay, daysInMonth)).padStart(2, "0");
    return `${month}-${safeDay}`;
  }, [todayStr, month, daysInMonth]);

  // Group expenses by YYYY-MM-DD date, sorted newest date first
  const groupedDays = useMemo(() => {
    const map = new Map<string, Expense[]>();
    for (const exp of expenses) {
      const dateStr = exp.expense_date.substring(0, 10);
      const list = map.get(dateStr) || [];
      list.push(exp);
      map.set(dateStr, list);
    }
    return Array.from(map.entries()).sort((a, b) => b[0].localeCompare(a[0]));
  }, [expenses]);

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-xs">
      {/* Desktop Table Header (hidden on mobile) */}
      <div className="hidden sm:grid sm:grid-cols-[150px_130px_1fr_130px_88px] gap-3 bg-slate-50 dark:bg-slate-800/70 px-5 py-3 border-b border-slate-200 dark:border-slate-800 text-[10px] font-black text-slate-400 uppercase tracking-widest">
        <div>Recorded Date</div>
        <div>Category</div>
        <div>Description</div>
        <div className="text-right">Amount (Rs.)</div>
        <div className="text-center">Action</div>
      </div>

      {/* Inline Quick Entry Row — always saves to the current recorded date */}
      <LedgerInputRow
        dateStr={recordedDateForMonth}
        isToday={recordedDateForMonth === todayStr}
        refresh={refresh}
      />

      {/* Recorded Days */}
      {groupedDays.length === 0 ? (
        <div className="py-14 px-4 text-center text-slate-400 text-xs">
          No expenses recorded for this month yet. Enter an expense above to log it on today&apos;s date.
        </div>
      ) : (
        <div className="divide-y divide-slate-200/70 dark:divide-slate-800 max-h-[75vh] overflow-y-auto custom-scrollbar">
          {groupedDays.map(([dateStr, dayRecords]) => (
            <LedgerDayGroup
              key={dateStr}
              dateStr={dateStr}
              records={dayRecords}
              isToday={dateStr === todayStr}
              refresh={refresh}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function LedgerDayGroup({
  dateStr,
  records,
  isToday,
  refresh,
}: {
  dateStr: string;
  records: Expense[];
  isToday: boolean;
  refresh: (silent?: boolean) => void;
}) {
  const dayTotal = records.reduce((sum, r) => sum + Number(r.amount), 0);
  const { primary, nepali } = formatDayHeader(dateStr);

  return (
    <div className={isToday ? "bg-teal-50/20 dark:bg-teal-950/15" : ""}>
      {/* Day Group Header Bar */}
      <div className="flex items-center justify-between px-3.5 sm:px-5 py-2 bg-slate-50/90 dark:bg-slate-800/60 border-b border-slate-100 dark:border-slate-800/80">
        <div className="flex items-center gap-2 min-w-0">
          <Calendar size={13} className="text-teal-600 dark:text-teal-400 shrink-0" />
          <span className="text-xs font-extrabold text-slate-900 dark:text-slate-100">
            {primary}
          </span>
          {nepali && (
            <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-400">
              • {nepali}
            </span>
          )}
        </div>
        <span className="text-xs font-black text-slate-700 dark:text-slate-200 font-mono">
          Day Total: Rs.{dayTotal.toLocaleString()}
        </span>
      </div>

      {/* Expense Items for this Date */}
      <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
        {records.map((rec) => (
          <LedgerRow
            key={rec.id}
            expense={rec}
            dateLabel={primary}
            refresh={refresh}
          />
        ))}
      </div>
    </div>
  );
}

function LedgerRow({
  expense,
  dateLabel,
  refresh,
}: {
  expense: Expense;
  dateLabel: string;
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

  const dotColor = cat.color.split(" ")[1]?.replace("text-", "bg-") || "bg-slate-400";

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
      <div className="p-3 sm:px-5 sm:py-2.5 bg-amber-50/60 dark:bg-amber-950/20 border-l-4 border-amber-400">
        <div className="flex flex-col sm:grid sm:grid-cols-[150px_130px_1fr_130px_88px] gap-2 sm:gap-3 sm:items-center">
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap">{dateLabel}</span>
          <select
            value={form.category}
            onChange={(e) =>
              setForm({ ...form, category: e.target.value as Expense["category"] })
            }
            className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-bold focus:outline-none"
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
            className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-medium focus:outline-none"
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
              className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg pl-8 pr-2.5 py-1.5 text-xs font-bold font-mono text-right focus:outline-none"
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
              className="p-1 text-slate-400 hover:bg-slate-200/50 dark:hover:bg-slate-800 rounded-lg"
            >
              <X size={15} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="px-3.5 py-2.5 sm:px-5 sm:py-2.5 hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
      {/* Compact single-line layout on mobile, 5-column grid on desktop */}
      <div className="flex items-center justify-between gap-2 sm:grid sm:grid-cols-[150px_130px_1fr_130px_88px] sm:gap-3">
        {/* Desktop Date column */}
        <div className="hidden sm:flex items-center gap-1.5 text-xs font-bold text-slate-600 dark:text-slate-400 whitespace-nowrap">
          {dateLabel}
        </div>

        {/* Desktop Category column */}
        <div className="hidden sm:flex items-center gap-1.5">
          <div className={`w-2 h-2 rounded-full shrink-0 ${dotColor}`} />
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-tight truncate">
            {expense.category}
          </span>
        </div>

        {/* Mobile Left + Desktop Description */}
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <div className={`sm:hidden w-2 h-2 rounded-full shrink-0 ${dotColor}`} />
          <span className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
            {expense.description || expense.category}
          </span>
          <span className="sm:hidden text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 shrink-0">
            {expense.category}
          </span>
        </div>

        {/* Amount + Actions */}
        <div className="flex items-center gap-2 sm:contents shrink-0">
          <div className="text-sm font-bold text-slate-900 dark:text-white font-mono text-right">
            Rs.{Number(expense.amount).toLocaleString()}
          </div>

          <div className="flex items-center justify-end sm:justify-center gap-0.5 sm:gap-1">
            <button
              type="button"
              aria-label="Edit expense"
              onClick={() => setIsEditing(true)}
              className="p-1.5 text-slate-400 hover:text-teal-600 dark:hover:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-950/40 rounded-lg transition-colors cursor-pointer"
            >
              <Edit2 size={13} />
            </button>
            <button
              type="button"
              aria-label="Delete expense"
              onClick={handleDelete}
              disabled={isDeleting}
              className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
            >
              {isDeleting ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function LedgerInputRow({
  dateStr,
  isToday,
  refresh,
}: {
  dateStr: string;
  isToday: boolean;
  refresh: (silent?: boolean) => void;
}) {
  const [form, setForm] = useState({
    amount: "",
    description: "",
    category: "Other",
  });
  const [isSaving, setIsSaving] = useState(false);
  const { primary } = formatDayHeader(dateStr);

  const handleSave = async () => {
    if (!form.amount || Number(form.amount) <= 0 || isSaving) return;
    setIsSaving(true);
    const res = await addExpense({
      ...form,
      description: form.description.trim() || form.category,
      amount: Number(form.amount),
      expense_date: getNepalTodayDate().startsWith(dateStr.slice(0, 7))
        ? getNepalTodayDate()
        : dateStr,
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
    <div className="hidden sm:block px-5 py-2.5 bg-teal-50/40 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800">
      <div className="grid grid-cols-[150px_130px_1fr_130px_88px] gap-3 items-center">
        {/* Date (auto-set to today) */}
        <div className="flex items-center gap-1.5 whitespace-nowrap">
          <span className="text-xs font-bold text-teal-700 dark:text-teal-400">
            {primary}
          </span>
          {isToday && (
            <span className="text-[9px] font-black bg-teal-600 text-white px-1.5 py-0.5 rounded uppercase shrink-0">
              Today
            </span>
          )}
        </div>

        {/* Category Selector */}
        <select
          value={form.category}
          onChange={(e) => setForm({ ...form, category: e.target.value })}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-200 uppercase focus:outline-none focus:border-teal-500 cursor-pointer"
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
          placeholder="Add expense for today..."
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-teal-500"
          onKeyDown={(e) => e.key === "Enter" && handleSave()}
        />

        {/* Amount Input */}
        <div className="relative">
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-mono">
            Rs.
          </span>
          <input
            type="number"
            placeholder="0"
            value={form.amount}
            onChange={(e) => setForm({ ...form, amount: e.target.value })}
            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg pl-8 pr-2.5 py-1.5 text-xs font-bold font-mono text-right text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-teal-500"
            onKeyDown={(e) => e.key === "Enter" && handleSave()}
          />
        </div>

        {/* Save Button */}
        <div className="flex items-center justify-center">
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="h-8 px-3 bg-teal-600 text-white rounded-lg text-xs font-bold hover:bg-teal-500 disabled:opacity-60 transition-all flex items-center gap-1 cursor-pointer"
          >
            {isSaving ? <Loader2 size={12} className="animate-spin text-white" /> : <Plus size={13} strokeWidth={2.5} className="text-white" />}
            <span className="text-white">Save</span>
          </button>
        </div>
      </div>
    </div>
  );
}
