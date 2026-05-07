# ChavrutaMatch — Build Plan

A web app that matches Jewish learners ("chavrutas") with study partners based on shared interests, mutual availability, and shared region. London-only at launch, designed to expand region by region.

This document is the source of truth for the build. It is opinionated; deviations should be deliberate.

------

## 1. Product overview

A user signs up, creates one or more **tentacles** — each tentacle represents a specific learning interest (subject + availability). The system finds other tentacles in the same region with the same subject and overlapping availability, ranked by overlap. Users can request to **connect**; once both sides accept, a TalkJS chat opens between them.

**Core constraints:**

- Region-gated: only users physically in supported regions can sign up. London is the only supported region at launch.
- Mutual matching: subject must match, availability must overlap, region must match.
- Connection-gated messaging: no DMs without an accepted connection.

------

## 2. Tech stack

| Layer           | Choice                          | Notes                                                        |
| --------------- | ------------------------------- | ------------------------------------------------------------ |
| Framework       | Next.js                         |                                                              |
| Runtime         | Node.js 20+                     |                                                              |
| Database        | Postgres 16 + PostGIS extension | Required for geographic boundary checks                      |
| ORM             | Drizzle                         | Lightweight, good Postgres bitstring + PostGIS support via `sql` template |
| Auth            | Auth.js (NextAuth v5)           | Email magic link + Google OAuth                              |
| Messaging       | TalkJS                          | React SDK, server-side user signing                          |
| UI              | shadcn/ui + Tailwind            | Mobile-first, dark mode supported                            |
| Toasts          | `sonner` (shadcn default)       | Used for every async action result                           |
| Forms           | `react-hook-form` + `zod`       | shadcn form patterns                                         |
| IP geolocation  | MaxMind GeoLite2-Country        | Free, self-hosted DB file                                    |
| Postcode lookup | postcodes.io                    | Free, no API key required                                    |
| Hosting         | Vercel + Neon for Postgres      | Neon supports PostGIS                                        |

------

## 3. Data model

Full schema. Use Drizzle migrations. Enable PostGIS first: `create extension if not exists postgis;`

### `regions`

```sql
create table regions (
  id            serial primary key,
  slug          text unique not null,                -- 'london'
  name          text not null,                       -- 'London'
  timezone      text not null,                       -- 'Europe/London'
  country_code  text not null,                       -- 'GB'
  boundary      geometry(MultiPolygon, 4326) not null,
  active        boolean not null default true,       -- can users sign up here?
  created_at    timestamptz not null default now()
);

create index regions_country_idx on regions(country_code) where active = true;
```

Seed London using the Greater London administrative boundary (33 boroughs) from the UK ONS Open Geography Portal, loaded as GeoJSON via `ST_GeomFromGeoJSON()`.

### `users`

```sql
create table users (
  id                uuid primary key default gen_random_uuid(),
  email             text unique not null,
  name              text not null,
  bio								text,
  image_url         text,
  region_id         integer not null references regions(id),
  postcode          text not null,                   -- 'SW1A 1AA' (formatted)
  postcode_coords   geometry(Point, 4326) not null,
  email_verified    timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index users_region_idx on users(region_id);
```

Plus the standard Auth.js tables (`accounts`, `sessions`, `verification_tokens`) — use the Drizzle adapter which generates these.

### `tentacles`

```sql
create type subject_enum as enum (
  'chumash', 'tanach', 'mishna', 'gemora',
  'daf_yomi', 'chassidus', 'halacha', 'dirshu'
);

create type medium_enum as enum (
  'in-person', 'phone-call', 'video-call', 'flexible'
);

create table tentacles (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references users(id) on delete cascade,
  region_id           integer not null references regions(id),  -- denormalized from user

  subject             subject_enum not null,
  availability_local  bit(336) not null,    -- what the user painted (their TZ)
  availability_utc    bit(336) not null,    -- converted for matching
  medium							medium_enum,
  notes               text,                 -- "I'm a beginner", "prefer in-person", etc.
  active              boolean not null default true,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index tentacles_match_idx on tentacles(region_id, subject, active);
create index tentacles_user_idx on tentacles(user_id);
```

The `region_id` is denormalized from the user for index performance. Keep them in sync via a trigger or in the application layer when a user changes region.

### `connections`

```sql
create type connection_status as enum ('pending', 'accepted', 'declined', 'blocked', 'cancelled');

create table connections (
  id                      uuid primary key default gen_random_uuid(),
  initiator_id            uuid not null references users(id) on delete cascade,
  recipient_id            uuid not null references users(id) on delete cascade,
  initiator_tentacle_id   uuid references tentacles(id) on delete set null,
  recipient_tentacle_id   uuid references tentacles(id) on delete set null,
  status                  connection_status not null default 'pending',
  message                 text,                 -- optional intro message
  talkjs_conversation_id  text,                 -- set when accepted
  created_at              timestamptz not null default now(),
  responded_at            timestamptz,
  check (initiator_id <> recipient_id)
);

-- Prevent duplicate connections between the same pair (in either direction)
create unique index connections_pair_idx on connections (
  least(initiator_id, recipient_id),
  greatest(initiator_id, recipient_id)
) where status in ('pending', 'accepted');

create index connections_recipient_idx on connections(recipient_id, status);
create index connections_initiator_idx on connections(initiator_id, status);
```

The partial unique index lets a declined connection be re-attempted later but prevents two simultaneous pending requests between the same pair.

### `waitlist`

For users in unsupported regions:

```sql
create table waitlist (
  id                uuid primary key default gen_random_uuid(),
  email             text not null,
  detected_country  text,
  detected_city     text,
  requested_region  text,                  -- free text from the user
  created_at        timestamptz not null default now()
);

create index waitlist_email_idx on waitlist(email);
```

------

## 4. Region detection and signup gating

Two layers, both required.

### Layer 1 — IP country check (gate)

On the signup page (server-side, never the client):

1. Resolve client IP from `x-forwarded-for` (trust only the first hop on Vercel).
2. Look up country with MaxMind GeoLite2-Country DB (loaded once at module level, cached in memory).
3. If country is not in the active regions' country list (just `'GB'` at launch), render the **waitlist page** instead of signup. Capture email + detected country into `waitlist`.

This is a **soft gate**: it filters out the obvious non-UK signups but doesn't try to be precise about city.

### Layer 2 — Postcode validation (source of truth)

On the signup form, after auth provider returns:

1. User enters their UK postcode.

2. Validate format with regex: `^[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$/i` (then normalize to uppercase with single space).

3. POST to `https://api.postcodes.io/postcodes/{postcode}` to get `{ longitude, latitude }`. Handle 404 (invalid postcode) with a clear toast.

4. Run the polygon check in Postgres:

   ```sql
   select id from regionswhere active = true  and ST_Contains(boundary, ST_SetSRID(ST_MakePoint($lng, $lat), 4326))limit 1;
   ```

5. If a region is returned, store the user with that `region_id` and the point geometry. If not, show the waitlist option.

The postcode coordinates are the source of truth for region. IP is just the first-pass filter.

### Edge cases to handle

- VPN users with valid London postcode: country check fails but postcode passes. **Resolution:** allow override — show "your IP suggests you're outside the UK, but if you live in London, enter your postcode below." Postcode wins.
- Travelers with London postcode signing up from abroad: same path as above.
- Users near London but not in Greater London (e.g. Watford, Croydon outer): they will be blocked by the polygon. Acceptable for v1; expand the polygon later if you launch a "Greater London + commuter belt" tier.
- Postcode service down: show a toast, allow retry, do not let the user proceed without verification.

------

## 5. Availability model

**336-bit weekly bitmap of 30-minute slots.** 7 days × 48 slots = 336 bits per tentacle.

### Bit ordering

- Bit 0 = Sunday 00:00–00:30
- Bit 1 = Sunday 00:30–01:00
- ...
- Bit 47 = Sunday 23:30–00:00 (Mon)
- Bit 48 = Monday 00:00–00:30
- ...
- Bit 335 = Saturday 23:30–00:00 (Sun)

Document this constant somewhere central (`lib/availability.ts`) and never deviate.

### Two columns: `availability_local` and `availability_utc`

- `availability_local`: what the user painted in the UI, in their region's timezone. This is what we display back to them and let them edit.
- `availability_utc`: the same slots converted to UTC. **This is what matching queries use.**

Convert on save. Recompute on DST transitions via a scheduled job (twice yearly, or simpler: a daily cron that re-computes any stale rows). For London-only v1, both timezones are `Europe/London` so DST conversion logic is straightforward but still required.

### UI

Mobile-first 7×48 grid. On mobile: vertical scroll, days as columns, hours as rows. Tap to toggle, drag to paint. Use shadcn primitives + custom touch handlers. Show "X hours selected" running total. Provide quick presets ("Weekday evenings", "Sunday mornings", "Clear all").

------

## 6. Matching

```sql
create extension if not exists cube;
create extension if not exists earthdistance;
```

Note that `earth_distance` returns **meters**, so I've adjusted the decay constant accordingly (10000 m = 10 km).

### Full query

```sql
with candidates as (
  select
    t2.id,
    t2.user_id,
    t2.notes,
    t2.lat,
    t2.lon,
    u.name,
    u.image_url,
    bit_count(t2.availability_utc & $4::bit(336))            as exact_slots,
    bit_count(t2.availability_utc & ($4::bit(336) << 1)) +
    bit_count(t2.availability_utc & ($4::bit(336) >> 1))    as near_slots,
    earth_distance(
      ll_to_earth(t2.lat, t2.lon),
      ll_to_earth($5, $6)
    ) as distance_m
  from tentacles t2
  join users u on u.id = t2.user_id
  where t2.region_id = $1
    and t2.subject   = $2
    and t2.active    = true
    and t2.user_id  <> $3
    and (
      (t2.availability_utc & $4::bit(336))         <> 0::bit(336) or
      (t2.availability_utc & ($4::bit(336) << 1))  <> 0::bit(336) or
      (t2.availability_utc & ($4::bit(336) >> 1))  <> 0::bit(336)
    )
    and not exists (
      select 1 from connections c
      where status in ('accepted', 'blocked')
        and (
          (c.initiator_id = $3 and c.recipient_id = t2.user_id) or
          (c.recipient_id = $3 and c.initiator_id = t2.user_id)
        )
    )
)
select
  id,
  user_id,
  notes,
  name,
  image_url,
  exact_slots,
  near_slots,
  distance_m / 1000.0 as distance_km,
  (2 * exact_slots + near_slots) + 4 * exp(-distance_m / 10000.0) as score
from candidates
order by score desc, exact_slots desc, distance_m asc
limit 20;
```

### Parameters

- `$1` — `t1.region_id`
- `$2` — `t1.subject`
- `$3` — `t1.user_id`
- `$4` — `t1.availability_utc` (bit(336))
- `$5` — requesting user's latitude
- `$6` — requesting user's longitude

### Tunable knobs

The two numbers worth experimenting with once you have real users:

`10000.0` — proximity decay in meters. At this distance the proximity bonus is ~37% of full weight. Smaller values (5000) make proximity matter only for very close matches; larger (20000) spread the bonus out more.

`4` — proximity weight. With overlap typically 4–10 slots, weight 4 means proximity tips a near-tie but won't override a clearly better schedule fit. Bump to 6 if you want geography to matter more, drop to 2 if it's matching too many distant pairs.

### A couple of notes

If `t2.lat` or `t2.lon` can be null (users who haven't entered a postcode yet), wrap the proximity term: `coalesce(4 * exp(-distance_m / 10000.0), 0)` so they still get scored on schedule alone rather than dropped.

`earth_distance` is a function call per row, so it runs on every candidate that passes the index filter. With the `(region_id, subject, active)` index pruning to a small set first, this is fine — but if a single region ever grows to tens of thousands of active tentacles, you'd want to add a bounding-box prefilter using `earth_box` and a GiST index on `ll_to_earth(lat, lon)`. Not worth doing yet at your scale.

### Hiding already-connected users

Already covered in the query above. A user shouldn't see candidates they're already connected with, blocked by, or have a pending request with — though you may want to surface pending requests separately on the dashboard.

------

## 7. Connections flow

### States

- `pending` — initiator has sent, recipient has not responded
- `accepted` — both sides agree; TalkJS conversation created
- `declined` — recipient rejected; initiator can re-attempt later
- `cancelled` — initiator withdrew before recipient responded
- `blocked` — recipient blocked the initiator; permanent, hides both ways

### State transitions

```
[no connection] → pending (initiator sends request)
pending → accepted (recipient accepts)
pending → declined (recipient declines)
pending → cancelled (initiator withdraws)
accepted → blocked (either side blocks)
declined → pending (initiator can retry after some cooldown — say 7 days)
```

Enforce transitions in a server action; never let the client set arbitrary status.

### On accept

1. Update `connections.status = 'accepted'`, set `responded_at`.
2. Create a TalkJS conversation server-side (see §8).
3. Store `talkjs_conversation_id` on the row.
4. Notify both users (toast for whoever is online; email for the other side).

### UI surfaces

- **Dashboard**: pending requests received (highlighted), pending requests sent, accepted connections list.
- **Match card** on a tentacle's matches page: "Send connection request" button → modal with optional intro message.
- **Connection detail page**: their tentacles, your shared availability, an "Open chat" button (TalkJS), and a "Block" / "Disconnect" menu.

------

## 8. Messaging — TalkJS

TalkJS handles the chat UI and storage. We only sync users and conversations.

### Setup

1. Create a TalkJS account, get App ID and Secret Key.
2. Env vars: `NEXT_PUBLIC_TALKJS_APP_ID`, `TALKJS_SECRET_KEY` (server-only, never exposed).
3. Install: `npm i talkjs @talkjs/react`.

### User sync

When a user signs up, sync them to TalkJS via the REST API server-side:

```
PUT https://api.talkjs.com/v1/{appId}/users/{userId}
Authorization: Bearer {secretKey}

{
  "name": "...",
  "email": ["..."],
  "photoUrl": "...",
  "role": "default"
}
```

Re-sync on profile updates (name/photo change).

### Conversation creation (on connection accept)

```
PUT https://api.talkjs.com/v1/{appId}/conversations/{conversationId}
Authorization: Bearer {secretKey}

{
  "participants": { "{userIdA}": {}, "{userIdB}": {} },
  "subject": "ChavrutaMatch",
  "custom": { "connectionId": "..." }
}
```

`conversationId` should be deterministic — e.g. `Talk.oneOnOneId(userIdA, userIdB)` style, or just the `connection.id`. Store on the connection row.

### Client rendering

In a client component, mount a `<Session>` wrapping `<Chatbox>`:

```tsx
'use client';
import { Session, Chatbox } from '@talkjs/react';

export function ChatPanel({ currentUser, conversationId }: Props) {
  return (
    <Session
      appId={process.env.NEXT_PUBLIC_TALKJS_APP_ID!}
      userId={currentUser.id}
      syncUser={() => /* user object, name, email, photoUrl */}
    >
      <Chatbox
        conversationId={conversationId}
        style={{ width: '100%', height: '100%' }}
      />
    </Session>
  );
}
```

For production, enable TalkJS identity verification (HMAC-SHA256 of userId with secret) so users can't impersonate each other client-side. Compute the signature server-side and pass it to the client.

### Notifications

Configure TalkJS to send email notifications for unread messages. Optional v2: web push notifications via TalkJS's built-in push system.

**Consider `<Inbox>` instead of `<Chatbox>` for the dashboard.** `<Chatbox>` shows one conversation. `<Inbox>` shows a list of all conversations with unread counts on the left and the selected one on the right — much closer to what users expect when returning after being offline with messages from multiple chavrutas. You can keep `<Chatbox>` for embedding next to a specific match, and use `<Inbox>` on a dedicated `/messages` page.

**Unread counts elsewhere in your UI.** TalkJS's `Session` object exposes `session.unreads` which fires events when unread state changes. Useful for putting a badge on your nav like "3 new messages" so returning users know to check.

### One small addition to your spec

In your user sync payload, the `email` field is what powers the offline email fallback:

json

```json
{
  "name": "...",
  "email": ["user@example.com"],   ← required for offline notifications
  "photoUrl": "...",
  "role": "default"
}
```

It's an array because TalkJS supports multiple addresses per user. If this is missing, the user is essentially unreachable while offline. Worth noting explicitly in your spec since it's load-bearing for the "offline messaging" requirement.

------

## 9. Authentication

**Auth.js v5** with two providers:

1. **Google OAuth** — primary, lowest friction.
2. **Email magic link** — for users without Google, or who prefer email. Use Resend or Postmark for delivery.

### Flow

1. User clicks "Sign in" → Auth.js handles OAuth or sends magic link.
2. On first login, Auth.js callback runs. Check if user has a `region_id` set. If not, redirect to `/onboarding` (postcode entry).
3. `/onboarding` cannot be skipped — middleware redirects any authenticated user without `region_id` back to it.
4. After successful postcode validation, user lands on `/dashboard`.

### Country gate placement

The country gate runs on the **public marketing/signin page** before the user even authenticates. Reasoning: no point letting someone authenticate with Google if we're going to block them anyway. If they fail the country check, they see the waitlist page with email capture.

### Middleware

```ts
// middleware.ts
// - Authenticated user without region_id → redirect to /onboarding
// - Unauthenticated user on protected route → redirect to /signin
// - All visitors to /signin and /signup → run country check first
```

------

## 10. UI / UX requirements

This product must feel **delightful, modern, and fun** — not enterprise software. The user is taking a moment of their day to find a study partner; the interaction should feel inviting.

### Foundations

- **shadcn/ui** for all components. Customize the base theme; don't ship default shadcn slate.
- **Tailwind** with a custom color palette. Suggested direction: warm, intellectual, with a single accent color. Avoid generic SaaS blue.
- **Mobile-first**. Every page is designed for 375px wide first; desktop is enhancement.
- **Dark mode** supported via shadcn's theme system. Persist user preference.
- **Sonner toasts** for every async action: sign in, save tentacle, send connection request, accept connection, error states. No silent successes.
- **Empty states** are first-class, not afterthoughts. Every list has a thoughtful empty state with an action.
- **Loading states**: skeletons, not spinners, for content-loading. Use shadcn's `Skeleton`.
- **Animations**: subtle. Use Tailwind's `transition` classes and `framer-motion` for page transitions and the connection-accept moment (a small celebratory animation).

### Page inventory

| Route                     | Purpose                                                      |
| ------------------------- | ------------------------------------------------------------ |
| `/`                       | Marketing home. What's a chavruta, how it works, "Sign up" CTA. |
| `/signin`                 | Auth.js sign-in page. Country-gated.                         |
| `/waitlist`               | Shown when country check fails. Email capture.               |
| `/onboarding`             | Postcode entry, name confirmation. Post-auth, pre-dashboard. |
| `/dashboard`              | Home: your tentacles, pending connection requests, accepted connections. |
| `/tentacles/new`          | Create a tentacle: subject, availability, notes.             |
| `/tentacles/[id]`         | View/edit a tentacle.                                        |
| `/tentacles/[id]/matches` | Ranked list of matching tentacles.                           |
| `/connections`            | All connections (pending sent, pending received, accepted).  |
| `/connections/[id]`       | Connection detail with embedded chat.                        |
| `/settings`               | Profile, region (read-only for v1), notification prefs.      |

### Specific UI notes

- **Tentacle cards**: subject as a colored chip, availability summary as a sparkline-style mini grid, "X hours/week" caption. Tappable.
- **Match cards**: other user's first name + photo, mutual hours, their notes. Single primary action: "Connect".
- **Availability picker**: this is the hero interaction. Make it feel like painting. Drag to paint, drag to erase. Haptic feedback on mobile via `navigator.vibrate(10)` on each cell toggle.
- **Subject icons**: use distinctive iconography for each (a sefer, a Talmud page, etc.). Lucide icons supplemented with custom SVGs where needed.



------

## 12. Environment variables

```
# App
DATABASE_URL=postgres://...
NEXT_PUBLIC_APP_URL=https://...

# Auth.js
AUTH_SECRET=...                          # openssl rand -base64 32
AUTH_GOOGLE_ID=...
AUTH_GOOGLE_SECRET=...

# Email (magic link + notifications)
RESEND_API_KEY=...
EMAIL_FROM=hello@chavrutamatch.com

# Geolocation
MAXMIND_DB_PATH=./data/GeoLite2-Country.mmdb

# TalkJS
NEXT_PUBLIC_TALKJS_APP_ID=...
TALKJS_SECRET_KEY=...
```



------

## 14. Definition of done for v1 launch

- [ ] A user in London can sign up via Google in under 60 seconds end-to-end
- [ ] A user outside the UK is shown the waitlist, never the signup form
- [ ] A user with a non-London UK postcode is shown the waitlist with explanation
- [ ] A user can create a tentacle and see at least one match within the same session (assuming seeded test data)
- [ ] A connection request results in an email to the recipient within 1 minute
- [ ] An accepted connection opens a working TalkJS chat for both parties
- [ ] All flows work on a 375px-wide mobile viewport without horizontal scroll
- [ ] All async actions show a toast on success and on error
- [ ] Lighthouse mobile score ≥ 90 on the dashboard



`postgresql://neondb_owner:npg_XjHVL8Gic7NZ@ep-dry-fire-aby1cmcj.eu-west-2.aws.neon.tech/neondb?sslmode=require`

