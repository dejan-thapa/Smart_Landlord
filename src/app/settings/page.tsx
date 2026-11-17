"use client";

import { useState, useEffect, useTransition } from "react";
import Link from "next/link";
import {
  ArrowLeft, Settings, Plus, UserX, UserCheck, Edit2,
  Loader2, CheckCircle2, AlertCircle, X, ChevronDown, Save
} from "lucide-react";
import { fetchTenants, addTenant, editTenant, deactivateTenant, activateTenant } from "./actions";
import { getErrorMessage } from "@/lib/types";

type Tenant = {
  id: string;
  name: string;
  room_no: string;
  base_rent: number;
  water_rate: number;
  wifi_rate: number;
  garbage_rate: number;
  email: string | null;
  phone_number: string | null;
  room_side: string;
  is_active: boolean;
};

type Toast = { type: "success" | "error"; message: string } | null;

const EMPTY_FORM = { 
  name: "", room_no: "", base_rent: "", 
  water_rate: "0", wifi_rate: "0", garbage_rate: "0",
  email: "", phone_number: "", room_side: "Side A" 
};

export default function SettingsPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [toast, setToast] = useState<Toast>(null);
  const [isPending, startTransition] = useTransition();
  const [showInactive, setShowInactive] = useState(false);

  const load = () => {
    fetchTenants().then((data) => {
      setTenants(data as Tenant[]);
      setLoading(false);
    });
  };

  useEffect(() => { load(); }, []);

  const showToast = (t: Toast) => {
    setToast(t);
    setTimeout(() => setToast(null), 4000);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const payload = {
        name: form.name.trim() || null,
        room_no: form.room_no,
        room_side: form.room_side,
        base_rent: Number(form.base_rent),
        water_rate: Number(form.water_rate),
        wifi_rate: Number(form.wifi_rate),
        garbage_rate: Number(form.garbage_rate),
        email: form.email.trim() || null,
        phone_number: form.phone_number.trim() || null,
      };

      try {
        const result = editingId 
          ? await editTenant(editingId, payload)
          : await addTenant(payload);

        if (result.success) {
          showToast({ type: "success", message: `Tenant "${form.name || form.room_no}" ${editingId ? 'updated' : 'added'}!` });
          setForm(EMPTY_FORM);
          setEditingId(null);
          setShowForm(false);
          load();
        } else {
          showToast({ type: "error", message: result.error || "Failed to save tenant." });
        }
      } catch (err) {
        showToast({
          type: "error",
          message: getErrorMessage(err, "Failed to connect to database. Check if your Supabase project is active."),
        });
      }
    });
  };

  const handleEditClick = (tenant: Tenant) => {
    setForm({
      name: tenant.name || "",
      room_no: tenant.room_no || "",
      base_rent: String(tenant.base_rent),
      water_rate: String(tenant.water_rate || 0),
      wifi_rate: String(tenant.wifi_rate || 0),
      garbage_rate: String(tenant.garbage_rate || 0),
      email: tenant.email || "",
      phone_number: tenant.phone_number || "",
      room_side: tenant.room_side || "Side A"
    });
    setEditingId(tenant.id);
    setShowForm(true);
  };

  const handleToggle = (tenant: Tenant) => {
    startTransition(async () => {
      const result = tenant.is_active
        ? await deactivateTenant(tenant.id)
        : await activateTenant(tenant.id);
      if (result.success) {
        showToast({
          type: "success",
          message: `${tenant.name} marked as ${tenant.is_active ? "inactive" : "active"}.`,
        });
        load();
      } else {
        showToast({ type: "error", message: result.error || "Failed to update." });
      }
    });
  };

  const active = tenants.filter((t) => t.is_active);
  const inactive = tenants.filter((t) => !t.is_active);

  return (
    <main className="max-w-4xl mx-auto p-4 md:p-6 pb-12">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-3 rounded-2xl shadow-xl text-sm font-semibold ${toast.type === "success" ? "bg-emerald-600 text-white" : "bg-red-600 text-white"}`}>
          {toast.type === "success" ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          {toast.message}
        </div>
      )}

      {/* Header */}
      <header className="flex items-center gap-4 mb-8 pt-4">
        <Link href="/" aria-label="Back to Dashboard" className="h-10 w-10 rounded-full bg-white border border-slate-200 shadow-sm flex items-center justify-center text-slate-600 hover:bg-slate-50 transition-colors">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2 text-slate-900">
            <Settings size={20} aria-hidden="true" className="text-teal-600" />
            Settings
          </h1>
          <p className="text-slate-500 font-medium text-sm">Manage tenants &amp; rooms</p>
        </div>
        <button
          type="button"
          onClick={() => {
            setForm(EMPTY_FORM);
            setEditingId(null);
            setShowForm(true);
          }}
          className="ml-auto flex items-center gap-1.5 bg-teal-700 hover:bg-teal-600 text-white px-4 py-2.5 rounded-xl text-sm font-bold transition-all shadow-lg shadow-teal-900/20 cursor-pointer"
        >
          <Plus size={16} aria-hidden="true" /> Add Tenant
        </button>
      </header>

      {/* Add/Edit Tenant Modal */}
      {showForm && (
        <div role="dialog" aria-modal="true" aria-label={editingId ? "Edit Tenant" : "New Tenant"} className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 flex items-end md:items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-slate-100 sticky top-0 bg-white/95 backdrop-blur-sm z-10">
              <h2 className="text-lg font-bold text-slate-900">{editingId ? "Edit Tenant" : "New Tenant"}</h2>
              <button type="button" aria-label="Close tenant form" onClick={() => setShowForm(false)} className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSave} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="text-xs text-slate-400 uppercase font-bold tracking-wider block mb-1">Full Name (Optional)</label>
                  <input type="text" value={form.name} onChange={(e) => setForm(f => ({...f, name: e.target.value}))} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-slate-900 placeholder:text-slate-300 focus:outline-none focus:border-blue-500" placeholder="e.g. John Doe" />
                </div>
                <div>
                  <label className="text-xs text-slate-400 uppercase font-bold tracking-wider block mb-1">Room No.</label>
                  <input type="text" required value={form.room_no} onChange={(e) => setForm(f => ({...f, room_no: e.target.value}))} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-slate-900 placeholder:text-slate-300 focus:outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="text-xs text-slate-400 uppercase font-bold tracking-wider block mb-1">Base Rent</label>
                  <input type="number" required value={form.base_rent} onChange={(e) => setForm(f => ({...f, base_rent: e.target.value}))} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-slate-900 placeholder:text-slate-300 focus:outline-none focus:border-blue-500" />
                </div>
                
                <div className="col-span-2">
                  <label className="text-xs text-slate-400 uppercase font-bold tracking-wider block mb-2">Room Side</label>
                  <div className="flex bg-slate-100 p-1 rounded-xl text-sm font-bold shadow-inner">
                    {["Side A", "Side B", "Other"].map((side) => (
                      <button
                        key={side}
                        type="button"
                        onClick={() => setForm(f => ({...f, room_side: side}))}
                        className={`flex-1 text-center py-2 rounded-lg transition-all ${form.room_side === side ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
                      >
                        {side}
                      </button>
                    ))}
                  </div>
                </div>
                
                {/* Custom Rates */}
                <div className="col-span-2 mt-2 pt-4 border-t border-slate-100">
                  <p className="text-sm font-bold text-slate-700 mb-3">Monthly Fixed Utilities</p>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block mb-1">Water Rate</label>
                      <input type="number" value={form.water_rate} onChange={(e) => setForm(f => ({...f, water_rate: e.target.value}))} className="w-full bg-sky-50 border border-sky-100 rounded-xl px-3 py-2 text-sm font-medium text-slate-900 focus:outline-none focus:border-sky-400" />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block mb-1">WiFi Rate</label>
                      <input type="number" value={form.wifi_rate} onChange={(e) => setForm(f => ({...f, wifi_rate: e.target.value}))} className="w-full bg-violet-50 border border-violet-100 rounded-xl px-3 py-2 text-sm font-medium text-slate-900 focus:outline-none focus:border-violet-400" />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block mb-1">Garbage Rate</label>
                      <input type="number" value={form.garbage_rate} onChange={(e) => setForm(f => ({...f, garbage_rate: e.target.value}))} className="w-full bg-orange-50 border border-orange-100 rounded-xl px-3 py-2 text-sm font-medium text-slate-900 focus:outline-none focus:border-orange-400" />
                    </div>
                  </div>
                </div>

                <div className="col-span-2 mt-2 pt-4 border-t border-slate-100">
                  <label className="text-xs text-slate-400 uppercase font-bold tracking-wider block mb-1">Email (optional)</label>
                  <input type="email" value={form.email} onChange={(e) => setForm(f => ({...f, email: e.target.value}))} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-slate-900 placeholder:text-slate-300 focus:outline-none focus:border-blue-500" />
                </div>
                <div className="col-span-2">
                  <label className="text-xs text-slate-400 uppercase font-bold tracking-wider block mb-1">Phone (optional)</label>
                  <input type="text" value={form.phone_number} onChange={(e) => setForm(f => ({...f, phone_number: e.target.value}))} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-slate-900 placeholder:text-slate-300 focus:outline-none focus:border-blue-500" />
                </div>
              </div>
              
              <button
                type="submit"
                disabled={isPending}
                className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white rounded-xl py-4 font-bold text-sm flex items-center justify-center gap-2 transition-all mt-4 shadow-lg shadow-blue-500/20"
              >
                {isPending ? <><Loader2 size={16} className="animate-spin" /> Saving…</> : <><Save size={16} /> Save Tenant</>}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Active Tenants */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-slate-400 gap-3">
          <Loader2 size={28} className="animate-spin" />
          <span className="text-sm font-medium">Loading tenants…</span>
        </div>
      ) : (
        <>
          <div className="mb-4">
            <p className="text-xs text-slate-400 uppercase font-bold tracking-wider mb-4">Active Tenants ({active.length})</p>
            
            {active.length === 0 ? (
              <div className="text-center py-10 text-slate-400 bg-white border border-dashed border-slate-200 rounded-2xl">
                <p className="text-sm font-medium">No active tenants yet.</p>
                <p className="text-xs mt-1">Click &quot;Add Tenant&quot; to get started.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                {/* Side A on the left */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-2">
                    <h2 className="text-sm font-bold text-slate-800 bg-slate-100 px-3 py-1 rounded-lg tracking-wider uppercase">Side A</h2>
                    <div className="h-px bg-slate-200 flex-1"></div>
                  </div>
                  {active.filter(t => (t.room_side || "Other") === "Side A").length === 0 ? (
                    <p className="text-xs text-slate-400 font-medium">No tenants on this side.</p>
                  ) : (
                    active.filter(t => (t.room_side || "Other") === "Side A").map((tenant) => (
                      <TenantCard key={tenant.id} tenant={tenant} onEdit={() => handleEditClick(tenant)} onToggle={handleToggle} isPending={isPending} />
                    ))
                  )}
                </div>

                {/* Side B on the right */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-2">
                    <h2 className="text-sm font-bold text-slate-800 bg-slate-100 px-3 py-1 rounded-lg tracking-wider uppercase">Side B</h2>
                    <div className="h-px bg-slate-200 flex-1"></div>
                  </div>
                  {active.filter(t => (t.room_side || "Other") === "Side B").length === 0 ? (
                    <p className="text-xs text-slate-400 font-medium">No tenants on this side.</p>
                  ) : (
                    active.filter(t => (t.room_side || "Other") === "Side B").map((tenant) => (
                      <TenantCard key={tenant.id} tenant={tenant} onEdit={() => handleEditClick(tenant)} onToggle={handleToggle} isPending={isPending} />
                    ))
                  )}
                  
                  {/* Other category if any */}
                  {active.filter(t => !["Side A", "Side B"].includes(t.room_side || "Other")).length > 0 && (
                    <div className="mt-8 space-y-4">
                      <div className="flex items-center gap-2 mb-2">
                        <h2 className="text-sm font-bold text-slate-800 bg-slate-100 px-3 py-1 rounded-lg tracking-wider uppercase">Other</h2>
                        <div className="h-px bg-slate-200 flex-1"></div>
                      </div>
                      {active.filter(t => !["Side A", "Side B"].includes(t.room_side || "Other")).map((tenant) => (
                        <TenantCard key={tenant.id} tenant={tenant} onEdit={() => handleEditClick(tenant)} onToggle={handleToggle} isPending={isPending} />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Inactive collapse */}
          {inactive.length > 0 && (
            <div>
              <button
                onClick={() => setShowInactive((s) => !s)}
                className="flex items-center gap-2 text-xs text-slate-400 uppercase font-bold tracking-wider mb-3 hover:text-slate-600 transition-colors"
              >
                <ChevronDown size={14} className={`transition-transform ${showInactive ? "rotate-180" : ""}`} />
                Inactive Tenants ({inactive.length})
              </button>
              {showInactive && (
                <div className="space-y-3 opacity-60">
                  {inactive.map((tenant) => (
                    <TenantCard key={tenant.id} tenant={tenant} onEdit={() => handleEditClick(tenant)} onToggle={handleToggle} isPending={isPending} />
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </main>
  );
}

function TenantCard({ tenant, onEdit, onToggle, isPending }: { tenant: Tenant; onEdit: () => void; onToggle: (t: Tenant) => void; isPending: boolean }) {
  return (
    <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-4 flex items-center justify-between gap-3 group transition-all hover:border-slate-300">
      <div className="flex items-center gap-3">
        <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-blue-400 to-indigo-600 flex items-center justify-center text-white font-bold text-base shadow-lg shadow-blue-500/20 flex-shrink-0">
          {tenant.name ? tenant.name.charAt(0).toUpperCase() : tenant.room_no.charAt(0).toUpperCase()}
        </div>
        <div>
          <p className="font-bold text-slate-900">{tenant.name || `Room ${tenant.room_no} Tenant`}</p>
          <div className="text-xs text-slate-500 font-medium mt-0.5 flex items-center gap-2 flex-wrap">
            <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider">{tenant.room_side || "Other"}</span>
            <span>Room <strong className="text-slate-700">{tenant.room_no}</strong></span>
            <span className="w-1 h-1 rounded-full bg-slate-300"></span>
            <span className="font-mono text-slate-700">Rs.{Number(tenant.base_rent).toLocaleString()}</span>
            {(tenant.water_rate > 0 || tenant.wifi_rate > 0 || tenant.garbage_rate > 0) && (
              <>
                <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                <span className="text-sky-600">Rs.{Number(tenant.water_rate)} W</span>
                <span className="text-violet-600">Rs.{Number(tenant.wifi_rate)} Wi</span>
                <span className="text-orange-600">Rs.{Number(tenant.garbage_rate)} G</span>
              </>
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2 opacity-100 sm:opacity-80 sm:group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
        <button
          type="button"
          aria-label={`Edit ${tenant.name || `Room ${tenant.room_no}`}`}
          onClick={onEdit}
          disabled={isPending}
          className="p-2.5 text-slate-500 hover:text-teal-600 hover:bg-teal-50 rounded-xl transition-all"
          title="Edit tenant"
        >
          <Edit2 size={16} />
        </button>
        <button
          type="button"
          aria-label={tenant.is_active ? `Deactivate ${tenant.name || `Room ${tenant.room_no}`}` : `Activate ${tenant.name || `Room ${tenant.room_no}`}`}
          onClick={() => onToggle(tenant)}
          disabled={isPending}
          className={`p-2.5 rounded-xl transition-all disabled:opacity-40 ${
            tenant.is_active
              ? "text-red-500 bg-red-50 hover:bg-red-100"
              : "text-emerald-600 bg-emerald-50 hover:bg-emerald-100"
          }`}
          title={tenant.is_active ? "Deactivate" : "Activate"}
        >
          {tenant.is_active ? <UserX size={16} /> : <UserCheck size={16} />}
        </button>
      </div>
    </div>
  );
}
