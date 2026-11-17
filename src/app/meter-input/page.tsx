"use client";

import { useState, useEffect, useTransition, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save, Zap, Loader2, CheckCircle2, AlertCircle, FilePlus, RefreshCcw } from "lucide-react";
import { fetchMeterData, saveMeterReadings, generateInvoiceForRoom } from "./actions";
import NepaliDate from "nepali-date-converter";

type Room = {
  id: string;
  room_no: string;
  last_reading: number;
  current_reading: number | null;
  has_invoice: boolean;
  room_side: string;
};

type Toast = { type: "success" | "error"; message: string } | null;

function MeterInputContent() {
  const searchParams = useSearchParams();
  // Meter input is always for the current month — the ?month param is just
  // passed through to keep dashboard context when navigating back.
  const dashboardMonth = searchParams.get("month") || new Date().toISOString().slice(0, 7);

  const [rooms, setRooms] = useState<Room[]>([]);
  const [prevReadings, setPrevReadings] = useState<{ [key: string]: string }>({});
  const [readings, setReadings] = useState<{ [key: string]: string }>({});
  const [ratePerUnit, setRatePerUnit] = useState("12");
  const [currentMonth, setCurrentMonth] = useState("");
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<Toast>(null);
  const [isPending, startTransition] = useTransition();

  const load = () => {
    fetchMeterData().then(({ rooms: r, currentMonth: m }) => {
      setRooms(r);
      setCurrentMonth(m);
      const preCurr: { [key: string]: string } = {};
      const prePrev: { [key: string]: string } = {};
      r.forEach((room) => {
        prePrev[room.id] = String(room.last_reading ?? 0);
        if (room.current_reading !== null) {
          preCurr[room.id] = String(room.current_reading);
        }
      });
      setPrevReadings(prePrev);
      setReadings(preCurr);
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
    const payload = rooms
      .filter((room) => readings[room.id] !== undefined && readings[room.id] !== "")
      .map((room) => ({
        tenant_id: room.id,
        room_no: room.room_no,
        previous_reading: Number(prevReadings[room.id] || 0),
        current_reading: Number(readings[room.id]),
      }));

    if (payload.length === 0) {
      showToast({ type: "error", message: "Please enter at least one reading." });
      return;
    }

    // Validation: make sure no current reading is less than previous reading
    const invalidRoom = payload.find((r) => r.current_reading < r.previous_reading);
    if (invalidRoom) {
      showToast({
        type: "error",
        message: `Room ${invalidRoom.room_no} reading (${invalidRoom.current_reading}) cannot be less than previous reading (${invalidRoom.previous_reading}).`,
      });
      return;
    }

    startTransition(async () => {
      const result = await saveMeterReadings(payload, currentMonth, Number(ratePerUnit || 12));
      if (result.success) {
        showToast({ type: "success", message: "Readings saved and bills updated successfully!" });
        load();
      } else {
        showToast({ type: "error", message: result.error || "Failed to save." });
      }
    });
  };

  const handleGenerateInvoice = (tenantId: string, roomNo: string, currentVal?: number, prevVal?: number) => {
    startTransition(async () => {
      const readingVal = currentVal !== undefined ? currentVal : (readings[tenantId] ? Number(readings[tenantId]) : undefined);
      const prevReadingVal = prevVal !== undefined ? prevVal : Number(prevReadings[tenantId] || 0);
      const result = await generateInvoiceForRoom(tenantId, currentMonth, readingVal, Number(ratePerUnit || 12), prevReadingVal);
      if (result.success) {
        showToast({ type: "success", message: `Bill generated for Room ${roomNo}!` });
        load();
      } else {
        showToast({ type: "error", message: result.error || "Failed to generate bill." });
      }
    });
  };

  const monthLabel = (() => {
    if (!currentMonth) return "";
    try {
      return new NepaliDate(new Date(currentMonth + "-15")).format("MMMM YYYY");
    } catch {
      return currentMonth;
    }
  })();

  return (
    <main className="max-w-4xl mx-auto p-4 md:p-6 pb-32">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-3 rounded-2xl shadow-xl text-sm font-semibold transition-all ${
            toast.type === "success"
              ? "bg-emerald-600 text-white"
              : "bg-red-600 text-white"
          }`}
        >
          {toast.type === "success" ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          {toast.message}
        </div>
      )}

      {/* Header */}
      <header className="flex items-center justify-between gap-4 mb-8 pt-4">
        <div className="flex items-center gap-4">
          <Link
            href={`/?month=${dashboardMonth}`}
            aria-label="Back to Dashboard"
            className="h-10 w-10 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            <ArrowLeft size={20} />
          </Link>
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2 text-slate-900 dark:text-white">
              <Zap size={20} aria-hidden="true" className="text-teal-600 shrink-0" />
              Monthly Meter Readings
            </h1>
            <div className="flex flex-wrap items-center gap-2 mt-0.5">
              <p className="text-slate-500 dark:text-slate-400 font-medium text-sm">{monthLabel}</p>
              <span className="text-xs font-bold bg-teal-50 dark:bg-teal-950/50 text-teal-700 dark:text-teal-400 border border-teal-200 dark:border-teal-800 px-2 py-0.5 rounded-full uppercase tracking-wider">
                Current Billing Cycle
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Rate per unit */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 mb-6 flex items-center justify-between gap-4 shadow-sm">
        <div>
          <label htmlFor="rate-per-unit-input" className="text-xs text-slate-500 dark:text-slate-400 uppercase font-bold tracking-wider mb-0.5 block">
            Rate per Unit
          </label>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Applied to electricity units consumed (Current Reading − Previous Reading)
          </p>
        </div>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">Rs.</span>
          <input
            id="rate-per-unit-input"
            type="number"
            value={ratePerUnit}
            onChange={(e) => setRatePerUnit(e.target.value)}
            className="w-28 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-10 pr-3 py-2 text-sm font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:border-teal-500"
          />
        </div>
      </div>

      <div className="max-w-4xl mx-auto">
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
          <Loader2 size={32} className="animate-spin" />
          <p className="text-sm font-medium">Loading rooms…</p>
        </div>
      ) : rooms.length === 0 ? (
        <div className="text-center py-20 text-slate-400">
          <p className="font-medium">No active tenants found.</p>
          <p className="text-sm mt-1">Add tenants in Settings first.</p>
        </div>
      ) : (
        <form onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-4xl mx-auto items-start">
          {/* Side A on the left */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-lg tracking-wider uppercase">Side A</h2>
              <div className="h-px bg-slate-200 dark:bg-slate-800 flex-1"></div>
            </div>
            {rooms.filter(r => normalizeSide(r.room_side) === "Side A").length === 0 ? (
              <p className="text-xs text-slate-400 font-medium">No rooms on this side.</p>
            ) : (
              rooms.filter(r => normalizeSide(r.room_side) === "Side A").map((room) => (
                <RoomMeterCard 
                  key={room.id} 
                  room={room} 
                  prevReadings={prevReadings}
                  setPrevReadings={setPrevReadings}
                  readings={readings} 
                  setReadings={setReadings} 
                  isPending={isPending} 
                  ratePerUnit={ratePerUnit} 
                  onGenerateInvoice={handleGenerateInvoice} 
                />
              ))
            )}
          </div>

          {/* Side B on the right */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-lg tracking-wider uppercase">Side B</h2>
              <div className="h-px bg-slate-200 dark:bg-slate-800 flex-1"></div>
            </div>
            {rooms.filter(r => normalizeSide(r.room_side) === "Side B").length === 0 ? (
              <p className="text-xs text-slate-400 font-medium">No rooms on this side.</p>
            ) : (
              rooms.filter(r => normalizeSide(r.room_side) === "Side B").map((room) => (
                <RoomMeterCard 
                  key={room.id} 
                  room={room} 
                  prevReadings={prevReadings}
                  setPrevReadings={setPrevReadings}
                  readings={readings} 
                  setReadings={setReadings} 
                  isPending={isPending} 
                  ratePerUnit={ratePerUnit} 
                  onGenerateInvoice={handleGenerateInvoice} 
                />
              ))
            )}

            {/* Other category if any */}
            {rooms.filter(r => normalizeSide(r.room_side) === "Other").length > 0 && (
              <div className="mt-8 space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-lg tracking-wider uppercase">Other</h2>
                  <div className="h-px bg-slate-200 dark:bg-slate-800 flex-1"></div>
                </div>
                {rooms.filter(r => normalizeSide(r.room_side) === "Other").map((room) => (
                  <RoomMeterCard 
                    key={room.id} 
                    room={room} 
                    prevReadings={prevReadings}
                    setPrevReadings={setPrevReadings}
                    readings={readings} 
                    setReadings={setReadings} 
                    isPending={isPending} 
                    ratePerUnit={ratePerUnit} 
                    onGenerateInvoice={handleGenerateInvoice} 
                  />
                ))}
              </div>
            )}
          </div>

          {/* Floating Action Bar */}
          <div className="fixed bottom-0 left-0 w-full p-4 bg-gradient-to-t from-slate-50 via-slate-50/95 dark:from-slate-950 dark:via-slate-950/95 to-transparent pointer-events-none z-30">
            <div className="max-w-4xl mx-auto flex justify-end">
              <button
                type="submit"
                disabled={isPending}
                className="pointer-events-auto bg-teal-700 hover:bg-teal-600 disabled:opacity-60 text-white rounded-2xl px-10 py-3.5 font-bold text-base flex items-center justify-center gap-2 shadow-lg shadow-teal-900/25 transition-all z-10 cursor-pointer"
              >
                {isPending ? (
                  <>
                    <Loader2 size={20} className="animate-spin" />
                    <span>Saving Readings…</span>
                  </>
                ) : (
                  <>
                    <Save size={20} />
                    <span>Save All Readings</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      )}
      </div>
    </main>
  );
}

function RoomMeterCard({ 
  room, 
  prevReadings,
  setPrevReadings,
  readings, 
  setReadings, 
  isPending, 
  ratePerUnit, 
  onGenerateInvoice 
}: { 
  room: Room; 
  prevReadings: { [key: string]: string };
  setPrevReadings: React.Dispatch<React.SetStateAction<{ [key: string]: string }>>;
  readings: { [key: string]: string }; 
  setReadings: React.Dispatch<React.SetStateAction<{ [key: string]: string }>>; 
  isPending: boolean; 
  ratePerUnit: string; 
  onGenerateInvoice: (id: string, roomNo: string, currentVal?: number, prevVal?: number) => void;
}) {
  const prevStr = prevReadings[room.id];
  const prevNum = prevStr !== undefined && prevStr !== "" ? Number(prevStr) : 0;

  const currentStr = readings[room.id];
  const currentNum = currentStr !== undefined && currentStr !== "" ? Number(currentStr) : null;
  const unitRate = Number(ratePerUnit) || 12;

  const hasEntered = currentNum !== null && !isNaN(currentNum);
  const isLowerThanPrev = hasEntered && currentNum < prevNum;
  const isValid = hasEntered && !isLowerThanPrev && currentNum >= 0;

  const unitsConsumed = isValid && currentNum !== null ? currentNum - prevNum : 0;
  const estimatedElectricity = isValid ? unitsConsumed * unitRate : null;

  return (
    <div
      className={`bg-white dark:bg-slate-900 border shadow-xs rounded-2xl p-4 flex flex-col gap-3 transition-all ${
        isLowerThanPrev
          ? "border-rose-400 ring-1 ring-rose-400 dark:border-rose-500"
          : isValid
          ? "border-teal-500/60 dark:border-teal-500/60"
          : "border-slate-200 dark:border-slate-800 focus-within:border-teal-500 focus-within:ring-1 focus-within:ring-teal-500"
      }`}
    >
      <div className="flex justify-between items-center gap-3">
        <div>
          <span className="text-xs text-slate-400 dark:text-slate-500 uppercase font-bold tracking-wider">Room</span>
          <p className="text-xl font-bold text-slate-900 dark:text-white font-mono">{room.room_no}</p>
        </div>

        {/* Editable Previous Reading */}
        <div className="text-right">
          <label
            htmlFor={`room-prev-${room.id}`}
            className="text-xs text-slate-400 dark:text-slate-500 uppercase font-bold tracking-wider block mb-1"
          >
            Prev. Reading
          </label>
          <input
            id={`room-prev-${room.id}`}
            type="number"
            inputMode="numeric"
            value={prevStr ?? "0"}
            onChange={(e) =>
              setPrevReadings((prev) => ({ ...prev, [room.id]: e.target.value }))
            }
            className="w-28 text-right bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-sm font-mono font-bold text-slate-700 dark:text-slate-200 focus:outline-none focus:border-teal-500"
          />
        </div>
      </div>

      <div className="relative">
        <label htmlFor={`room-meter-${room.id}`} className="sr-only">
          Current meter reading for Room {room.room_no}
        </label>
        <input
          id={`room-meter-${room.id}`}
          type="number"
          inputMode="numeric"
          placeholder={prevNum > 0 ? `Enter current reading (e.g. ${prevNum + 45})…` : "Enter current meter reading…"}
          value={currentStr ?? ""}
          onChange={(e) =>
            setReadings((prev) => ({ ...prev, [room.id]: e.target.value }))
          }
          className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-lg font-mono font-bold text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-teal-500"
        />
        {isValid && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800 px-2 py-1 rounded-md font-mono">
            +{unitsConsumed.toLocaleString()} units
          </div>
        )}
        {isLowerThanPrev && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 px-2 py-1 rounded-md">
            Must be ≥ {prevNum}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between mt-1 pt-3 border-t border-slate-100 dark:border-slate-800">
        <div className="text-xs font-medium">
          {isLowerThanPrev ? (
            <p className="text-rose-600 dark:text-rose-400">
              Cannot be less than previous reading ({prevNum})
            </p>
          ) : estimatedElectricity !== null ? (
            <p className="text-slate-600 dark:text-slate-300">
              Units: <span className="font-bold font-mono text-slate-900 dark:text-white">{unitsConsumed}</span>
              {" • "}Est. Cost:{" "}
              <span className="font-bold text-teal-700 dark:text-teal-400 font-mono">
                Rs. {estimatedElectricity.toLocaleString()}
              </span>
              {" "}
              <span className="text-[11px] text-slate-400 dark:text-slate-500 font-normal">
                ({unitsConsumed} × Rs.{unitRate})
              </span>
            </p>
          ) : (
            <p className="text-slate-400 dark:text-slate-500">
              Enter dial reading to calculate units &amp; cost
            </p>
          )}
        </div>
        
        <button
          type="button"
          onClick={() => onGenerateInvoice(room.id, room.room_no, currentNum !== null ? currentNum : undefined, prevNum)}
          disabled={isPending || isLowerThanPrev || (!room.has_invoice && currentNum === null)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            room.has_invoice 
              ? "text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700" 
              : "text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/50 border border-teal-200 dark:border-teal-800 hover:bg-teal-100 dark:hover:bg-teal-900/50"
          }`}
        >
          {isPending ? (
            <Loader2 size={14} className="animate-spin" />
          ) : room.has_invoice ? (
            <><RefreshCcw size={12} /> Regenerate Bill</>
          ) : (
            <><FilePlus size={12} /> Generate Bill</>
          )}
        </button>
      </div>
    </div>
  );
}

function normalizeSide(side?: string | null): "Side A" | "Side B" | "Other" {
  if (!side) return "Other";
  const s = side.trim().toLowerCase();
  if (s === "side a" || s === "a" || s === "side_a") return "Side A";
  if (s === "side b" || s === "b" || s === "side_b") return "Side B";
  return "Other";
}

export default function MeterInputPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center min-h-screen animate-pulse">
        <p className="text-slate-300 font-bold text-sm tracking-widest uppercase">Loading...</p>
      </div>
    }>
      <MeterInputContent />
    </Suspense>
  );
}
