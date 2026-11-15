import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("Supabase credentials not found in environment variables");
}

// Browser-safe client (uses anon key, safe to expose).
// Cached on globalThis so hot reloads don't create duplicate GoTrueClient instances.
const globalForSupabase = globalThis as unknown as { __supabase?: SupabaseClient };
export const supabase: SupabaseClient =
  globalForSupabase.__supabase ?? createClient(supabaseUrl, supabaseAnonKey);
globalForSupabase.__supabase = supabase;

// Server-only client (uses service role key - bypasses RLS and schema cache issues)
// Only use this in server actions and API routes.
// Not created in the browser, which avoids a second GoTrueClient instance there.
export const supabaseAdmin: SupabaseClient =
  typeof window === 'undefined'
    ? createClient(supabaseUrl, supabaseServiceKey || supabaseAnonKey, {
        db: { schema: 'public' },
        auth: { persistSession: false },
      })
    : (undefined as unknown as SupabaseClient);
