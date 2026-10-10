-- Таблица для синхронизации. Выполняется один раз в Supabase (SQL Editor).
-- В ней лежит один зашифрованный набор данных на каждого пользователя.
create table if not exists public.planer_data (
  user_id uuid primary key references auth.users (id) on delete cascade,
  data text not null,
  salt text not null,
  updated_at timestamptz not null default now()
);

alter table public.planer_data enable row level security;

create policy "own select" on public.planer_data for select using (auth.uid() = user_id);
create policy "own insert" on public.planer_data for insert with check (auth.uid() = user_id);
create policy "own update" on public.planer_data for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own delete" on public.planer_data for delete using (auth.uid() = user_id);
