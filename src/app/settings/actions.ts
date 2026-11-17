"use server";

import { supabase } from "@/lib/supabase";
import { revalidatePath } from "next/cache";

export async function fetchTenants() {
  try {
    const { data, error } = await supabase
      .from("tenants")
      .select("*")
      .order("room_no");
    if (error) return [];
    return data || [];
  } catch (err) {
    console.error("fetchTenants error:", err);
    return [];
  }
}

export async function addTenant(data: {
  name: string | null;
  room_no: string;
  room_side: string;
  base_rent: number;
  email?: string | null;
  phone_number?: string | null;
  water_rate: number;
  wifi_rate: number;
  garbage_rate: number;
}) {
  try {
    const { error } = await supabase.from("tenants").insert(data);
    if (error) return { success: false, error: error.message };
    revalidatePath("/settings");
    revalidatePath("/invoices");
    revalidatePath("/");
    return { success: true };
  } catch (err) {
    console.error("addTenant error:", err);
    return {
      success: false,
      error: "Unable to connect to Supabase database. Please check if your Supabase project is active or unpaused.",
    };
  }
}

export async function editTenant(id: string, data: {
  name: string | null;
  room_no: string;
  room_side: string;
  base_rent: number;
  email?: string | null;
  phone_number?: string | null;
  water_rate: number;
  wifi_rate: number;
  garbage_rate: number;
}) {
  try {
    const { error } = await supabase.from("tenants").update(data).eq("id", id);
    if (error) return { success: false, error: error.message };
    revalidatePath("/settings");
    revalidatePath("/invoices");
    revalidatePath("/");
    return { success: true };
  } catch (err) {
    console.error("editTenant error:", err);
    return {
      success: false,
      error: "Unable to connect to Supabase database. Please check if your Supabase project is active or unpaused.",
    };
  }
}

export async function deactivateTenant(id: string) {
  try {
    const { error } = await supabase.from("tenants").update({ is_active: false }).eq("id", id);
    if (error) return { success: false, error: error.message };
    revalidatePath("/settings");
    return { success: true };
  } catch (err) {
    console.error("deactivateTenant error:", err);
    return {
      success: false,
      error: "Unable to connect to Supabase database. Please check if your Supabase project is active.",
    };
  }
}

export async function activateTenant(id: string) {
  try {
    const { error } = await supabase.from("tenants").update({ is_active: true }).eq("id", id);
    if (error) return { success: false, error: error.message };
    revalidatePath("/settings");
    return { success: true };
  } catch (err) {
    console.error("activateTenant error:", err);
    return {
      success: false,
      error: "Unable to connect to Supabase database. Please check if your Supabase project is active.",
    };
  }
}
