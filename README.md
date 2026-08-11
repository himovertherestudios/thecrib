# TheCrib — Phase 1 + Phase 2

A mobile-first web app for comedy clubs: comedians check in via QR code, set
independent recording / private-access / promotional consent, and privately
access their recorded sets via signed Mux playback.

Phase 1: Next.js + Supabase data model, auth, RLS, check-in flow, and
admin/comedian dashboards. Phase 2: Mux direct upload, webhook processing,
and signed private playback. **No Stripe, no email automation yet.**

## Stack

- Next.js 15 (App Router) + TypeScript + Tailwind CSS
- Supabase (Postgres, Auth, Row Level Security)
- Mux (`@mux/mux-node`, `@mux/mux-uploader-react`, `@mux/mux-player-react`) — video ingestion, processing, and signed private playback

## Local setup

Requires Node.js 20+ and npm.

```bash
npm install
cp .env.example .env.local
```

Fill in `.env.local` with your Supabase project's URL/keys (see below), then:

```bash
npm run dev
```

## Supabase configuration

1. Create a Supabase project.
2. In **Project Settings → API**, copy:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` (server-only — never
     expose this to the browser, never prefix it `NEXT_PUBLIC_`)
3. In **Authentication → URL Configuration**, add your dev and production
   origins (e.g. `http://localhost:3000`, `https://yourdomain.com`) to
   **Redirect URLs** — the magic-link callback (`/auth/callback`) needs
   this. Also set **Site URL** to your real production origin once you
   have one — it's the fallback used when a requested redirect isn't on
   the allow-list, and defaults to `localhost:3000` otherwise.
4. Configure **custom SMTP** (Project Settings → Authentication → SMTP
   Settings). Supabase's built-in mailer is rate-limited and meant for
   testing only — real usage (and even moderate local testing) needs your
   own provider (Resend, Postmark, SendGrid, etc.). Without this you'll
   eventually hit "email rate limit exceeded."
5. In **Authentication → Email Templates → Magic Link**, make sure the
   template includes `{{ .Token }}` somewhere visible (e.g. "Or enter this
   code: {{ .Token }}"). The check-in flow's "enter your code" step (see
   below) depends on the numeric code actually being shown in the email —
   Supabase's default template may only show the clickable link.
6. Apply the database migrations (below).

### Database migrations

Migrations live in `supabase/migrations/`, numbered in the order they must
run. Apply them either:

**Via the Supabase CLI** (recommended once you have a project linked):

```bash
supabase link --project-ref <your-project-ref>
supabase db push
```

**Or via the SQL Editor** in the Supabase dashboard: open each file in
`supabase/migrations/` in order (`0001_...` through `0010_...`) and run it.

Migration contents:

| File | Creates |
| --- | --- |
| `0001_extensions_and_helpers.sql` | `pgcrypto`, `set_updated_at()` trigger fn |
| `0002_profiles.sql` | `profiles`, auto-insert-on-signup trigger, RLS |
| `0003_organizations.sql` | `organizations`, `organization_members`, `is_org_member`/`is_org_admin` helpers, RLS |
| `0004_clubs.sql` | `clubs`, RLS |
| `0005_shows.sql` | `shows`, `is_show_org_admin`/`is_show_org_member` helpers, RLS |
| `0006_comedian_profiles.sql` | `comedian_profiles`, self-claim RLS policy |
| `0007_check_ins.sql` | `check_ins`, RLS (+ admin-read policy on `comedian_profiles`) |
| `0008_consent_records.sql` | `consent_records`, RLS |
| `0009_performances.sql` | `performances`, RLS |
| `0010_video_assets.sql` | `video_assets`, RLS |
| `0011_fix_comedian_profiles_recursion.sql` | Fixes an RLS recursion between `comedian_profiles` and `check_ins` (see Row Level Security below) |
| `0012_fix_comedian_profiles_self_claim_visibility.sql` | Adds the missing SELECT policy that lets a comedian's self-claim UPDATE actually see its own target row |

No seed data is included. To try the app end-to-end: sign in, create an
organization from `/admin` (you become its first admin automatically),
add a club and a show, then open the show's QR code / `/check-in?show=<id>`
in another tab (or on your phone) to check in as a comedian.

## Authentication

Passwordless via Supabase Auth (`signInWithOtp`), in two different shapes
depending on entry point:

- `/login` — enter an email, receive a magic **link**; clicking it hits
  `/auth/callback`, which exchanges the code for a session (PKCE flow) and
  redirects to `/dashboard`.
- `/check-in` — after submitting the intake form, the same email is sent a
  numeric **code** instead (`CheckInForm.tsx`). The comedian types it back
  into the same page (`verifyOtp`), which establishes a session directly
  in the browser with no separate email-link round trip, then hard-navigates
  to `/dashboard`. This is what lets check-in flow straight into "their own
  portal" in one sitting, per the product's UX goal, rather than sending
  them off to discover `/login` on their own afterward. See the email
  template note above — the code has to actually be visible in the email
  for this to work.
- `src/middleware.ts` refreshes the session cookie on every request, since
  Server Components can't write cookies themselves.

There are two client entry points besides the browser client:

- `lib/supabase/server.ts` — RLS-respecting, bound to the current
  request's session. Used by almost everything.
- `lib/supabase/admin.ts` — service-role, **bypasses RLS**. Used only for
  the unauthenticated check-in write path, the public check-in page's
  show-info read, and (in Phase 2) the Mux webhook handler. Imports
  `server-only` so an accidental client-bundle import fails the build.

## Roles

There's no global `is_admin` flag. Admin is scoped per-organization via
`organization_members.role`. A user can be an admin of one org and not
another, or a comedian, or both. Comedian identity lives in
`comedian_profiles`, linked to a `profiles` row via `user_id` — which can
be `null` at first, because check-in doesn't require an account:

1. Someone checks in via QR before ever signing up. `comedian_profiles` is
   created (or matched by email) with `user_id = null`, via the
   service-role client from the check-in server action.
2. The check-in flow immediately sends that same email an OTP code and
   verifies it in the browser (see Authentication above), landing on
   `/dashboard` in the same sitting. `claimComedianProfileIfNeeded`
   (`lib/auth.ts`) also runs on every `/dashboard` load regardless — so if
   someone instead signs in later via `/login` with a matching email, the
   link still gets claimed then. Either path is enforced by RLS, not by
   this function's own logic: an UPDATE policy only allows setting
   `user_id` when the row is unclaimed and the email matches the caller's
   verified Supabase Auth email, and a matching SELECT policy makes that
   unclaimed row visible to them in the first place (see Row Level
   Security below — the two only being *jointly* sufficient, not each
   alone, is exactly what went wrong the first time this was built).

Any authenticated user can create an organization from `/admin` and
becomes its first admin automatically (RLS only allows self-inserting as
an org's *founding* admin when that org has zero members; adding further
members after that requires an existing admin). This is a deliberate
bootstrapping shortcut for the MVP — see Known limitations.

## Row Level Security

RLS is enabled on every table and is the actual authority — not React
route guards, not the Next.js server. All service-role usage is limited
to `lib/supabase/admin.ts`'s three call sites (above). Everything else
goes through the anon-key, RLS-governed client, including admin writes
(creating orgs/clubs/shows) from the server actions in `src/app/admin/`.

Summary of what's enforced in the database:

- **profiles** — read/update own row only.
- **organizations** / **organization_members** — members can read; only
  admins can write; founding-admin bootstrap as described above.
- **clubs** / **shows** — readable/writable only by admins of the owning
  organization. No anon/public read policy — the public `/check-in` page
  gets show display info through the service-role client in a server
  component, not a client-side query.
- **comedian_profiles** — a comedian reads/self-claims only their own row,
  *and* can see an unclaimed row that matches their verified email (see
  below — required for the self-claim UPDATE to have anything to act on);
  admins can read comedian profiles tied to a check-in at one of their
  shows.
- **check_ins** / **consent_records** — a comedian reads only their own;
  admins read only rows tied to their org's shows. No insert policy at
  all — writes happen only via the service-role check-in server action,
  after server-side validation with Zod.
- **performances** / **video_assets** — a comedian reads only their own;
  admins of the owning show's organization can read/write. `video_assets`
  has no delete policy — asset lifecycle (including a `deleted` status) is
  managed by Phase 2's Mux webhook handler, not by end users.

Helper functions (`is_org_member`, `is_org_admin`, `is_show_org_admin`,
`is_show_org_member`, `is_own_comedian_profile`, `is_own_performance`) are
`SECURITY DEFINER` with a pinned `search_path` so they can check the
underlying table without RLS-recursing back through the caller's own
policy, and can't be hijacked by a hostile search path. This isn't
decorative — `0011`/`0012` exist because two variants of this actually
broke in testing:

1. `comedian_profiles` and `check_ins` each had a SELECT policy
   subquerying the other table directly (not through a security-definer
   function), which Postgres rejects outright as infinite recursion
   (42P17) — and it surfaces on UPDATE too, not just SELECT, per the next
   point.
2. Postgres requires a row to be visible via *some* SELECT policy before
   an UPDATE/DELETE can touch it, in addition to satisfying the
   UPDATE/DELETE policy's own USING clause. `comedian_profiles` had an
   UPDATE policy for self-claiming an unclaimed row, but no SELECT policy
   making that unclaimed row visible in the first place — so the claim
   silently updated zero rows for anyone without SELECT access via some
   unrelated path (like already being an org admin, which is exactly what
   made this look like it worked during initial testing).

## Mux architecture (Phase 2)

Built on the `@mux/mux-node` server SDK (v14) plus `@mux/mux-uploader-react`
and `@mux/mux-player-react` for the two client-side UI pieces. Everything
that talks to Mux with real credentials lives in `lib/mux/` and is
`server-only`.

`video_assets` and `performances` model this end to end:

- A performance can have zero, one, or many video assets
  (`asset_type`: `full_set`, `private_preview`, `social_clip`,
  `clean_clip`, `promo_clip`) — never assume one performance = one file.
  Only `full_set` and `private_preview` are ever offered for private
  playback on `/dashboard/sets/[id]`.
- `playback_policy` is always `signed` — private footage never uses a
  public Mux playback ID.
- `asset_status` (`waiting_for_upload` → `preparing` → `ready` /
  `errored`) models Mux's asynchronous processing — the private player
  page checks this and shows a "not ready yet" state rather than assuming
  a newly created asset is immediately playable.

**Admin upload flow** (`/admin/shows/[showId]` → "Create performance" →
`/admin/performances/[id]`):

1. Admin picks a video type and clicks "Upload Set". The server action
   `createDirectUpload` (`app/admin/performances/actions.ts`) creates a
   Mux Direct Upload (`playback_policies: ["signed"]`) and inserts a
   `video_assets` row (`waiting_for_upload`, `mux_upload_id` set).
2. The browser gets back only the upload URL and hands it to
   `<MuxUploader endpoint={uploadUrl} />` — the video file goes straight
   from the browser to Mux, never through this server.
3. Mux processes the asset asynchronously and calls `/api/webhooks/mux`.

**Webhook** (`app/api/webhooks/mux/route.ts`): verifies the signature via
`mux.webhooks.unwrap()` before trusting anything in the payload — an
unverified request is rejected outright, never partially trusted. Handles:
- `video.upload.asset_created` → links `mux_asset_id` to the row found by
  `mux_upload_id`, status → `preparing`.
- `video.asset.ready` → status → `ready`, stores the signed playback ID,
  duration, aspect ratio; if the asset is a `full_set`, also flips the
  parent `performances.status` to `ready`.
- `video.asset.errored` → status → `errored`.

All three update an existing row by a Mux-issued id rather than inserting,
so redelivering the same event is naturally idempotent.

**Private playback** (`/dashboard/sets/[performanceId]`, backed by
`lib/mux/get-performance-playback.ts` and
`/api/performances/[performanceId]/playback`): the RLS-respecting server
client re-confirms the performance belongs to the signed-in comedian
(returns nothing otherwise — the page 404s rather than leaking whether the
id exists), picks the most recent ready `full_set`/`private_preview`
asset, and only then calls `lib/mux/sign-playback-token.ts` to mint a
signed JWT (default 6h expiration) via `mux.jwt.signPlaybackId()`. The
page renders `<MuxPlayer playbackId tokens={{ playback: token }} />`
directly — the signing private key never reaches the browser. The API
route exists as the same logic behind a fetchable endpoint (for a future
client-side token refresh), but the page itself calls the shared function
directly rather than round-tripping through its own API.

QR codes (already implemented for check-in) only ever encode a
`/check-in` URL — they never carry a Mux token.

## Mux setup (Phase 2)

You'll need your own Mux account — create one at
[mux.com](https://www.mux.com), then:

1. **API access token**: Mux dashboard → Settings → API Access Tokens →
   create one with Mux Video read/write permissions. Copy the Token ID and
   Token Secret into `MUX_TOKEN_ID` / `MUX_TOKEN_SECRET`.
2. **Signing key** (for private/signed playback): Mux dashboard →
   Settings → Signing Keys → create one. This gives you a Signing Key ID
   and downloads a private key file. Set `MUX_SIGNING_KEY_ID` to the key
   ID, and `MUX_SIGNING_PRIVATE_KEY` to the private key's contents
   (base64, as downloaded — paste it as one value, preserving the
   `\n`-containing structure if your env var loader needs it escaped).
3. **Webhook**: Mux dashboard → Settings → Webhooks → add an endpoint
   pointing at `https://<your-domain>/api/webhooks/mux`. Copy the signing
   secret it gives you into `MUX_WEBHOOK_SECRET`. This has to be a real
   reachable URL — it won't work against `localhost` unless you tunnel it
   (e.g. `ngrok http 3000` and use the tunnel URL while testing locally).
4. Add all five vars to `.env.local` (and to Vercel's environment
   variables for production — see `.env.example` for the exact names).

All five are server-only; none are ever prefixed `NEXT_PUBLIC_`.

## Deployment

- Any Next.js host (Vercel, etc.) works. Set the environment variables
  from `.env.example` in the host's dashboard — never commit `.env.local`.
- Point Supabase Auth's redirect URL allow-list at your production origin.
- Run migrations against the production Supabase project before first
  deploy.

## Verification commands

```bash
npm run lint
npm run typecheck
npm run build
```

## Known limitations (Phase 1)

- Any authenticated user can create an organization and become its admin
  from `/admin` — there's no invite/approval flow yet, and no UI to add a
  second admin to an existing org (the RLS policy supports it; the UI
  doesn't yet).
- No edit/delete UI for organizations, clubs, or shows — create-only.
- The permanent, club-level QR code described in the product spec (no
  `?show=` param, auto-selecting a current/upcoming show) isn't built —
  only the show-specific `/check-in?show=<id>` flow is. Visiting
  `/check-in` with no `show` param shows an instructional message instead.
- No date/status gating on check-in — a comedian can check in for a show
  regardless of `status` or `show_date`.
- Check-in now expects the comedian to check their email for a code right
  there at the venue to reach their dashboard immediately. Their check-in
  and consent are saved either way, but there's no "skip for now" — if
  they can't access email in the moment, they simply won't land on a
  dashboard from that page. They can still sign in later via `/login`
  with the same email; `claimComedianProfileIfNeeded` runs there too, so
  the link still gets made.
- `lib/database.types.ts` is hand-maintained to match
  `supabase/migrations/*.sql`. Regenerate it with
  `supabase gen types typescript` once the Supabase CLI is wired into this
  project's tooling, to avoid drift.
- No automated tests yet.

## Known limitations (Phase 2)

- No way to reorder/schedule performances, edit a performance's details,
  or delete a video asset from the UI — create/upload only.
- No standalone "all performances" admin index — a performance is only
  reachable via its show's check-in list (`/admin/shows/[id]` → "View
  performance"). Fine for now since that's also how they're created, but
  won't scale to browsing performances across shows.
- The signed playback token (6h expiration) isn't refreshed client-side if
  a viewing session outlives it; the comedian would need to reload the
  page. The `/api/performances/[id]/playback` endpoint exists to support
  adding that later.
- No admin UI surfaces `errored` asset status prominently yet beyond the
  badge on the performance detail page — no retry-upload action.
- Webhook signature verification requires `MUX_WEBHOOK_SECRET` to be set
  correctly for the *same* Mux webhook endpoint you're testing against;
  mismatched secrets fail closed (request rejected), which is correct
  behavior but can look like "nothing is happening" if misconfigured —
  check Mux's dashboard webhook delivery log if updates aren't landing.
- Thumbnails aren't rendered anywhere yet (admin or comedian view) — Mux
  generates them, but since assets are signed, displaying them needs a
  signed thumbnail token too, which isn't wired up.
