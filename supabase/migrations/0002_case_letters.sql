-- Inkasso-Defense · Folgeschreiben pro Fall (durchgehende Fall-Betreuung)
-- Im Supabase SQL-Editor ausführen. Idempotent.
-- Speichert NUR die berechnete Analyse/Zusammenfassung eines Schreibens – KEIN Rohdokument.

create table if not exists public.case_letters (
  id            uuid primary key default gen_random_uuid(),
  case_id       uuid not null references public.cases(id) on delete cascade,
  user_id       uuid not null references auth.users(id) on delete cascade,
  letter_type   text not null
                  check (letter_type in (
                    'zahlungserinnerung','mahnung','inkasso','mahnbescheid',
                    'vollstreckungsbescheid','glaeubiger_antwort','sonstiges'
                  )),
  summary       text,                 -- neutrale KI-Zusammenfassung
  analysis_json jsonb,                -- {letterType, summary, absender, aktenzeichen, fristTage, zustelldatum, istGerichtlich, fordertZahlung}
  created_at    timestamptz not null default now()
);
alter table public.case_letters enable row level security;
drop policy if exists case_letters_select_own on public.case_letters;
drop policy if exists case_letters_insert_own on public.case_letters;
drop policy if exists case_letters_delete_own on public.case_letters;
create policy case_letters_select_own on public.case_letters for select using (auth.uid() = user_id);
create policy case_letters_insert_own on public.case_letters for insert with check (auth.uid() = user_id);
create policy case_letters_delete_own on public.case_letters for delete using (auth.uid() = user_id);
create index if not exists case_letters_case_idx on public.case_letters(case_id);
