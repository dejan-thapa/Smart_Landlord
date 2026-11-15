"use server";

import { supabase } from "@/lib/supabase";
import { revalidatePath } from "next/cache";

export interface PaymentRecord {
  id: string;
  tenant_id: string;
  billing_month: string;
  total_due: number;
  rent_amount?: number;
  electricity_cost?: number;
  water_share?: number;
  wifi_share?: number;
  garbage_share?: number;
  waste_water_cost?: number;
  payment_status: "paid" | "unpaid";
  payment_date: string | null;
  payment_method: "cash" | "esewa" | "bank_transfer" | "cheque" | "other" | null;
  payment_notes: string | null;
  created_at: string;
  updated_at: string;
  tenants: {
    id: string;
    name: string | null;
    room_no: string;
    room_side: string | null;
    phone_number: string | null;
    email: string | null;
  } | null;
}

import { normalizeTenant } from "@/lib/types";

export async function fetchPayments(month?: string) {
  let query = supabase
    .from("invoices")
    .select("*, tenants(id, name, room_no, room_side, phone_number, email)")
    .order("payment_date", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (month && month !== "all") {
    query = query.eq("billing_month", month);
  }

  const { data, error } = await query;
  if (error) {
    console.error("Error fetching payment records:", error);
    return [];
  }

  return (data || []).map((p) => ({
    ...p,
    tenants: normalizeTenant(p.tenants),
  })) as PaymentRecord[];
}

export async function recordPaymentAction(
  invoiceId: string,
  details: {
    payment_date: string;
    payment_method: string;
    payment_notes?: string;
  }
) {
  const { error } = await supabase
    .from("invoices")
    .update({
      payment_status: "paid",
      payment_date: details.payment_date,
      payment_method: details.payment_method,
      payment_notes: details.payment_notes?.trim() || null,
    })
    .eq("id", invoiceId);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/payments");
  revalidatePath("/invoices");
  revalidatePath(`/invoices/${invoiceId}`);
  revalidatePath("/");
  return { success: true };
}

export async function revertPaymentAction(invoiceId: string) {
  const { error } = await supabase
    .from("invoices")
    .update({
      payment_status: "unpaid",
      payment_date: null,
      payment_method: null,
      payment_notes: null,
    })
    .eq("id", invoiceId);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/payments");
  revalidatePath("/invoices");
  revalidatePath(`/invoices/${invoiceId}`);
  revalidatePath("/");
  return { success: true };
}
