-- Inkasso-Defense · Migration 0004 — Mehrmandantenfähigkeit (B2B-Kanzlei)
-- Im Supabase SQL-Editor ausführen. Idempotent (if [not] exists / drop-create policies / guarded DO).
--
-- SCOPE: NUR Schema + RLS. Der App-Code ist NACH 0004 noch user-basiert und mit den neuen
--        kanzlei-RLS-Policies INKOMPATIBEL → 0004 NICHT live deployen, bis der API-Folge-PR steht.
--        Nur gegen Test-Supabase ausführen.
--
-- DATEN: sauberer Schnitt (pre-customer). Bestehende Fall-Daten werden verworfen (TRUNCATE),
--        KEIN Backfill. profiles/auth.users bleiben unangetastet.
--
-- ZUGRIFF: Mitgliedschaft in einer Kanzlei (kanzlei_members) ist die Zugriffsgrundlage,
--          Schreibrechte sind rollenabhängig (inhaber/anwalt/mitarbeiter).

-- ─────────────────────────────────────────────────────────────────────────────
-- 0) Sauberer Schnitt: Fall-Daten leeren (FK-Kaskade über cases).
--    Achtung: löscht bewusst alle bestehenden (Test-)Akten. profiles/auth.users bleiben.
-- ─────────────────────────────────────────────────────────────────────────────
truncate table public.consumed_licenses, public.case_letters, public.reminders, public.cases
  restart identity cascade;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1) Alte, user-basierte Policies entfernen (werden durch kanzlei-basierte ersetzt).
-- ─────────────────────────────────────────────────────────────────────────────
drop policy if exists cases_select_own on public.cases;
drop policy if exists cases_insert_own on public.cases;
drop policy if exists cases_update_own on public.cases;
drop policy if exists cases_delete_own on public.cases;

drop policy if exists reminders_select_own on public.reminders;
drop policy if exists reminders_insert_own on public.reminders;
drop policy if exists reminders_update_own on public.reminders;
drop policy if exists reminders_delete_own on public.reminders;

drop policy if exists case_letters_select_own on public.case_letters;
drop policy if exists case_letters_insert_own on public.case_letters;
drop policy if exists case_letters_delete_own on public.case_letters;

drop policy if exists consumed_select_own on public.consumed_licenses;
drop policy if exists consumed_insert_own on public.consumed_licenses;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2) Neue Tabellen: kanzleien, kanzlei_members, mandanten
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.kanzleien (
  id         uuid primary key default gen_random_uuid(),
  name       text not null default 'Meine Kanzlei',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
alter table public.kanzleien enable row level security;

create table if not exists public.kanzlei_members (
  kanzlei_id uuid not null references public.kanzleien(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  role       text not null check (role in ('inhaber','anwalt','mitarbeiter')),
  created_at timestamptz not null default now(),
  primary key (kanzlei_id, user_id)
);
alter table public.kanzlei_members enable row level security;
create index if not exists kanzlei_members_user_idx on public.kanzlei_members(user_id);

create table if not exists public.mandanten (
  id         uuid primary key default gen_random_uuid(),
  kanzlei_id uuid not null references public.kanzleien(id) on delete cascade,
  typ        text not null check (typ in ('verbraucher','unternehmer')),
  name       text not null,
  kontakt    text,
  notiz      text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
alter table public.mandanten enable row level security;
create index if not exists mandanten_kanzlei_idx on public.mandanten(kanzlei_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 3) RLS-Helper (security definer, im Besitz von postgres → umgehen RLS auf
--    kanzlei_members und vermeiden so Policy-Rekursion).
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.is_kanzlei_member(k uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.kanzlei_members m
    where m.kanzlei_id = k and m.user_id = auth.uid()
  );
$$;

create or replace function public.kanzlei_role(k uuid)
returns text language sql stable security definer set search_path = public as $$
  select m.role from public.kanzlei_members m
  where m.kanzlei_id = k and m.user_id = auth.uid();
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4) cases → "Akten" erweitern; user_id → created_by (Audit, kein Zugriffsanker).
--    Tabelle ist nach TRUNCATE leer → NOT-NULL-Spalten gefahrlos setzbar.
-- ─────────────────────────────────────────────────────────────────────────────
do $$
begin
  if exists (select 1 from information_schema.columns
             where table_schema='public' and table_name='cases' and column_name='user_id')
     and not exists (select 1 from information_schema.columns
             where table_schema='public' and table_name='cases' and column_name='created_by')
  then
    alter table public.cases rename column user_id to created_by;
  end if;
end $$;

-- created_by: Audit-Feld, muss User-Löschung überleben (Akte gehört der Kanzlei).
alter table public.cases alter column created_by drop not null;
alter table public.cases drop constraint if exists cases_user_id_fkey;
alter table public.cases drop constraint if exists cases_created_by_fkey;
alter table public.cases
  add constraint cases_created_by_fkey
  foreign key (created_by) references auth.users(id) on delete set null;

alter table public.cases add column if not exists kanzlei_id   uuid references public.kanzleien(id) on delete cascade;
alter table public.cases add column if not exists mandant_id   uuid references public.mandanten(id) on delete set null;
alter table public.cases add column if not exists aktenzeichen text;            -- kanzlei-internes Az (≠ Inkasso-Az in result_json)
alter table public.cases add column if not exists assigned_to  uuid references auth.users(id) on delete set null;
alter table public.cases add column if not exists rules_version text;           -- RULES_VERSION, mit der die Akte erzeugt wurde
alter table public.cases alter column kanzlei_id set not null;
create index if not exists cases_kanzlei_idx on public.cases(kanzlei_id);

-- Vorgabe 4: Kanzlei-Akten unterliegen KEINER 90-Tage-Auto-Löschung (Aufbewahrungspflicht).
-- auto_delete_at bleibt als Spalte erhalten, wird aber für Akten nicht automatisch gesetzt
-- (Default = NULL = unbegrenzte Aufbewahrung). Retention ist später abschaltbar/auf Jahre stellbar.
alter table public.cases alter column auto_delete_at drop default;
comment on column public.cases.auto_delete_at is
  'Aufbewahrungsende. Fuer Kanzlei-Akten i. d. R. NULL (keine Auto-Loeschung; Aufbewahrungspflicht).';

-- ─────────────────────────────────────────────────────────────────────────────
-- 5) case_letters / reminders / consumed_licenses umhängen (kanzlei_id + created_by).
-- ─────────────────────────────────────────────────────────────────────────────
do $$
begin
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='case_letters' and column_name='user_id')
     and not exists (select 1 from information_schema.columns where table_schema='public' and table_name='case_letters' and column_name='created_by')
  then alter table public.case_letters rename column user_id to created_by; end if;

  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='reminders' and column_name='user_id')
     and not exists (select 1 from information_schema.columns where table_schema='public' and table_name='reminders' and column_name='created_by')
  then alter table public.reminders rename column user_id to created_by; end if;

  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='consumed_licenses' and column_name='user_id')
     and not exists (select 1 from information_schema.columns where table_schema='public' and table_name='consumed_licenses' and column_name='created_by')
  then alter table public.consumed_licenses rename column user_id to created_by; end if;
end $$;

-- created_by überall: nullable + on delete set null (Audit überlebt User-Löschung).
alter table public.case_letters      alter column created_by drop not null;
alter table public.reminders         alter column created_by drop not null;
alter table public.consumed_licenses alter column created_by drop not null;

alter table public.case_letters      drop constraint if exists case_letters_user_id_fkey;
alter table public.reminders         drop constraint if exists reminders_user_id_fkey;
alter table public.consumed_licenses drop constraint if exists consumed_licenses_user_id_fkey;
alter table public.case_letters      drop constraint if exists case_letters_created_by_fkey;
alter table public.reminders         drop constraint if exists reminders_created_by_fkey;
alter table public.consumed_licenses drop constraint if exists consumed_licenses_created_by_fkey;
alter table public.case_letters      add constraint case_letters_created_by_fkey      foreign key (created_by) references auth.users(id) on delete set null;
alter table public.reminders         add constraint reminders_created_by_fkey         foreign key (created_by) references auth.users(id) on delete set null;
alter table public.consumed_licenses add constraint consumed_licenses_created_by_fkey foreign key (created_by) references auth.users(id) on delete set null;

-- kanzlei_id: nach TRUNCATE leer → direkt NOT NULL (Tabellen enthalten keine Daten).
alter table public.case_letters      add column if not exists kanzlei_id uuid references public.kanzleien(id) on delete cascade;
alter table public.reminders         add column if not exists kanzlei_id uuid references public.kanzleien(id) on delete cascade;
alter table public.consumed_licenses add column if not exists kanzlei_id uuid references public.kanzleien(id) on delete cascade;
alter table public.case_letters      alter column kanzlei_id set not null;
alter table public.reminders         alter column kanzlei_id set not null;
-- consumed_licenses: kanzlei_id darf NULL bleiben (Altbestand/entkoppelte Lizenzen), aber Index für Lookup.
create index if not exists case_letters_kanzlei_idx      on public.case_letters(kanzlei_id);
create index if not exists reminders_kanzlei_idx         on public.reminders(kanzlei_id);
create index if not exists consumed_licenses_kanzlei_idx on public.consumed_licenses(kanzlei_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 6) Vorgabe 2: kanzlei_id von case_letters/reminders ist NIE client-setzbar.
--    BEFORE INSERT/UPDATE-Trigger leitet sie zwingend aus der Eltern-Akte (case_id) ab
--    und überschreibt jeden mitgesendeten Wert. (security definer → liest cases RLS-frei.)
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.enforce_kanzlei_from_case()
returns trigger language plpgsql security definer set search_path = public as $$
declare k uuid;
begin
  select c.kanzlei_id into k from public.cases c where c.id = new.case_id;
  if k is null then
    raise exception 'case % existiert nicht oder hat keine kanzlei_id', new.case_id
      using errcode = '23503';
  end if;
  new.kanzlei_id := k;   -- erzwingen, unabhängig vom Client-Wert
  return new;
end $$;

drop trigger if exists trg_case_letters_kanzlei on public.case_letters;
create trigger trg_case_letters_kanzlei
  before insert or update of case_id, kanzlei_id on public.case_letters
  for each row execute function public.enforce_kanzlei_from_case();

drop trigger if exists trg_reminders_kanzlei on public.reminders;
create trigger trg_reminders_kanzlei
  before insert or update of case_id, kanzlei_id on public.reminders
  for each row execute function public.enforce_kanzlei_from_case();

-- ─────────────────────────────────────────────────────────────────────────────
-- 7) RLS-Policies (Mitgliedschaft + Rolle)
-- ─────────────────────────────────────────────────────────────────────────────
-- kanzleien
drop policy if exists kanzleien_select on public.kanzleien;
drop policy if exists kanzleien_insert on public.kanzleien;
drop policy if exists kanzleien_update on public.kanzleien;
drop policy if exists kanzleien_delete on public.kanzleien;
create policy kanzleien_select on public.kanzleien for select using (public.is_kanzlei_member(id));
create policy kanzleien_insert on public.kanzleien for insert with check (created_by = auth.uid());
create policy kanzleien_update on public.kanzleien for update using (public.kanzlei_role(id) = 'inhaber') with check (public.kanzlei_role(id) = 'inhaber');
create policy kanzleien_delete on public.kanzleien for delete using (public.kanzlei_role(id) = 'inhaber');

-- kanzlei_members (Bootstrap der eigenen Solo-Kanzlei erfolgt RLS-frei im handle_new_user-Trigger)
drop policy if exists kanzlei_members_select on public.kanzlei_members;
drop policy if exists kanzlei_members_insert on public.kanzlei_members;
drop policy if exists kanzlei_members_update on public.kanzlei_members;
drop policy if exists kanzlei_members_delete on public.kanzlei_members;
create policy kanzlei_members_select on public.kanzlei_members for select using (public.is_kanzlei_member(kanzlei_id));
create policy kanzlei_members_insert on public.kanzlei_members for insert with check (public.kanzlei_role(kanzlei_id) = 'inhaber');
create policy kanzlei_members_update on public.kanzlei_members for update using (public.kanzlei_role(kanzlei_id) = 'inhaber') with check (public.kanzlei_role(kanzlei_id) = 'inhaber');
create policy kanzlei_members_delete on public.kanzlei_members for delete using (public.kanzlei_role(kanzlei_id) = 'inhaber');

-- mandanten
drop policy if exists mandanten_select on public.mandanten;
drop policy if exists mandanten_insert on public.mandanten;
drop policy if exists mandanten_update on public.mandanten;
drop policy if exists mandanten_delete on public.mandanten;
create policy mandanten_select on public.mandanten for select using (public.is_kanzlei_member(kanzlei_id));
create policy mandanten_insert on public.mandanten for insert with check (public.kanzlei_role(kanzlei_id) in ('inhaber','anwalt','mitarbeiter'));
create policy mandanten_update on public.mandanten for update using (public.kanzlei_role(kanzlei_id) in ('inhaber','anwalt','mitarbeiter')) with check (public.kanzlei_role(kanzlei_id) in ('inhaber','anwalt','mitarbeiter'));
create policy mandanten_delete on public.mandanten for delete using (public.kanzlei_role(kanzlei_id) in ('inhaber','anwalt'));

-- cases (Akten)
create policy cases_select on public.cases for select using (public.is_kanzlei_member(kanzlei_id));
create policy cases_insert on public.cases for insert with check (public.kanzlei_role(kanzlei_id) in ('inhaber','anwalt','mitarbeiter'));
create policy cases_update on public.cases for update using (public.is_kanzlei_member(kanzlei_id)) with check (public.kanzlei_role(kanzlei_id) in ('inhaber','anwalt','mitarbeiter'));
create policy cases_delete on public.cases for delete using (public.kanzlei_role(kanzlei_id) in ('inhaber','anwalt'));

-- case_letters (kanzlei_id wird per Trigger gesetzt; WITH CHECK greift auf den erzwungenen Wert)
create policy case_letters_select on public.case_letters for select using (public.is_kanzlei_member(kanzlei_id));
create policy case_letters_insert on public.case_letters for insert with check (public.kanzlei_role(kanzlei_id) in ('inhaber','anwalt','mitarbeiter'));
create policy case_letters_delete on public.case_letters for delete using (public.kanzlei_role(kanzlei_id) in ('inhaber','anwalt'));

-- reminders (Versand/Update i. d. R. via Service-Role-Cron; RLS regelt nur Nutzerzugriff)
create policy reminders_select on public.reminders for select using (public.is_kanzlei_member(kanzlei_id));
create policy reminders_insert on public.reminders for insert with check (public.kanzlei_role(kanzlei_id) in ('inhaber','anwalt','mitarbeiter'));
create policy reminders_update on public.reminders for update using (public.is_kanzlei_member(kanzlei_id)) with check (public.is_kanzlei_member(kanzlei_id));
create policy reminders_delete on public.reminders for delete using (public.kanzlei_role(kanzlei_id) in ('inhaber','anwalt'));

-- consumed_licenses (Reuse-Schutz; weiterhin KEIN update/delete)
create policy consumed_select on public.consumed_licenses for select using (public.is_kanzlei_member(kanzlei_id));
create policy consumed_insert on public.consumed_licenses for insert with check (public.is_kanzlei_member(kanzlei_id));

-- ─────────────────────────────────────────────────────────────────────────────
-- 8) Auto-Onboarding: bei Registrierung Profil + Solo-Kanzlei + Inhaber-Mitgliedschaft.
--    Läuft als security definer (RLS-frei) → löst das Bootstrap-Henne-Ei-Problem.
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare new_kanzlei uuid;
begin
  insert into public.profiles (id, email) values (new.id, new.email)
    on conflict (id) do nothing;

  insert into public.kanzleien (name, created_by)
    values (coalesce(nullif(split_part(new.email, '@', 1), ''), 'Meine Kanzlei'), new.id)
    returning id into new_kanzlei;

  insert into public.kanzlei_members (kanzlei_id, user_id, role)
    values (new_kanzlei, new.id, 'inhaber')
    on conflict (kanzlei_id, user_id) do nothing;

  return new;
end $$;

-- Trigger on_auth_user_created besteht bereits (0001) und ruft handle_new_user erneut auf — unverändert.
