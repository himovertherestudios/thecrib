-- video_assets: Mux-backed video files attached to a performance. A
-- performance can have multiple assets of different types, and each type
-- may eventually carry different access rules (e.g. an approved promo
-- clip could later be visible to other org admins beyond the show's own
-- admins) — asset_type exists so that extension doesn't require a schema
-- change. Phase 1 does not populate this table; it exists so Phase 2's
-- Mux integration has a destination.
create table public.video_assets (
  id uuid primary key default gen_random_uuid(),
  performance_id uuid not null references public.performances (id) on delete cascade,
  asset_type text not null default 'full_set'
    check (asset_type in ('full_set', 'private_preview', 'social_clip', 'clean_clip', 'promo_clip')),
  mux_asset_id text,
  mux_playback_id text,
  mux_upload_id text,
  playback_policy text not null default 'signed'
    check (playback_policy in ('signed', 'public')),
  asset_status text not null default 'waiting_for_upload'
    check (asset_status in ('waiting_for_upload', 'uploading', 'preparing', 'ready', 'errored', 'deleted')),
  duration_seconds numeric,
  aspect_ratio text,
  thumbnail_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index video_assets_performance_id_idx on public.video_assets (performance_id);
create unique index video_assets_mux_asset_id_idx on public.video_assets (mux_asset_id) where mux_asset_id is not null;

create trigger video_assets_set_updated_at
  before update on public.video_assets
  for each row
  execute function public.set_updated_at();

alter table public.video_assets enable row level security;

-- Comedians may read metadata (status, duration, etc.) for assets tied to
-- their own performances. This does not itself grant playback — Phase 2's
-- signed-playback endpoint re-checks ownership and asset readiness
-- server-side before minting a Mux token; the browser never gets to
-- decide this on its own.
create policy "video_assets_select_own"
  on public.video_assets for select
  using (
    performance_id in (
      select p.id
      from public.performances p
      join public.comedian_profiles cp on cp.id = p.comedian_profile_id
      where cp.user_id = auth.uid()
    )
  );

create policy "video_assets_select_show_org_admin"
  on public.video_assets for select
  using (
    performance_id in (
      select p.id from public.performances p where public.is_show_org_admin(p.show_id)
    )
  );

create policy "video_assets_insert_show_org_admin"
  on public.video_assets for insert
  to authenticated
  with check (
    performance_id in (
      select p.id from public.performances p where public.is_show_org_admin(p.show_id)
    )
  );

create policy "video_assets_update_show_org_admin"
  on public.video_assets for update
  using (
    performance_id in (
      select p.id from public.performances p where public.is_show_org_admin(p.show_id)
    )
  )
  with check (
    performance_id in (
      select p.id from public.performances p where public.is_show_org_admin(p.show_id)
    )
  );

-- No delete policy: video lifecycle (including "deleted" status) is
-- managed via status transitions from the Mux webhook handler / service
-- role, not by end users removing rows directly.
