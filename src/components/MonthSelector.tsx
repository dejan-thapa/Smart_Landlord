"use client";

import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import NepaliDate from "nepali-date-converter";

interface MonthSelectorProps {
  currentMonth: string; // YYYY-MM format
  basePath: string;     // e.g. "/" or "/invoices"
  extraParams?: Record<string, string>; // e.g. { filter: "unpaid" }
  labelPrefix?: string;
}

export default function MonthSelector({
  currentMonth,
  basePath,
  extraParams = {},
  labelPrefix = "Billing Period: ",
}: MonthSelectorProps) {
  const router = useRouter();

  const navigateMonth = (direction: number) => {
    const [year, mo] = currentMonth.split("-").map(Number);
    const newDate = new Date(year, mo - 1 + direction, 1);
    const newMonth = `${newDate.getFullYear()}-${String(newDate.getMonth() + 1).padStart(2, "0")}`;
    const params = new URLSearchParams({ ...extraParams, month: newMonth });
    router.push(`${basePath}?${params.toString()}`);
  };

  const monthLabel = (() => {
    try {
      return new NepaliDate(new Date(currentMonth + "-25")).format("MMMM YYYY");
    } catch {
      return currentMonth;
    }
  })();

  const isCurrentMonth = currentMonth === new Date().toISOString().slice(0, 7);

  return (
    <div className="flex items-center justify-between sm:justify-start gap-1 bg-white border border-slate-200 rounded-xl shadow-xs px-1.5 sm:px-2 py-1">
      <button
        type="button"
        onClick={() => navigateMonth(-1)}
        className="p-1.5 sm:p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-all cursor-pointer shrink-0"
        aria-label="Previous month"
      >
        <ChevronLeft size={16} />
      </button>

      <div className="flex items-center gap-1.5 px-1.5 sm:px-2 min-w-0">
        <Calendar size={14} aria-hidden="true" className="text-teal-600 shrink-0" />
        <span className="text-xs font-semibold text-slate-800 whitespace-nowrap truncate">
          {labelPrefix && <span className="hidden sm:inline">{labelPrefix}</span>}
          {monthLabel}
        </span>
        {!isCurrentMonth && (
          <span className="text-[10px] sm:text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded uppercase tracking-wider shrink-0">
            History
          </span>
        )}
      </div>

      <button
        type="button"
        onClick={() => navigateMonth(1)}
        disabled={isCurrentMonth}
        className="p-1.5 sm:p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-all disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer shrink-0"
        aria-label="Next month"
      >
        <ChevronRight size={16} />
      </button>
    </div>
  );
}
