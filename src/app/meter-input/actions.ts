"use server";

import { supabase } from "@/lib/supabase";
import { revalidatePath } from "next/cache";

export async function fetchMeterData() {
  const now = new Date();
  const currentMonth = now.toISOString().slice(0, 7); // YYYY-MM
  
  // Safe previous month calculation: day=1 avoids 29th/30th/31st overflow
  const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevMonth = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, "0")}`;

  const { data: tenants } = await supabase.from("tenants").select("id, room_no, room_side").eq("is_active", true);
  const { data: lastReadings } = await supabase.from("meter_readings").select("tenant_id, current_reading").eq("billing_month", prevMonth);
  const { data: currentReadings } = await supabase.from("meter_readings").select("tenant_id, current_reading, previous_reading").eq("billing_month", currentMonth);
  const { data: invoices } = await supabase.from("invoices").select("tenant_id").eq("billing_month", currentMonth);

  // Natural numeric room sort (Room 2 before Room 10)
  const sortedTenants = (tenants || []).slice().sort((a, b) => {
    return a.room_no.localeCompare(b.room_no, undefined, { numeric: true, sensitivity: "base" });
  });

  const rooms = sortedTenants.map((t) => {
    const curr = currentReadings?.find((r) => r.tenant_id === t.id);
    const lastFromPrev = lastReadings?.find((r) => r.tenant_id === t.id)?.current_reading;
    const last =
      curr && curr.previous_reading !== null && curr.previous_reading !== undefined
        ? curr.previous_reading
        : (lastFromPrev ?? 0);
    const hasInvoice = invoices?.some((i) => i.tenant_id === t.id) || false;
    
    return {
      id: t.id,
      room_no: t.room_no,
      room_side: t.room_side,
      last_reading: Number(last) || 0,
      current_reading: curr ? Number(curr.current_reading) : null,
      has_invoice: hasInvoice,
    };
  });

  return { rooms, currentMonth };
}

export async function saveMeterReadings(
  readings: { tenant_id: string; room_no: string; previous_reading: number; current_reading: number }[],
  currentMonth: string,
  ratePerUnit: number = 12.0
) {
  const upsertData = readings.map((r) => ({
    tenant_id: r.tenant_id,
    room_no: r.room_no,
    billing_month: currentMonth,
    previous_reading: r.previous_reading || 0,
    current_reading: r.current_reading,
    rate_per_unit: ratePerUnit,
  }));

  const { error } = await supabase.from("meter_readings").upsert(upsertData, { onConflict: "tenant_id, billing_month" });

  if (error) return { success: false, error: error.message };

  // Update existing invoices for these tenants so electricity & total due reflect the new readings immediately
  const tenantIds = readings.map((r) => r.tenant_id);
  const { data: existingInvoices } = await supabase
    .from("invoices")
    .select("id, tenant_id, rent_amount, water_share, wifi_share, garbage_share")
    .in("tenant_id", tenantIds)
    .eq("billing_month", currentMonth);

  if (existingInvoices && existingInvoices.length > 0) {
    for (const inv of existingInvoices) {
      const reading = readings.find((r) => r.tenant_id === inv.tenant_id);
      if (reading) {
        // Delta calculation: Current - Previous
        const unitsUsed = Math.max(0, Number(reading.current_reading) - Number(reading.previous_reading || 0));
        const newElectricity = unitsUsed * ratePerUnit;
        const newTotal =
          Number(inv.rent_amount) +
          Number(inv.water_share || 0) +
          Number(inv.wifi_share || 0) +
          Number(inv.garbage_share || 0) +
          newElectricity;

        await supabase
          .from("invoices")
          .update({
            electricity_cost: newElectricity,
            total_due: newTotal,
          })
          .eq("id", inv.id);
      }
    }
  }

  revalidatePath("/meter-input");
  revalidatePath("/invoices");
  revalidatePath("/");
  return { success: true };
}

export async function generateInvoiceForRoom(
  tenantId: string, 
  currentMonth: string, 
  currentReading?: number, 
  ratePerUnit: number = 12.0,
  previousReading?: number
) {
  const { data: tenant, error: tError } = await supabase
    .from('tenants')
    .select('*')
    .eq('id', tenantId)
    .single();

  if (tError || !tenant) return { success: false, error: "Tenant not found." };

  let prevVal = previousReading;
  if (prevVal === undefined) {
    const { data: existingReading } = await supabase
      .from('meter_readings')
      .select('previous_reading')
      .eq('tenant_id', tenantId)
      .eq('billing_month', currentMonth)
      .maybeSingle();

    if (existingReading && existingReading.previous_reading !== null) {
      prevVal = Number(existingReading.previous_reading) || 0;
    } else {
      const [y, m] = currentMonth.split("-").map(Number);
      const prevDate = new Date(y, m - 2, 1);
      const prevMonth = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, "0")}`;
      const { data: lastMonthReading } = await supabase
        .from('meter_readings')
        .select('current_reading')
        .eq('tenant_id', tenantId)
        .eq('billing_month', prevMonth)
        .maybeSingle();

      prevVal = lastMonthReading ? Number(lastMonthReading.current_reading) : 0;
    }
  }

  // If a reading was provided directly from UI, persist it to meter_readings first
  if (currentReading !== undefined && !isNaN(currentReading)) {
    await supabase.from("meter_readings").upsert(
      {
        tenant_id: tenant.id,
        room_no: tenant.room_no,
        billing_month: currentMonth,
        previous_reading: prevVal || 0,
        current_reading: currentReading,
        rate_per_unit: ratePerUnit,
      },
      { onConflict: "tenant_id, billing_month" }
    );
  }

  const { data: reading, error: rError } = await supabase
    .from('meter_readings')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('billing_month', currentMonth)
    .single();

  if (rError && rError.code !== 'PGRST116') {
     return { success: false, error: rError.message };
  }

  let unitsUsed = 0;
  let unitRate = ratePerUnit;

  if (currentReading !== undefined && !isNaN(currentReading)) {
    unitsUsed = Math.max(0, currentReading - (prevVal || 0));
    unitRate = ratePerUnit;
  } else if (reading) {
    unitsUsed = Math.max(0, Number(reading.current_reading) - Number(reading.previous_reading || 0));
    unitRate = Number(reading.rate_per_unit) || ratePerUnit;
  }

  // Calculate electricity cost from units consumed (Current - Previous)
  const electricityCost = unitsUsed * unitRate;

  // Preserve existing payment status if already generated
  const { data: existingInvoice } = await supabase
    .from('invoices')
    .select('payment_status')
    .eq('tenant_id', tenantId)
    .eq('billing_month', currentMonth)
    .maybeSingle();

  const totalDue = 
    Number(tenant.base_rent) + 
    Number(tenant.water_rate || 0) + 
    Number(tenant.wifi_rate || 0) + 
    Number(tenant.garbage_rate || 0) + 
    electricityCost;

  const invoiceData = {
      tenant_id: tenant.id,
      billing_month: currentMonth,
      rent_amount: tenant.base_rent,
      water_share: tenant.water_rate || 0,
      wifi_share: tenant.wifi_rate || 0,
      garbage_share: tenant.garbage_rate || 0,
      electricity_cost: electricityCost,
      total_due: totalDue,
      payment_status: existingInvoice?.payment_status || 'unpaid',
  };

  const { error: insertError } = await supabase
    .from('invoices')
    .upsert(invoiceData, { onConflict: 'tenant_id, billing_month' });

  if (insertError) return { success: false, error: insertError.message };

  revalidatePath("/invoices");
  revalidatePath("/meter-input");
  revalidatePath("/");
  return { success: true };
}
