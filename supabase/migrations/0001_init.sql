-- Inkasso-Defense · Premium „Fall-Begleitung" – Schema + RLS
-- Im Supabase SQL-Editor ausführen (Project → SQL Editor → New query → Run).
-- Idempotent (if not exists / drop-create policies), gefahrlos erneut ausführbar.

-- ─────────────────────────────────────────────────────────────────────────────
-- profiles (1:1 zu auth.users)
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.profiles (
  id                 uuid primary key references auth.users(id) on delete cascade,
  email              text,
  consent_storage_at timestamptz,
  created_at         timestamptz not null default now()
);
alter table public.profiles enable row level security;
drop policy if exists profiles_select_own on public.profiles;
drop policy if exists profiles_insert_own on public.profiles;
drop policy if exists profiles_update_own on public.profiles;
drop policy if exists profiles_delete_own on public.profiles;
create policy profiles_select_own on public.profiles for select using (auth.uid() = id);
create policy profiles_insert_own on public.profiles for insert with check (auth.uid() = id);
create policy profiles_update_own on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);
create policy profiles_delete_own on public.profiles for delete using (auth.uid() = id);

-- ─────────────────────────────────────────────────────────────────────────────
-- cases (gespeicherte Analyse + Status/Fristen + Premium-Fenster)
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.cases (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users(id) on delete cascade,
  title            text,
  result_json      jsonb,              -- nur das berechnete Ergebnis, KEIN Rohdokument
  status           text not null default 'offen'
                     check (status in ('offen','widerspruch_gesendet','mahnbescheid_erhalten','erledigt')),
  frist_widerspruch date,
  premium_until    timestamptz,        -- null = keine aktive Begleitung
  auto_delete_at   timestamptz,        -- Aufbewahrungsende (Cleanup-Cron)
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
alter table public.cases enable row level security;
drop policy if exists cases_select_own on public.cases;
drop policy if exists cases_insert_own on public.cases;
drop policy if exists cases_update_own on public.cases;
drop policy if exists cases_delete_own on public.cases;
create policy cases_select_own on public.cases for select using (auth.uid() = user_id);
create policy cases_insert_own on public.cases for insert with check (auth.uid() = user_id);
create policy cases_update_own on public.cases for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy cases_delete_own on public.cases for delete using (auth.uid() = user_id);
create index if not exists cases_user_idx on public.cases(user_id);
create index if not exists cases_autodelete_idx on public.cases(auto_delete_at);

-- ─────────────────────────────────────────────────────────────────────────────
-- reminders (Fristen-Erinnerungen; Versand via Cron mit Service-Role)
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.reminders (
  id         uuid primary key default gen_random_uuid(),
  case_id    uuid not null references public.cases(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  type       text not null check (type in ('widerspruch_14tage','folge_erinnerung')),
  due_at     timestamptz not null,
  sent_at    timestamptz,
  created_at timestamptz not null default now()
);
alter table public.reminders enable row level security;
drop policy if exists reminders_select_own on public.reminders;
drop policy if exists reminders_insert_own on public.reminders;
drop policy if exists reminders_update_own on public.reminders;
drop policy if exists reminders_delete_own on public.reminders;
create policy reminders_select_own on public.reminders for select using (auth.uid() = user_id);
create policy reminders_insert_own on public.reminders for insert with check (auth.uid() = user_id);
create policy reminders_update_own on public.reminders for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy reminders_delete_own on public.reminders for delete using (auth.uid() = user_id);
create index if not exists reminders_due_open_idx on public.reminders(due_at) where sent_at is null;

-- ─────────────────────────────────────────────────────────────────────────────
-- consumed_licenses (Reuse-Schutz; nur SHA-256-Hash, nie Klartext)
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.consumed_licenses (
  id           uuid primary key default gen_random_uuid(),
  license_hash text not null unique,
  user_id      uuid not null references auth.users(id) on delete cascade,
  case_id      uuid references public.cases(id) on delete set null,
  product_id   text,
  consumed_at  timestamptz not null default now()
);
alter table public.consumed_licenses enable row level security;
drop policy if exists consumed_select_own on public.consumed_licenses;
drop policy if exists consumed_insert_own on public.consumed_licenses;
create policy consumed_select_own on public.consumed_licenses for select using (auth.uid() = user_id);
create policy consumed_insert_own on public.consumed_licenses for insert with check (auth.uid() = user_id);
-- bewusst KEIN update/delete (Manipulationsschutz)

-- ─────────────────────────────────────────────────────────────────────────────
-- Auto-Profil bei Registrierung
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email) values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
