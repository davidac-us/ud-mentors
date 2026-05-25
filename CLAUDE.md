# UD Mentors — CLAUDE.md

## What the app is

**UD Mentors** is a mentor-matching platform for first-year international students at the University of Delaware. Mentees browse and request up to 3 confirmed mentors. Mentors approve or decline incoming requests and set their own mentee capacity (1–5). The app also includes real-time 1:1 chats between matched pairs, community chat rooms (global, per-language, and custom groups), an events/clubs board, and an editable profile page.

Target users: international undergrad/grad students at UD. Mentors are experienced students who have already navigated UD life. Mentees are first-year internationals who need guidance.

---

## Last session summary (2026-05-24)

All changes are committed and pushed to `main`.

### Completed this session
- ✅ **Community tab — language rooms**: removed ≥2 users gate; filter out English (Global Chat covers it); language rooms now appear for single users.
- ✅ **Community tab — auto-join on onboarding**: `markOnboarded(languages, interests)` now patches full profile state synchronously so the Community tab sees the correct languages immediately without a page refresh.
- ✅ **Optimistic UI in Chats & Community**: messages appear instantly with `temp-${Date.now()}` IDs; Realtime event deduplicates by matching `sender_id + content`.
- ✅ **Auto-scroll to latest message** in both Chats and Community via `useRef` + `useEffect`.
- ✅ **Infinite spinner fix**: `fetchProfileForUser()` now has an 8-second `Promise.race` timeout; `app.tsx` shows a "Retry" button instead of spinning forever if the profile fails to load.
- ✅ **Events tab — major rewrite**:
  - Room field (alongside Location) for both events and clubs
  - Club-only: Meeting Days (pill multi-select Mon–Sun), Meeting Time, Recurrence (Weekly / Biweekly / Monthly)
  - Club-only: Start Date (reuses `date` column, labeled "Start Date")
  - Search bar filters by title + description
  - "Your Postings" panel with Edit / Delete per post
  - Tapping any card opens a full-screen `DetailView` overlay (← Close, Edit, Delete for owner; Posted by with avatar)
  - RLS policies added: poster can UPDATE and DELETE their own events
- ✅ **Club → Community group chat**:
  - Creating a club inserts a `community_rooms` row (`type='group'`) named after the club and links it via `events.community_room_id`
  - Creator is auto-added to `community_room_members` → chat appears immediately in their Community tab
  - Club `DetailView` shows Join Club / Leave Club button for other users; tapping join adds them to the room

### Pending action (user must do before testing club chat)
Run this in Supabase SQL Editor → New Query:
```sql
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS community_room_id uuid
    REFERENCES public.community_rooms(id) ON DELETE SET NULL;
```
(File: `supabase/migrations/20260524000002_event_community_room.sql`)

### Migration status
| File | Status |
|---|---|
| `20260523000000_fresh_schema.sql` | ✅ Run |
| `20260524000000_add_event_club_fields.sql` | ✅ Run |
| `20260524000001_event_rls_edit_delete.sql` | ✅ Run |
| `20260524000002_event_community_room.sql` | ⚠️ **NOT YET RUN** |

---

## Tech stack

| Layer | Tool |
|---|---|
| Framework | TanStack Start (file-based routing, SSR) |
| UI library | React 19 |
| Language | TypeScript |
| Styling | Tailwind CSS v4 + shadcn/ui |
| Backend / DB | Supabase (Postgres + Auth + Realtime) |
| Deployment target | Cloudflare Workers |
| Build tool | Vite via `@lovable.dev/vite-tanstack-config` |
| Package manager | Bun |
| Icons | Lucide React |
| Toasts | Sonner |

**Do not replace `vite.config.ts`.** The `@lovable.dev/vite-tanstack-config` wrapper bundles TanStack Start, Vite, Tailwind v4, tsconfig path aliases, and Cloudflare adapter together. Rewriting it manually will break the build.

---

## Running locally

```bash
bun install
bun dev
```

App runs at **http://localhost:8080**

Env vars needed in `.env` (never commit this file):
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key
```

---

## Design system

### Colors (defined in `src/styles.css` as CSS custom properties)

| Token | Value | Usage |
|---|---|---|
| `--background` | `#fdf6ee` | Warm cream page background |
| `--primary` | `#e8614a` | Coral/salmon — buttons, active states, avatar bg |
| `--secondary` | `#2a9d8f` | Teal — community accents |
| `--foreground` | Dark navy | Body text |
| `--card` | White-ish | Card surfaces |
| `--muted-foreground` | Gray | Secondary text, placeholders |

Tailwind v4 uses CSS custom properties, **not** HSL utility classes. Reference tokens as `bg-primary`, `text-primary`, etc. — they resolve via `var(--primary)` under the hood. Check `src/styles.css` for the full token list.

### Layout

- Max width **480px**, centered — mobile-width even on desktop
- All main content has `px-5 pb-6 pt-6` padding, plus `pb-20` on the app shell to clear the fixed bottom nav
- Cards: `rounded-2xl bg-card shadow-[var(--shadow-soft)]`
- Buttons: `rounded-full` (pill shape)
- Avatars: initials-only (no image uploads yet), colored background derived from name

### Navigation

Fixed bottom nav with 5 tabs: Discover, Chats, Community, Events, Profile.
On Discover, mentors see the label "Requests" instead.
Safe-area padding (`env(safe-area-inset-bottom)`) is handled in `BottomNav.tsx`.

---

## Matching algorithm

Implemented client-side in `src/routes/app.discover.tsx` as `compatScore(me, other)`:

```
Score = 0
+ 40  if same major
+ 30  if same country
+ 20  for each shared language
+ 10  for each shared interest
```

**Equity weight** (added on top, mentee feed only — balances new mentors against popular ones):

```
+ 60  if mentor has 0 confirmed matches
+ 30  if mentor has 1 confirmed match
+ 10  if mentor has 2 confirmed matches
+  0  if mentor has 3+ confirmed matches
```

Mentors are sorted descending by `compatScore + equityWeight`. Mentors the mentee has already matched with (any status) are excluded from the feed entirely. The skip button (X) only hides a card locally for the current session — it does not write to the DB.

Match lifecycle: `pending` → `matched` or `declined`. Declined matches set `cooldown_until = now + 30 days`. Matches expire after 14 days (`expires_at` column), though expiry is not yet enforced in the UI.

---

## Key files

```
src/
  lib/
    auth.tsx                   Auth context — AuthProvider, useAuth(), ProfileWithDetails type.
                               Exposes: session, user, profile, loading, signOut,
                               refreshProfile, markOnboarded.
                               markOnboarded(languages?, interests?) synchronously patches
                               local state — use this instead of refreshProfile() before
                               navigating away from onboarding. Includes 8s timeout on
                               fetchProfileForUser() via Promise.race.

  integrations/supabase/
    client.ts                  Supabase JS client (lazy singleton via Proxy).
    types.ts                   Full TypeScript DB types — Tables<T>, TablesInsert<T>,
                               TablesUpdate<T>, and domain aliases (Profile, Match, etc.)
    auth-middleware.ts         Server-side auth helper (uses getUser, not getClaims).

  routes/
    __root.tsx                 Root layout — injects AuthProvider, Toaster, head meta,
                               Google Fonts (Noto Color Emoji for flag rendering).
    index.tsx                  Landing page — flag grid, CTA buttons, auth redirect.
    signup.tsx                 Signup — .edu email validation, Supabase signUp call.
    login.tsx                  Login — checks onboarded flag, routes to onboarding or app.
                               Has 15s timeout with extension-blocking message.
    onboarding.tsx             7-step onboarding flow. Writes profiles + junction tables.
                               Calls markOnboarded(languages, interests) before navigating.
    app.tsx                    Protected shell — auth guard, max-w-[480px] layout, BottomNav.
                               Three separate render paths: loading spinner | !session (null,
                               useEffect redirects) | !profile (retry button) | content.
    app.index.tsx              Redirects /app/ → /app/discover via beforeLoad.
    app.discover.tsx           Discover tab (mentee swipe feed / mentor request queue).
                               ALSO exports shared UI: Header, EmptyState, Avatar, Loader.
                               Other tab files import from here — do not delete this file.
    app.chats.tsx              Chats tab — lists matched pairs, inline ChatView with
                               Supabase Realtime subscription. Optimistic UI + auto-scroll.
    app.community.tsx          Community tab — global chat, language rooms (all non-English
                               languages from onboarding; no ≥2 user gate), group chats.
                               Inline RoomChat with Realtime subscription.
                               Optimistic UI + auto-scroll. Language rooms auto-joined
                               at onboarding via community_room_members insert.
    app.events.tsx             Events & Clubs tab. Features:
                               - Event/Club toggle + search bar
                               - EventCard → tapping opens DetailView full-screen overlay
                               - DetailView: date/schedule/location/room, description,
                                 Posted by (avatar + name), Edit/Delete for owner,
                                 Join Club / Leave Club button for clubs (updates
                                 community_room_members live)
                               - PostForm dialog: title, description, location+room,
                                 date/time (events) or start date (clubs),
                                 club-only: meeting days pills, time, recurrence pills
                               - "Your Postings" panel with edit/delete
                               - post(): clubs create community_rooms entry + link via
                                 community_room_id + auto-join creator to room
    app.profile.tsx            Profile tab — editable fields, save to Supabase, sign-out.

  components/
    BottomNav.tsx              Fixed bottom navigation, 5 tabs, safe-area padding.

  styles.css                   Tailwind v4 config + all design tokens as CSS custom props.

supabase/
  migrations/
    20260523000000_fresh_schema.sql          Full DB schema (run ✅)
    20260524000000_add_event_club_fields.sql room, meeting_days, meeting_time, recurrence
                                             columns on events (run ✅)
    20260524000001_event_rls_edit_delete.sql poster UPDATE + DELETE RLS policies (run ✅)
    20260524000002_event_community_room.sql  community_room_id FK on events (⚠️ NOT RUN)
```

---

## Current build status

### Complete
- [x] Database schema (`supabase/migrations/`) with RLS and auto-profile trigger
- [x] Auth flow — signup (.edu), email confirmation, login, protected routes
- [x] 7-step onboarding (role, profile info, languages, interests, prompts, mentor capacity)
- [x] Discover tab — compatibility feed for mentees, request queue for mentors
- [x] Chats tab — real-time 1:1 messaging, optimistic UI, auto-scroll
- [x] Community tab — global chat, language rooms (non-English, no user count gate), group chats, optimistic UI, auto-scroll
- [x] Events tab — events/clubs feed, search, expandable detail view, "Posted by", edit/delete own posts
- [x] Clubs — room + meeting schedule + recurrence + start date fields
- [x] Club → Community group chat: creating a club auto-creates a group room; Join/Leave from club detail
- [x] Profile tab — editable profile, language/interest management, sign-out
- [x] Bottom nav with role-aware labels
- [x] Flag emoji rendering fix (Noto Color Emoji font via Google Fonts)
- [x] Infinite spinner fix (8s timeout + retry button)
- [x] Onboarding redirect race condition fix (`markOnboarded` with languages + interests)

### Still needs to be built
- [ ] **Run migration** — `20260524000002_event_community_room.sql` in Supabase SQL editor (adds `community_room_id` to events)
- [ ] Mentee cap enforcement — UI doesn't yet prevent a mentee from requesting more than 3 mentors
- [ ] Match expiry enforcement — `expires_at` exists in DB but is not checked in the UI
- [ ] Unread message badges on the bottom nav
- [ ] Avatar / profile photo uploads (currently initials-only)
- [ ] Push notifications for new messages
- [ ] Admin / moderation tooling
- [ ] Production deployment to Cloudflare Workers

---

## Debugging tips

**Routes not found after adding a new file**
TanStack Start auto-generates `src/routeTree.gen.ts` on dev server start. If a new `src/routes/*.tsx` file isn't being picked up, restart `bun dev` to regenerate the route tree.

**Supabase queries returning null or empty arrays**
Almost always an RLS policy issue. Check the Supabase dashboard → Table Editor → RLS. The user must be authenticated; most policies check `auth.uid()`. Use the SQL editor to run queries as a specific user for debugging.

**Auth loading state**
`useAuth()` returns `loading: true` while the session is being fetched from Supabase. Always guard on `loading` before reading `user` or `profile`, or you'll get a flash redirect to `/login`.

**Shared UI components**
`Header`, `EmptyState`, `Avatar`, and `Loader` are exported from `app.discover.tsx` and imported by the other tab files. Don't extract or delete that file without updating all the imports.

**Tailwind v4 tokens**
Tailwind v4 doesn't use `hsl(var(--color))` like v3 shadcn setups. Tokens are plain CSS custom properties in `src/styles.css`. If a color looks wrong, check the token there — don't look for HSL values.

**Env vars not available client-side**
All client-side env vars must be prefixed `VITE_`. Anything without that prefix is server-only.

**Supabase Realtime cleanup**
Every `supabase.channel(name).subscribe()` call in a `useEffect` must be cleaned up with `supabase.removeChannel(channel)` in the effect's return function. Missing cleanup causes duplicate subscriptions and stale message handlers after navigation.

**Flag emojis showing as "BR", "CN" on Windows**
This is a Windows font issue — Regional Indicator Symbol pairs need a color emoji font. The fix is already applied: Noto Color Emoji is loaded from Google Fonts in `__root.tsx`, and the flag spans in `index.tsx` have an explicit `fontFamily` style. If they regress, check the Network tab to confirm the Google Fonts request is succeeding.

**`markOnboarded` vs `refreshProfile`**
After onboarding saves to the DB, call `markOnboarded(languages, interests)` (synchronous local state patch) before navigating to `/app/discover`. Do **not** use `await refreshProfile()` there — it triggers an async `setProfile` that races with `app.tsx`'s `useEffect` guard, causing an immediate redirect back to `/onboarding`.

**AdGuard / ad blocker blocks Supabase**
AdGuard and similar extensions silently drop all requests to `*.supabase.co` in regular Chrome. This manifests as: Network tab shows no requests, spinner never resolves, login times out. Always test in incognito Chrome (extensions disabled by default). Do not waste time debugging "Supabase issues" before confirming requests are actually reaching the network.

**Optimistic UI pattern (Chats + Community)**
Messages are added immediately with ID `temp-${Date.now()}` before the DB insert. The Realtime handler deduplicates by checking if any existing message matches `sender_id + content` — if so, it replaces the temp entry rather than adding a duplicate.
