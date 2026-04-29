## MentorMatch — International Student Mentor App

A demo-first MVP for an entrepreneurship class. Every tab is visible and clickable; core flows (signup, swipe, match, DM) are fully functional, with events and group chat lightly functional but real.

### Tech foundation
- Lovable Cloud (auth + database + realtime)
- Email/password auth restricted to `.edu` addresses (validated client + server side)
- Tailwind + shadcn/ui, mobile-first layout (this is a phone-style app)

---

### 1. Onboarding & Welcome
- Landing screen with app name, tagline, "Sign up" / "Log in" buttons
- Signup flow (multi-step):
  1. Email (.edu only) + password
  2. Role: **First-year international student** or **Experienced mentor**
  3. Demographics: name, home country, university, year, major, languages spoken
  4. Interests/hobbies (chips: e.g. cooking, hiking, gaming, music…)
  5. Prompt answers (3 short prompts, e.g. "A fun fact about me…", "Best advice I got…", "I'm looking for a mentor who…")
  6. Profile photo upload (optional, with default avatar)
- Profile auto-created on signup via DB trigger

### 2. Discover (Swipe screen) — first-years only
- Bumble-style stack of mentor cards: photo, name, country, year, major, interests, prompts
- Swipe right / tap heart = send mentor request
- Swipe left / tap X = pass
- Empty state when no more mentors
- Mentors see this tab replaced with **"Requests"** — incoming mentee requests with Accept / Decline. On Accept, a match + chat thread is created.

### 3. Chats tab (matched mentors/mentees)
- List of matched conversations
- 1:1 realtime chat thread (text only for MVP)
- Header shows the other person's name + role badge

### 4. Community tab
- **Global chat**: single room where any signed-in international student can post
- **Group chats**: list of user-created groups; "+ New group" lets user name a group, invite others by search, and chat in realtime
- All powered by the same messages table, scoped by thread type

### 5. Events tab
- List of campus events & international clubs (cards with title, date, location, description, posted by)
- Any user can post a new event/club via a "+ Post event" button (form modal)
- Filter toggle: Events | Clubs

### 6. Profile tab
- View & edit own profile (demographics, interests, prompts, photo)
- Toggle role visibility for mentors (pause being discoverable)
- Log out

---

### Navigation
Bottom tab bar (mobile-first): **Discover/Requests · Chats · Community · Events · Profile**

### Data model (high level)
- `profiles` (linked to auth user, role, demographics, interests, prompts, photo)
- `swipes` (mentee → mentor, direction)
- `matches` (created when mentor accepts)
- `threads` (1:1, group, or global) + `thread_members` + `messages`
- `events` (title, kind: event/club, date, location, description, created_by)
- `user_roles` table (separate, for first_year / mentor / admin) — used for RLS, never stored on profiles

All tables protected with RLS so users can only read/write their own data and content in threads they belong to.

### Demo polish
- Seed ~8 sample mentor profiles + a few events so the swipe stack and events tab look alive immediately on first run
- Friendly empty states everywhere
- Clean, modern visual style (warm, welcoming — not corporate)

### Out of scope for this MVP (can add later)
- Push notifications, video/voice chat, image messages, event RSVPs, university verification beyond `.edu` regex, admin moderation tools, reporting/blocking

After approval I'll enable Lovable Cloud, set up auth + tables + RLS, seed demo data, and build all five tabs.