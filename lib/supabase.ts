import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/** True iff both Supabase env vars look like real values. The UI shows a setup
 *  notice instead of the app when this is false. */
export const hasSupabase: boolean = Boolean(
  url && key && !url.includes("YOUR-PROJECT"),
);

// Harmless placeholders keep the static build from crashing during prerender
// when env vars are absent; real requests still need real values at runtime.
export const supabase = createClient(
  url ?? "https://placeholder.supabase.co",
  key ?? "placeholder-key",
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  },
);
