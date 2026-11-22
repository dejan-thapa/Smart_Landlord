"use server";

import { revalidatePath } from "next/cache";
import { supabaseAdmin, supabase } from "@/lib/supabase";

export type Expense = {
  id: string;
  description: string;
  amount: number;
  category: "Fruits" | "Vegetables" | "Gas" | "Rice" | "WiFi (Home)" | "WiFi (Bhada)" | "Other";
  expense_date: string;
  created_at: string;
};

// Use supabaseAdmin on server to bypass schema cache & RLS, fallback to supabase
const getClient = () => supabaseAdmin || supabase;

export async function fetchExpenses(month: string): Promise<Expense[]> {
  try {
    const [year, mo] = month.split("-").map(Number);
    const lastDay = new Date(year, mo, 0).getDate();
    const startOfMonth = `${month}-01`;
    const endOfMonth = `${month}-${String(lastDay).padStart(2, "0")}`;

    const { data, error } = await getClient()
      .from("expenses")
      .select("*")
      .gte("expense_date", startOfMonth)
      .lte("expense_date", endOfMonth)
      .order("expense_date", { ascending: false });

    if (error) {
      console.error("fetchExpenses error:", error);
      return [];
    }
    return (data || []) as Expense[];
  } catch (err) {
    console.error("fetchExpenses exception:", err);
    return [];
  }
}

export async function addExpense(data: {
  description: string;
  amount: number;
  category: string;
  expense_date: string;
}) {
  try {
    const { error } = await getClient().from("expenses").insert([
      {
        description: data.description.trim(),
        amount: Number(data.amount),
        category: data.category,
        expense_date: data.expense_date,
      },
    ]);

    if (error) {
      console.error("Add expense error:", error);
      return { success: false, error: error.message };
    }

    revalidatePath("/expenses");
    revalidatePath("/");
    return { success: true };
  } catch (err) {
    console.error("Add expense exception:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to add expense",
    };
  }
}

export async function editExpense(
  id: string,
  data: {
    description: string;
    amount: number;
    category: string;
    expense_date: string;
  }
) {
  try {
    const { error } = await getClient()
      .from("expenses")
      .update({
        description: data.description.trim(),
        amount: Number(data.amount),
        category: data.category,
        expense_date: data.expense_date,
      })
      .eq("id", id);

    if (error) {
      console.error("Edit expense error:", error);
      return { success: false, error: error.message };
    }

    revalidatePath("/expenses");
    revalidatePath("/");
    return { success: true };
  } catch (err) {
    console.error("Edit expense exception:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to update expense",
    };
  }
}

export async function deleteExpense(id: string) {
  try {
    const { error } = await getClient().from("expenses").delete().eq("id", id);

    if (error) {
      console.error("Delete expense error:", error);
      return { success: false, error: error.message };
    }

    revalidatePath("/expenses");
    revalidatePath("/");
    return { success: true };
  } catch (err) {
    console.error("Delete expense exception:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to delete expense",
    };
  }
}
