import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("❌ Missing environment variables. Please run with node --env-file=.env.local seed-tenants.mjs");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const tenants = [];
for (let i = 1; i <= 12; i++) {
  tenants.push({
    name: `Tenant ${i}`,
    room_no: `${i}`,
    base_rent: 5000,
    is_active: true,
  });
}

console.log('Inserting 12 tenants with Rs.5000 rent each...\n');

const { data, error } = await supabase
  .from('tenants')
  .insert(tenants)
  .select();

if (error) {
  console.error('Error inserting tenants:', error);
  process.exit(1);
}

console.log(`✅ Successfully created ${data.length} tenants:\n`);
data.forEach((t) => {
  console.log(`  Room ${t.room_no} — ${t.name} — Rs.${t.base_rent}`);
});
