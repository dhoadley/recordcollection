-- Row Level Security for a PRIVATE single-user collection.
--
-- Run this once in the Supabase dashboard: SQL Editor -> New query -> paste -> Run.
--
-- Effect:
--   * Enables RLS on both tables (so the public anon key can no longer read or
--     write anything on its own).
--   * Grants full read/write ONLY to logged-in (authenticated) users.
--
-- Combined with disabling public sign-ups and creating a single user (see
-- README), this means only you can see or change the collection.

alter table public.albums   enable row level security;
alter table public.wishlist enable row level security;

-- albums: authenticated users get full access.
drop policy if exists "authenticated_full_access" on public.albums;
create policy "authenticated_full_access"
  on public.albums
  for all
  to authenticated
  using (true)
  with check (true);

-- wishlist: authenticated users get full access.
drop policy if exists "authenticated_full_access" on public.wishlist;
create policy "authenticated_full_access"
  on public.wishlist
  for all
  to authenticated
  using (true)
  with check (true);
