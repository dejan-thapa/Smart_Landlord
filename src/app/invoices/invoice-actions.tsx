"use server";

import path from "path";
import fs from "fs";
import { supabase } from "@/lib/supabase";
import { revalidatePath } from "next/cache";
import { transporter } from "@/lib/mail";
import { render } from "@react-email/render";
import { InvoiceEmailTemplate } from "@/components/InvoiceEmailTemplate";
import NepaliDate from "nepali-date-converter";
import { ReactElement } from "react";
import { getErrorMessage, normalizeTenant, getInvoicePreviousBalance, type InvoiceTenant, type InvoiceWithTenant } from "@/lib/types";

export async function fetchInvoices(billingMonth: string): Promise<InvoiceWithTenant[]> {
  const { data, error } = await supabase
    .from("invoices")
    .select("*, tenants(name, room_no, room_side, email, phone_number)")
    .eq("billing_month", billingMonth)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("fetchInvoices error:", error);
    return [];
  }
  return (data || []).map((inv) => ({
    ...inv,
    tenants: normalizeTenant<InvoiceTenant>(inv.tenants),
  })) as InvoiceWithTenant[];
}

export async function fetchInvoiceById(id: string): Promise<InvoiceWithTenant | null> {
  const { data, error } = await supabase
    .from("invoices")
    .select("*, tenants(name, room_no, room_side, email, phone_number, base_rent)")
    .eq("id", id)
    .single();

  if (error || !data) return null;
  return { ...data, tenants: normalizeTenant<InvoiceTenant>(data.tenants) } as InvoiceWithTenant;
}


export async function markInvoicePaid(
  id: string,
  details?: {
    payment_date?: string;   // ISO date string YYYY-MM-DD
    payment_method?: string; // 'cash' | 'esewa' | 'bank_transfer' | 'cheque' | 'other'
    payment_notes?: string;
  }
) {
  // Fetch current invoice to see tenant_id and billing_month
  const { data: currentInv } = await supabase
    .from("invoices")
    .select("tenant_id, billing_month, rent_amount, electricity_cost, water_share, wifi_share, garbage_share, total_due, previous_balance")
    .eq("id", id)
    .single();

  const updateData: Record<string, unknown> = { payment_status: "paid" };
  if (details?.payment_date) updateData.payment_date = details.payment_date;
  if (details?.payment_method) updateData.payment_method = details.payment_method;
  if (details?.payment_notes !== undefined) updateData.payment_notes = details.payment_notes;

  const { error } = await supabase
    .from("invoices")
    .update(updateData)
    .eq("id", id);

  if (error) return { success: false, error: error.message };

  // If this invoice included previous balance (arrears), auto-settle prior unpaid invoices
  if (currentInv) {
    const prevBal = getInvoicePreviousBalance(currentInv);
    if (prevBal > 0) {
      const settleDate = details?.payment_date || new Date().toISOString().slice(0, 10);
      const settleMethod = details?.payment_method || "other";
      await supabase
        .from("invoices")
        .update({
          payment_status: "paid",
          payment_date: settleDate,
          payment_method: settleMethod,
          payment_notes: `Settled via consolidated bill for ${currentInv.billing_month}`,
        })
        .eq("tenant_id", currentInv.tenant_id)
        .lt("billing_month", currentInv.billing_month)
        .eq("payment_status", "unpaid");
    }
  }

  revalidatePath("/invoices");
  revalidatePath(`/invoices/${id}`);
  revalidatePath("/");
  revalidatePath("/payments");
  return { success: true };
}

export async function updateInvoicePreviousBalance(
  id: string,
  newPreviousBalance: number
): Promise<{ success: boolean; error?: string; totalDue?: number }> {
  const numBalance = Math.max(0, Number(newPreviousBalance) || 0);

  const { data: currentInv, error: fetchErr } = await supabase
    .from("invoices")
    .select("id, rent_amount, electricity_cost, water_share, wifi_share, garbage_share, payment_notes")
    .eq("id", id)
    .single();

  if (fetchErr || !currentInv) {
    return { success: false, error: fetchErr?.message || "Bill not found" };
  }

  const currentMonthCharges =
    Number(currentInv.rent_amount || 0) +
    Number(currentInv.electricity_cost || 0) +
    Number(currentInv.water_share || 0) +
    Number(currentInv.wifi_share || 0) +
    Number(currentInv.garbage_share || 0);

  const newTotalDue = currentMonthCharges + numBalance;

  // Try updating with previous_balance first
  let updateData: Record<string, unknown> = {
    total_due: newTotalDue,
    previous_balance: numBalance,
  };

  let { error: updateError } = await supabase
    .from("invoices")
    .update(updateData)
    .eq("id", id);

  // If column previous_balance doesn't exist in schema cache yet, fall back to updating total_due
  if (updateError && updateError.code === "PGRST204") {
    delete updateData.previous_balance;
    const res = await supabase.from("invoices").update(updateData).eq("id", id);
    updateError = res.error;
  }

  if (updateError) {
    return { success: false, error: updateError.message };
  }

  revalidatePath("/invoices");
  revalidatePath(`/invoices/${id}`);
  revalidatePath("/");
  revalidatePath("/payments");

  return { success: true, totalDue: newTotalDue };
}

export async function markInvoiceUnpaid(id: string) {
  const { error } = await supabase
    .from("invoices")
    .update({ payment_status: "unpaid", payment_date: null, payment_method: null, payment_notes: null })
    .eq("id", id);

  if (error) return { success: false, error: error.message };
  revalidatePath("/invoices");
  revalidatePath(`/invoices/${id}`);
  revalidatePath("/");
  revalidatePath("/payments");
  return { success: true };
}

export async function deleteInvoice(id: string) {
  const { error } = await supabase.from("invoices").delete().eq("id", id);
  if (error) return { success: false, error: error.message };
  revalidatePath("/invoices");
  revalidatePath("/meter-input");
  return { success: true };
}

export async function generateInvoicesAction(currentMonth: string) {
  const { data: tenants, error: tenantsError } = await supabase
    .from('tenants')
    .select('*')
    .eq('is_active', true);

  if (tenantsError) return { success: false, error: tenantsError.message };
  if (!tenants || tenants.length === 0) return { success: false, error: 'No active tenants found.' };

  const activeRoomsCount = tenants.length;

  const { data: utilityBill, error: billError } = await supabase
    .from('utility_bills')
    .select('*')
    .eq('billing_month', currentMonth)
    .single();

  if (billError && billError.code !== 'PGRST116') {
     return { success: false, error: billError.message };
  }
  if (!utilityBill) {
    return { success: false, error: `No master utility bill found for ${currentMonth}. Please input master bills first.` };
  }

  const splitWater = utilityBill.total_water / activeRoomsCount;
  const splitWifi = utilityBill.total_wifi / activeRoomsCount;
  const splitGarbage = utilityBill.total_garbage / activeRoomsCount;

  const { data: meterReadings, error: readingsError } = await supabase
    .from('meter_readings')
    .select('*')
    .eq('billing_month', currentMonth);

  if (readingsError) return { success: false, error: readingsError.message };

  // Fetch any existing invoices for currentMonth so we preserve landlord's manual adjustments if already edited
  const { data: existingInvoices } = await supabase
    .from('invoices')
    .select('id, tenant_id, previous_balance, total_due, rent_amount, electricity_cost, water_share, wifi_share, garbage_share')
    .eq('billing_month', currentMonth);

  // Fetch all prior unpaid invoices for active tenants (billing_month < currentMonth)
  const { data: allPriorUnpaid } = await supabase
    .from('invoices')
    .select('id, tenant_id, total_due, billing_month')
    .lt('billing_month', currentMonth)
    .eq('payment_status', 'unpaid');

  const invoicesToInsert = [];

  for (const tenant of tenants) {
    const reading = meterReadings?.find((m) => m.tenant_id === tenant.id);
    let electricityCost = 0;

    if (reading) {
      const unitsUsed = Math.max(0, Number(reading.current_reading) - Number(reading.previous_reading || 0));
      const rate = Number(reading.rate_per_unit) || 12;
      electricityCost = unitsUsed * rate;
    }

    const currentCharges = Number(tenant.base_rent) + splitWater + splitWifi + splitGarbage + electricityCost;

    // Check if this tenant already had a manually set previous_balance on an existing invoice for this month
    const existing = existingInvoices?.find((i) => i.tenant_id === tenant.id);
    let previousBalance = 0;

    if (existing) {
      previousBalance = getInvoicePreviousBalance(existing);
    } else {
      // Auto-calculate sum of prior unpaid invoices for this tenant
      const tenantPriorUnpaid = (allPriorUnpaid || []).filter((inv) => inv.tenant_id === tenant.id);
      previousBalance = tenantPriorUnpaid.reduce((sum, inv) => sum + Number(inv.total_due || 0), 0);
    }

    const totalDue = currentCharges + previousBalance;

    invoicesToInsert.push({
      tenant_id: tenant.id,
      billing_month: currentMonth,
      rent_amount: tenant.base_rent,
      water_share: splitWater,
      wifi_share: splitWifi,
      garbage_share: splitGarbage,
      electricity_cost: electricityCost,
      previous_balance: previousBalance,
      total_due: totalDue,
      payment_status: 'unpaid',
    });
  }

  let { error: insertError } = await supabase
    .from('invoices')
    .upsert(invoicesToInsert, { onConflict: 'tenant_id, billing_month' });

  // If column previous_balance doesn't exist in schema cache yet, retry without previous_balance column
  if (insertError && insertError.code === 'PGRST204') {
    const stripped = invoicesToInsert.map(({ previous_balance, ...rest }) => rest);
    const retry = await supabase.from('invoices').upsert(stripped, { onConflict: 'tenant_id, billing_month' });
    insertError = retry.error;
  }

  if (insertError) return { success: false, error: insertError.message };

  // Revalidate both summary and specific invoice pages
  revalidatePath("/invoices");
  return { success: true };
}

export async function sendInvoiceEmail(invoiceId: string, emailOverride?: string) {
  const invoice = await fetchInvoiceById(invoiceId);
  if (!invoice) return { success: false, error: "Bill not found." };
  
  const tenant = invoice.tenants;
  const recipientEmail = emailOverride || tenant?.email;
  if (!tenant || !recipientEmail) return { success: false, error: "Recipient does not have an email address." };

  const monthLabel = new NepaliDate(new Date(invoice.billing_month + "-01")).format("MMMM YYYY");
  const prevBalance = getInvoicePreviousBalance(invoice);

  try {
    const emailHtml = await render(
        <InvoiceEmailTemplate
          tenantName={tenant.name || `Tenant ${tenant.room_no}`}
          roomNo={tenant.room_no}
          billingMonth={monthLabel}
          rentAmount={Number(invoice.rent_amount)}
          electricityCost={Number(invoice.electricity_cost)}
          waterShare={Number(invoice.water_share)}
          wifiShare={Number(invoice.wifi_share)}
          garbageShare={Number(invoice.garbage_share)}
          previousBalance={prevBalance}
          totalDue={Number(invoice.total_due)}
        /> as ReactElement
    );

    const qrPath = path.join(process.cwd(), "public", "payment-qr.jpg");
    const attachments = fs.existsSync(qrPath)
      ? [
          {
            filename: "esewa-qr.jpg",
            path: qrPath,
            cid: "payment-qr-image",
          },
        ]
      : [];

    await transporter.sendMail({
      from: `"House Rent" <${process.env.GMAIL_USER}>`,
      to: recipientEmail,
      subject: `Bill for ${monthLabel} - Room ${tenant.room_no}`,
      html: emailHtml,
      attachments,
    });

    // Update dispatch tracking in DB
    await supabase
      .from("invoices")
      .update({ 
        last_emailed_at: new Date().toISOString(),
        email_count: (invoice.email_count || 0) + 1
      })
      .eq("id", invoiceId);

    revalidatePath("/invoices");
    return { success: true };
  } catch (err) {
    return { success: false, error: getErrorMessage(err, "Failed to dispatch email.") };
  }
}

export async function sendBulkUnpaidEmails(billingMonth: string) {
  // 1. Fetch all unpaid invoices for this month that have a tenant email
  const { data: unpaidInvoices, error } = await supabase
    .from("invoices")
    .select("id, tenants(email)")
    .eq("billing_month", billingMonth)
    .eq("payment_status", "unpaid");

  if (error) return { success: false, error: error.message };
  
  const targets = (unpaidInvoices || []).filter(
    (inv) => normalizeTenant<{ email: string | null }>(inv.tenants)?.email
  );
  if (targets.length === 0) return { success: false, error: "No unpaid bills with email addresses found." };

  let sentCount = 0;
  let failCount = 0;

  // 2. Loop and send (with a tiny delay to avoid rate limiting)
  for (const inv of targets) {
    const result = await sendInvoiceEmail(inv.id);
    if (result.success) {
      sentCount++;
    } else {
      failCount++;
    }
  }

  revalidatePath("/invoices");
  return { 
    success: true, 
    sentCount, 
    failCount, 
    total: targets.length 
  };
}
