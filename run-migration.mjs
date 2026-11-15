import { createClient } from '@supabase/supabase-js';

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Try selecting the new columns — if they exist, the query succeeds
const { data, error } = await sb
  .from('invoices')
  .select('id, billing_month, total_due, payment_status, payment_date, payment_method, payment_notes, tenants(name, room_no)');

if (error) {
  console.log('Error:', error.message);
} else {
  console.log('Total invoices:', data.length);
  console.log(data);
}
