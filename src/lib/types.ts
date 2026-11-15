// Shared domain types mirroring the Supabase schema (see supabase/migrations).

export type PaymentStatus = "unpaid" | "paid";
export type PaymentMethod = "cash" | "esewa" | "bank_transfer" | "cheque" | "other";

/** Tenant fields embedded in invoice queries via `tenants(...)`. */
export type InvoiceTenant = {
  id?: string;
  name: string | null;
  room_no: string;
  room_side?: string | null;
  email?: string | null;
  phone_number?: string | null;
  base_rent?: number;
};

export type Invoice = {
  id: string;
  tenant_id: string;
  billing_month: string; // YYYY-MM
  rent_amount: number;
  water_share: number;
  wifi_share: number;
  garbage_share: number;
  electricity_cost: number;
  previous_balance?: number;
  total_due: number;
  payment_status: PaymentStatus;
  payment_date?: string | null;
  payment_method?: PaymentMethod | null;
  payment_notes?: string | null;
  last_emailed_at?: string | null;
  email_count?: number | null;
  created_at: string;
};

export type InvoiceWithTenant = Invoice & { tenants: InvoiceTenant | null };

export type ActionResult = { success: true } | { success: false; error: string };

/** Safely extract a message from an unknown thrown value. */
export function getErrorMessage(err: unknown, fallback = "Something went wrong."): string {
  if (err instanceof Error && err.message) return err.message;
  if (typeof err === "string" && err) return err;
  return fallback;
}

/**
 * Supabase may return an embedded relation as an object or a single-item array
 * depending on how the relationship is inferred. Normalize to an object.
 */
export function normalizeTenant<T>(rel: T | T[] | null | undefined): T | null {
  if (Array.isArray(rel)) return rel[0] ?? null;
  return rel ?? null;
}

/** Returns the first day of the month after `month` (YYYY-MM) as YYYY-MM-DD. */
export function nextMonthStart(month: string): string {
  const [y, m] = month.split("-").map(Number);
  const ny = m === 12 ? y + 1 : y;
  const nm = m === 12 ? 1 : m + 1;
  return `${ny}-${String(nm).padStart(2, "0")}-01`;
}

/** Safely extracts or infers previous unpaid balance (arrears) from an invoice. */
export function getInvoicePreviousBalance(invoice: {
  previous_balance?: number | null;
  total_due: number;
  rent_amount: number;
  electricity_cost: number;
  water_share: number;
  wifi_share: number;
  garbage_share: number;
}): number {
  if (invoice.previous_balance !== undefined && invoice.previous_balance !== null) {
    return Number(invoice.previous_balance);
  }
  const currentCharges =
    Number(invoice.rent_amount || 0) +
    Number(invoice.electricity_cost || 0) +
    Number(invoice.water_share || 0) +
    Number(invoice.wifi_share || 0) +
    Number(invoice.garbage_share || 0);
  const diff = Number(invoice.total_due || 0) - currentCharges;
  return diff > 0.01 ? Math.round(diff * 100) / 100 : 0;
}
