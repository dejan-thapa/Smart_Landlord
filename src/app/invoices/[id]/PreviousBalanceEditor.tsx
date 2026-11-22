"use client";

import { useState, useTransition } from "react";
import { Edit2, Check, X, AlertCircle, RotateCcw, Loader2, Info } from "lucide-react";
import { updateInvoicePreviousBalance } from "../invoice-actions";
import NepaliDate from "nepali-date-converter";

interface PriorUnpaidMonth {
  billing_month: string;
  total_due: number;
}

interface PreviousBalanceEditorProps {
  invoiceId: string;
  initialBalance: number;
  isPaid: boolean;
  priorUnpaid?: PriorUnpaidMonth[];
}

export default function PreviousBalanceEditor({
  invoiceId,
  initialBalance,
  isPaid,
  priorUnpaid = [],
}: PreviousBalanceEditorProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [balanceInput, setBalanceInput] = useState<string>(String(initialBalance || 0));
  const [currentBalance, setCurrentBalance] = useState<number>(initialBalance || 0);
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const autoCalculatedTotal = priorUnpaid.reduce((sum, item) => sum + Number(item.total_due || 0), 0);

  const handleSave = () => {
    const num = Math.max(0, parseFloat(balanceInput) || 0);
    setErrorMsg(null);
    startTransition(async () => {
      const res = await updateInvoicePreviousBalance(invoiceId, num);
      if (res.success) {
        setCurrentBalance(num);
        setIsEditing(false);
      } else {
        setErrorMsg(res.error || "Failed to save previous balance.");
      }
    });
  };

  const handleCancel = () => {
    setBalanceInput(String(currentBalance));
    setErrorMsg(null);
    setIsEditing(false);
  };

  const formatMonthName = (mStr: string) => {
    try {
      return new NepaliDate(new Date(mStr + "-25")).format("MMMM YYYY");
    } catch {
      return mStr;
    }
  };

  return (
    <div className="px-5 py-3.5 bg-amber-50/60 border-t border-amber-100">
      {!isEditing ? (
        <div>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-amber-900 text-sm font-semibold flex items-center gap-1.5">
                <AlertCircle size={15} className="text-amber-600 shrink-0" />
                Previous Balance (Arrears)
              </span>
              {currentBalance > 0 ? (
                <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-200/70 text-amber-800 px-2 py-0.5 rounded-full">
                  Past Due
                </span>
              ) : (
                <span className="text-[10px] font-medium text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded-full">
                  None
                </span>
              )}
            </div>

            <div className="flex items-center gap-3">
              <span
                className={`font-bold font-mono text-base ${
                  currentBalance > 0 ? "text-amber-900" : "text-slate-400"
                }`}
              >
                Rs. {Number(currentBalance).toLocaleString()}
              </span>

              {!isPaid && (
                <button
                  type="button"
                  onClick={() => {
                    setBalanceInput(String(currentBalance));
                    setIsEditing(true);
                  }}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 hover:text-amber-900 bg-amber-100/80 hover:bg-amber-200 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                  title="Manually adjust past-due balance"
                >
                  <Edit2 size={12} />
                  <span>Adjust</span>
                </button>
              )}
            </div>
          </div>

          {/* Context info about unpaid months if any */}
          {priorUnpaid.length > 0 && currentBalance > 0 && (
            <div className="mt-2 text-[11px] text-amber-800/80 flex items-start gap-1">
              <Info size={13} className="shrink-0 mt-0.5 text-amber-600" />
              <span>
                From {priorUnpaid.length} unpaid prior {priorUnpaid.length === 1 ? "month" : "months"}:{" "}
                {priorUnpaid
                  .map((p) => `${formatMonthName(p.billing_month)} (Rs. ${Number(p.total_due).toLocaleString()})`)
                  .join(", ")}
              </span>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3 animate-in fade-in duration-200">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
              <Edit2 size={13} /> Edit Previous Balance (Rs.)
            </label>
            <span className="text-[11px] text-amber-700">For partial payments or arrears override</span>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                Rs.
              </span>
              <input
                type="number"
                min="0"
                step="1"
                autoFocus
                value={balanceInput}
                onChange={(e) => setBalanceInput(e.target.value)}
                placeholder="0"
                className="w-full pl-10 pr-3 py-2 border border-amber-300 rounded-xl bg-white text-slate-900 font-mono font-bold text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </div>

            <button
              type="button"
              disabled={isPending}
              onClick={handleSave}
              className="inline-flex items-center gap-1 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold px-3.5 py-2.5 rounded-xl transition-all shadow-sm disabled:opacity-60 cursor-pointer"
            >
              {isPending ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
              <span>Save</span>
            </button>

            <button
              type="button"
              disabled={isPending}
              onClick={handleCancel}
              className="inline-flex items-center gap-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-semibold px-3 py-2.5 rounded-xl transition-colors cursor-pointer"
            >
              <X size={13} />
              <span>Cancel</span>
            </button>
          </div>

          {/* Quick Shortcuts */}
          <div className="flex items-center gap-2 flex-wrap pt-1">
            {autoCalculatedTotal > 0 && autoCalculatedTotal !== Number(balanceInput) && (
              <button
                type="button"
                onClick={() => setBalanceInput(String(autoCalculatedTotal))}
                className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-800 bg-amber-100/70 hover:bg-amber-200 px-2 py-0.5 rounded-md transition-colors"
              >
                <RotateCcw size={10} /> Auto-sum (Rs. {autoCalculatedTotal.toLocaleString()})
              </button>
            )}
            {balanceInput !== "0" && (
              <button
                type="button"
                onClick={() => setBalanceInput("0")}
                className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 px-2 py-0.5 rounded-md transition-colors"
              >
                Set to 0 (Clear Arrears)
              </button>
            )}
          </div>

          {errorMsg && (
            <p className="text-xs text-rose-600 font-medium bg-rose-50 p-2 rounded-lg border border-rose-200">
              {errorMsg}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
