"use client";

import { useState } from "react";
import { 
  Plus, Edit2, Trash2, X, Save, Loader2, 
  Banknote, ShoppingCart, Flame, Wifi, MoreHorizontal, Calendar 
} from "lucide-react";
import { addExpense, editExpense, deleteExpense, Expense } from "./actions";

const CATEGORIES = [
  { id: "Loan Fee", icon: Banknote, color: "bg-blue-100 text-blue-600" },
  { id: "Vegetables", icon: ShoppingCart, color: "bg-emerald-100 text-emerald-600" },
  { id: "Rice", icon: ShoppingCart, color: "bg-amber-100 text-amber-600" },
  { id: "Gas", icon: Flame, color: "bg-orange-100 text-orange-600" },
  { id: "WiFi (Home)", icon: Wifi, color: "bg-indigo-100 text-indigo-600" },
  { id: "WiFi (Bhada)", icon: Wifi, color: "bg-purple-100 text-purple-600" },
  { id: "Other", icon: MoreHorizontal, color: "bg-slate-100 text-slate-600" },
];

export default function ExpenseList({ 
  initialExpenses, 
  month 
}: { 
  initialExpenses: Expense[]; 
  month: string 
}) {
  const [showModal, setShowModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  const [form, setForm] = useState({
    description: "",
    amount: "",
    category: "Other",
    expense_date: new Date().toISOString().slice(0, 10),
  });

  const resetForm = () => {
    setForm({
      description: "",
      amount: "",
      category: "Other",
      expense_date: new Date().toISOString().slice(0, 10),
    });
    setEditingExpense(null);
  };

  const handleEdit = (exp: Expense) => {
    setEditingExpense(exp);
    setForm({
      description: exp.description,
      amount: String(exp.amount),
      category: exp.category,
      expense_date: exp.expense_date,
    });
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const payload = {
        ...form,
        amount: Number(form.amount),
      };

      const result = editingExpense 
        ? await editExpense(editingExpense.id, payload)
        : await addExpense(payload);

      if (result.success) {
        setShowModal(false);
        resetForm();
      } else {
        alert("Error: " + result.error);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this expense?")) return;
    setIsDeleting(id);
    try {
      await deleteExpense(id);
    } finally {
      setIsDeleting(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <button
          onClick={() => { resetForm(); setShowModal(true); }}
          className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2.5 rounded-xl font-bold text-sm shadow-xl shadow-slate-900/20 hover:bg-slate-800 transition-all"
        >
          <Plus size={18} /> Add New Expense
        </button>
      </div>

      {initialExpenses.length === 0 ? (
        <div className="text-center py-20 bg-white border border-dashed border-slate-200 rounded-3xl">
          <Calendar size={40} className="mx-auto mb-3 text-slate-200" />
          <p className="text-slate-500 font-medium">No expenses recorded for this month.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {initialExpenses.map((exp) => {
            const cat = CATEGORIES.find(c => c.id === exp.category) || CATEGORIES[CATEGORIES.length - 1];
            const Icon = cat.icon;
            
            return (
              <div 
                key={exp.id}
                className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center justify-between group hover:border-slate-300 transition-all"
              >
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-xl ${cat.color}`}>
                    <Icon size={20} />
                  </div>
                  <div>
                    <p className="font-bold text-slate-900">{exp.description}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-tighter">{exp.category}</span>
                      <span className="w-1 h-1 rounded-full bg-slate-200"></span>
                      <span className="text-xs text-slate-400 font-medium">{new Date(exp.expense_date).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-6">
                  <p className="text-lg font-bold text-slate-900 font-mono">Rs.{exp.amount.toLocaleString()}</p>
                  <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                    <button 
                      type="button"
                      aria-label={`Edit ${exp.description}`}
                      onClick={() => handleEdit(exp)}
                      className="p-2 text-slate-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-all"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button 
                      type="button"
                      aria-label={`Delete ${exp.description}`}
                      onClick={() => handleDelete(exp.id)}
                      disabled={isDeleting === exp.id}
                      className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                    >
                      {isDeleting === exp.id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[32px] w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900">{editingExpense ? "Edit Expense" : "Add Expense"}</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">Description</label>
                <input 
                  type="text" 
                  required
                  value={form.description}
                  onChange={e => setForm({...form, description: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:border-slate-400 transition-all"
                  placeholder="e.g. Weekly Vegetables"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">Amount (Rs.)</label>
                  <input 
                    type="number" 
                    required
                    value={form.amount}
                    onChange={e => setForm({...form, amount: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold font-mono focus:outline-none focus:border-slate-400 transition-all"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">Date</label>
                  <input 
                    type="date" 
                    required
                    value={form.expense_date}
                    onChange={e => setForm({...form, expense_date: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:border-slate-400 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 block">Category</label>
                <div className="grid grid-cols-2 gap-2">
                  {CATEGORIES.map(cat => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setForm({...form, category: cat.id})}
                      className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 transition-all text-sm font-bold ${form.category === cat.id ? 'border-slate-900 bg-slate-50 text-slate-900' : 'border-transparent bg-slate-50 text-slate-400 hover:bg-slate-100'}`}
                    >
                      <cat.icon size={16} />
                      {cat.id}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={isSaving}
                className="w-full bg-slate-900 text-white rounded-2xl py-4 font-bold text-sm shadow-xl shadow-slate-900/20 flex items-center justify-center gap-2 hover:bg-slate-800 disabled:opacity-50 transition-all mt-4"
              >
                {isSaving ? <Loader2 className="animate-spin" size={20} /> : <Save size={18} />}
                {editingExpense ? "Update Expense" : "Save Expense"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
