"use client";

import { useState, useRef } from "react";
import { Plus, Loader2, Zap } from "lucide-react";
import { addExpense } from "./actions";
import { CATEGORIES } from "./constants";

export default function QuickAdd({
  defaultDate,
  onSaved,
}: {
  defaultDate?: string;
  onSaved?: () => void;
}) {
  const [isSaving, setIsSaving] = useState(false);
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Other");
  const amountRef = useRef<HTMLInputElement>(null);

  const effectiveDate = defaultDate || new Date().toISOString().slice(0, 10);

  const handleQuickSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!amount || Number(amount) <= 0 || isSaving) return;

    setIsSaving(true);
    try {
      const result = await addExpense({
        amount: Number(amount),
        description: description.trim() || category,
        category,
        expense_date: effectiveDate,
      });

      if (result.success) {
        setAmount("");
        setDescription("");
        onSaved?.();
        amountRef.current?.focus();
      } else {
        alert("Error saving: " + result.error);
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-4 sm:p-5 shadow-sm mb-6">
      <form onSubmit={handleQuickSave} className="space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3">
          {/* Amount Input */}
          <div className="relative flex-1 sm:max-w-xs">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-sm">
              Rs.
            </span>
            <input
              ref={amountRef}
              type="number"
              placeholder="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-lg font-bold font-mono text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all"
              required
            />
          </div>

          {/* Description Input */}
          <div className="flex-[1.5]">
            <input
              type="text"
              placeholder="What was it for? (Optional)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all"
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSaving || !amount}
            className="h-11 px-5 rounded-xl bg-slate-900 text-white flex items-center justify-center gap-2 font-bold text-sm hover:bg-slate-800 disabled:opacity-40 transition-all shrink-0 cursor-pointer shadow-md shadow-slate-900/10"
          >
            {isSaving ? (
              <Loader2 className="animate-spin" size={16} />
            ) : (
              <>
                <Plus size={16} />
                <span>Quick Add</span>
              </>
            )}
          </button>
        </div>

        {/* Quick Category Selector */}
        <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-100">
          <div className="flex items-center gap-1 px-2 py-0.5 text-slate-400 text-[10px] font-bold uppercase tracking-wider shrink-0 mr-1">
            <Zap size={11} className="text-amber-500" />
            <span>Category:</span>
          </div>
          {CATEGORIES.map((cat) => {
            const isSelected = category === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setCategory(cat.id)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  isSelected
                    ? "bg-slate-900 text-white shadow-xs"
                    : "bg-slate-100/80 text-slate-600 hover:bg-slate-200/70"
                }`}
              >
                {cat.id}
              </button>
            );
          })}
        </div>
      </form>
    </div>
  );
}
