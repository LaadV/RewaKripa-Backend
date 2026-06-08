// ============================================================
//  REWA KRIPA TRAVELS — Supabase Client (Backend)
//  src/config/supabase.js
//
//  Uses the SERVICE ROLE key (never expose to frontend).
//  This bypasses Row Level Security — safe only server-side.
// ============================================================

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL         = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌  Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken : false,
    persistSession   : false,
    detectSessionInUrl: false,
  },
});

module.exports = { supabase };
