"use client";

import { useState, useRef } from "react";
import { Plus, Loader2, Zap } from "lucide-react";
import { addExpense } from "./actions";
import { CATEGORIES } from "./constants";

export default function QuickAdd({ defaultDate }: { defaultDate?: string }) {
  const [isSaving, setIsSaving] = useState(false);
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Other");
  const amountRef = useRef<HTMLInputElement>(null);

  const handleQuickSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || Number(amount) <= 0) return;

    setIsSaving(true);
    try {
      const result = await addExpense({
        amount: Number(amount),
        description: description || category, // Default description to category if empty
        category,
        expense_date: defaultDate || new Date().toISOString().slice(0, 10),
      });

      if (result.success) {
        setAmount("");
        setDescription("");
        amountRef.current?.focus();
      } else {
        alert("Error saving: " + result.error);
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-white border-2 border-slate-900 rounded-[32px] p-4 shadow-xl shadow-slate-200">
      <form onSubmit={handleQuickSave} className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex-1 relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-lg">Rs.</span>
            <input
              ref={amountRef}
              type="number"
              placeholder="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full pl-12 pr-4 py-4 bg-slate-50 border-none rounded-2xl text-2xl font-bold font-mono focus:ring-2 focus:ring-slate-900 transition-all"
              required
            />
          </div>
          <div className="flex-[1.5]">
            <input
              type="text"
              placeholder="What was it for? (Optional)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-4 bg-slate-50 border-none rounded-2xl text-lg font-medium focus:ring-2 focus:ring-slate-900 transition-all"
            />
          </div>
          <button
            type="submit"
            disabled={isSaving || !amount}
            className="h-16 w-16 rounded-2xl bg-slate-900 text-white flex items-center justify-center hover:bg-slate-800 disabled:opacity-50 transition-all flex-shrink-0"
          >
            {isSaving ? <Loader2 className="animate-spin" /> : <Plus size={28} />}
          </button>
        </div>

        <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100">
          <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-100 text-slate-500 rounded-lg text-[10px] font-bold uppercase tracking-widest mr-2">
            <Zap size={10} /> Quick Category
          </div>
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setCategory(cat.id)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border-2 ${
                category === cat.id
                  ? "bg-slate-900 text-white border-slate-900 shadow-md translate-y-[-2px]"
                  : "bg-white text-slate-400 border-slate-100 hover:border-slate-300"
              }`}
            >
              {cat.id}
            </button>
          ))}
        </div>
      </form>
    </div>
  );
}
