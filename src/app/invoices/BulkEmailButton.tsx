"use client";

import { useState } from "react";
import { Mail, Loader2, CheckCircle2 } from "lucide-react";
import { sendBulkUnpaidEmails } from "./invoice-actions";

export default function BulkEmailButton({ 
  unpaidCount, 
  month 
}: { 
  unpaidCount: number; 
  month: string 
}) {
  const [isEmailing, setIsEmailing] = useState(false);
  const [emailStatus, setEmailStatus] = useState<{ sentCount: number; failCount: number; total: number } | null>(null);

  const handleBulkEmail = async () => {
    if (!confirm(`Are you sure you want to send bills to ${unpaidCount} tenants via email?`)) return;
    
    setIsEmailing(true);
    try {
      const result = await sendBulkUnpaidEmails(month);
      if (result.success) {
        setEmailStatus({
          sentCount: result.sentCount ?? 0,
          failCount: result.failCount ?? 0,
          total: result.total ?? 0,
        });
        setTimeout(() => setEmailStatus(null), 6000);
      } else {
        alert("Bulk email error: " + result.error);
      }
    } catch (err) {
      alert("Something went wrong during bulk dispatch.");
    } finally {
      setIsEmailing(false);
    }
  };

  return (
    <>
      {/* Toast Notification for Bulk Email */}
      {emailStatus && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-blue-600 text-white px-4 py-3 rounded-2xl shadow-xl text-sm font-semibold animate-in fade-in slide-in-from-top-2 duration-300">
          <CheckCircle2 size={18} />
          Bulk Dispatch Complete: {emailStatus.sentCount}/{emailStatus.total} Sent!
        </div>
      )}

      {unpaidCount > 0 && (
        <button
          type="button"
          onClick={handleBulkEmail}
          disabled={isEmailing}
          className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold shadow-lg shadow-blue-500/20 transition-all whitespace-nowrap shrink-0"
        >
          {isEmailing ? (
            <><Loader2 size={15} className="animate-spin" /> Sending...</>
          ) : (
            <><Mail size={15} /> Email Unpaid ({unpaidCount})</>
          )}
        </button>
      )}
    </>
  );
}
