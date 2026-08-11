# TheCrib — Phase 1

A mobile-first web app for comedy clubs: comedians check in via QR code, set
independent recording / private-access / promotional consent, and later
privately access their recorded sets.

Phase 1 is the foundation only: Next.js + Supabase data model, auth, RLS,
check-in flow, and admin/comedian dashboards. **No Mux integration, no
Stripe, no email automation** — those are later phases.

## Stack

- Next.js 15 (App Router) + TypeScript + Tailwind CSS
- Supabase (Postgres, Auth, Row Level Security)
- Mux (Phase 2 — video ingestion/streaming/signed playback; schema is ready, no code wired up yet)

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

## Mux architecture (Phase 2 — not implemented yet)

`video_assets` and `performances` already model what Phase 2 needs:

- A performance can have zero, one, or many video assets
  (`asset_type`: `full_set`, `private_preview`, `social_clip`,
  `clean_clip`, `promo_clip`) — never assume one performance = one file.
- `playback_policy` defaults to `signed`; private footage must never use a
  public Mux playback ID.
- `asset_status` (`waiting_for_upload` → `uploading` → `preparing` →
  `ready` / `errored` / `deleted`) models Mux's asynchronous processing —
  the app must never assume a newly created asset is immediately playable.

Planned flow, once approved:

1. Admin opens a performance, chooses "Upload Set". The server creates a
   Mux Direct Upload URL; the browser uploads straight to Mux (the video
   never passes through the Next.js server).
2. Mux processes the asset asynchronously and calls
   `/api/webhooks/mux`, which verifies the Mux webhook signature and
   updates `video_assets`/`performances` idempotently (keyed on Mux's IDs,
   so redelivery can't create duplicate rows).
3. Playback: `/api/performances/[performanceId]/playback` authenticates
   the Supabase user, confirms they own the comedian profile the
   performance belongs to, confirms the asset is `ready`, then mints a
   short-lived signed Mux playback JWT server-side
   (`lib/mux/sign-playback-token.ts`) and returns only what Mux Player
   needs. The signing private key never leaves the server.

QR codes (already implemented for check-in) only ever encode a
`/check-in` URL — they will never carry a Mux token.

## Mux credentials (Phase 2)

Placeholders are in `.env.example`. All are server-only:

- `MUX_TOKEN_ID` / `MUX_TOKEN_SECRET` — API access for creating uploads/assets.
- `MUX_SIGNING_KEY_ID` / `MUX_SIGNING_PRIVATE_KEY` — for signing private
  playback JWTs. Generate a signing key in the Mux dashboard.
- `MUX_WEBHOOK_SECRET` — for verifying `/api/webhooks/mux` payloads.

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
