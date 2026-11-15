"use client";

import Link from "next/link";
import { WifiOff, RotateCcw, Home, FileText, ArrowLeft } from "lucide-react";

export default function OfflineFallback() {
  return (
    <div className="min-h-[80vh] flex items-center justify-center p-6 text-center">
      <div className="max-w-md w-full bg-white border border-slate-200/80 shadow-xl rounded-3xl p-8 space-y-6">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 shadow-sm animate-pulse">
          <WifiOff size={32} />
        </div>

        <div className="space-y-2">
          <span className="inline-block px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600 rounded-full">
            Offline Mode
          </span>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            No Internet Connection
          </h1>
          <p className="text-xs text-slate-500 leading-relaxed">
            Smart Landlord OS is installed and running, but this page requires a fresh network connection. Previously cached pages remain accessible.
          </p>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row gap-2.5 justify-center">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer shadow-sm"
          >
            <RotateCcw size={14} />
            Try Again
          </button>
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors"
          >
            <Home size={14} />
            Go to Dashboard
          </Link>
        </div>

        <div className="pt-4 border-t border-slate-100 text-[11px] text-slate-400">
          Tip: You can continue checking offline data once pages have been opened.
        </div>
      </div>
    </div>
  );
}
