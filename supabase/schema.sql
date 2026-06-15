create table if not exists public.app_state (
  id text primary key,
  state jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.app_state enable row level security;

-- Tidak ada policy publik. Semua akses dilakukan oleh API Vercel
-- menggunakan service role key yang tidak pernah dikirim ke browser.
