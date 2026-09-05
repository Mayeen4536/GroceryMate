import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

if (!url || !publishableKey) {
  throw new Error(
    'Missing Supabase configuration. Copy .env.example to .env.local and set ' +
      'VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY (see .env.example for where to find them).',
  )
}

// The publishable/anon key is safe to ship in browser code — it is not the
// authorization boundary. Every table this client can reach is gated by
// Postgres Row-Level Security (see supabase/migrations/*_authorization_rls.sql);
// this key only identifies the project. Never import a service_role key,
// database password, or management API token here.
export const supabase = createClient(url, publishableKey)
