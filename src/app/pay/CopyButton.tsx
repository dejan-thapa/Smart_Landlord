"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";

export default function CopyButton({ textToCopy, label = "Copy" }: { textToCopy: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(textToCopy);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      }
    } catch {
      // Fallback
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
        copied
          ? "bg-emerald-600 text-white shadow-xs"
          : "bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
      }`}
    >
      {copied ? <Check size={13} /> : <Copy size={13} />}
      {copied ? "Copied!" : label}
    </button>
  );
}
