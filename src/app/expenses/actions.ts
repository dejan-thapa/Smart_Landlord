"use server";

import { revalidatePath } from "next/cache";

export type Expense = {
  id: string;
  description: string;
  amount: number;
  category: "Loan Fee" | "Vegetables" | "Gas" | "Rice" | "WiFi (Home)" | "WiFi (Bhada)" | "Other";
  expense_date: string;
  created_at: string;
};

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Helper for direct REST API calls — bypasses PostgREST schema cache
async function dbFetch(path: string, options: RequestInit = {}) {
  const url = `${SUPABASE_URL}/rest/v1/${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      "apikey": SUPABASE_KEY,
      "Authorization": `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json",
      "Prefer": "return=representation",
      ...options.headers,
    },
    cache: "no-store",
  });
  return res;
}

export async function fetchExpenses(month: string) {
  const [year, mo] = month.split("-").map(Number);
  const lastDay = new Date(year, mo, 0).getDate();
  const startOfMonth = `${month}-01`;
  const endOfMonth = `${month}-${String(lastDay).padStart(2, "0")}`;

  const res = await dbFetch(
    `expenses?expense_date=gte.${startOfMonth}&expense_date=lte.${endOfMonth}&order=expense_date.desc`
  );

  if (!res.ok) {
    const err = await res.text();
    console.error("Error fetching expenses:", err);
    return [];
  }
  return res.json() as Promise<Expense[]>;
}

export async function addExpense(data: {
  description: string;
  amount: number;
  category: string;
  expense_date: string;
}) {
  const res = await dbFetch("expenses", {
    method: "POST",
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.text();
    console.error("Add expense error:", err);
    return { success: false, error: err };
  }
  revalidatePath("/expenses");
  revalidatePath("/");
  return { success: true };
}

export async function editExpense(id: string, data: {
  description: string;
  amount: number;
  category: string;
  expense_date: string;
}) {
  const res = await dbFetch(`expenses?id=eq.${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.text();
    return { success: false, error: err };
  }
  revalidatePath("/expenses");
  revalidatePath("/");
  return { success: true };
}

export async function deleteExpense(id: string) {
  const res = await dbFetch(`expenses?id=eq.${id}`, {
    method: "DELETE",
    headers: { "Prefer": "" },
  });
  if (!res.ok) {
    const err = await res.text();
    return { success: false, error: err };
  }
  revalidatePath("/expenses");
  revalidatePath("/");
  return { success: true };
}
