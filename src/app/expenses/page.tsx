import { Suspense } from "react";
import { fetchExpenses } from "./actions";
import ExpensesClient from "./ExpensesClient";

export const dynamic = "force-dynamic";

export default async function ExpensesPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const { month: rawMonth } = await searchParams;
  const currentMonth = new Date().toISOString().slice(0, 7);
  const month = rawMonth || currentMonth;

  const initialExpenses = await fetchExpenses(month);

  return (
    <Suspense fallback={null}>
      <ExpensesClient initialExpenses={initialExpenses} month={month} />
    </Suspense>
  );
}
