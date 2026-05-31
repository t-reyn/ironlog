export function SetupNotice() {
  return (
    <div className="mx-auto flex max-w-xl flex-1 flex-col justify-center gap-4 p-8">
      <h1 className="text-2xl font-semibold text-ember">IronLog needs Supabase</h1>
      <p className="text-ink-soft">
        Create a Supabase project, run <code className="text-steel">supabase/schema.sql</code>{" "}
        in its SQL editor, then add these to a{" "}
        <code className="text-steel">.env.local</code> file and restart the dev
        server:
      </p>
      <pre className="overflow-x-auto rounded-lg border border-line bg-surface p-4 text-sm text-ink-soft">
{`NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR-ANON-KEY`}
      </pre>
      <p className="text-sm text-ink-faint">
        Enable email auth (magic links) under Authentication → Providers.
      </p>
    </div>
  );
}
