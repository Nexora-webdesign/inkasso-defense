-- Inkasso-Defense · System-Heartbeat (für Selbstcheck/Monitoring)
-- Im Supabase SQL-Editor ausführen. Idempotent.
-- Nur der Service-Role-Cron schreibt/liest hier; RLS aktiv, KEINE Policy -> für
-- normale Nutzer komplett gesperrt (Service-Role umgeht RLS).

create table if not exists public.system_status (
  key        text primary key,
  updated_at timestamptz not null default now()
);
alter table public.system_status enable row level security;
-- bewusst keine Policy: kein Zugriff für anon/authenticated.
