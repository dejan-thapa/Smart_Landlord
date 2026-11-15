import { fetchPayments } from "./actions";
import PaymentsView from "./PaymentsView";

export const dynamic = "force-dynamic";

export default async function PaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const { month: rawMonth } = await searchParams;
  const currentMonth = new Date().toISOString().slice(0, 7);
  const month = rawMonth || currentMonth;

  const payments = await fetchPayments(month);

  return <PaymentsView initialPayments={payments} month={month} />;
}
