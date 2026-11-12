// Client for the Sobra data layer (own Supabase project, SQL in db/).
// Separate from src/integrations/supabase/*, which Lovable generates for the research study on Lovable Cloud.
// The URL and publishable key are public by design (row level security protects the data), so they can sit here.
// Override them with VITE_SOBRA_SUPABASE_URL / VITE_SOBRA_SUPABASE_PUBLISHABLE_KEY in .env.local if needed.
// Never put the secret key in this file or in any browser code.
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

const DEFAULT_URL = "https://pjwepyjcahvascttlarc.supabase.co";
const DEFAULT_PUBLISHABLE_KEY = "sb_publishable_8HqHrRkay726r7vH5g1bNg_9tC1JBRN";

const url = import.meta.env['VITE_SOBRA_SUPABASE_URL'] || DEFAULT_URL;
const key = import.meta.env['VITE_SOBRA_SUPABASE_PUBLISHABLE_KEY'] || DEFAULT_PUBLISHABLE_KEY;

// Catalog reads only for now: no login yet, so no session is stored (keeps it apart from Lovable's auth storage).
export const sobraDb = createClient<Database>(url, key, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
});
