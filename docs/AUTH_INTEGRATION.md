# Frontend Supabase Integration — Slice 1: Auth + Session + Profile

This is the first slice connecting GroceryMate's UI layer to its real
backend (see `README.md`'s "two layers" section). It covers **only**
authentication, session persistence, and profile display/editing.
Households, members, groceries, and settlements are still the existing
local/mock implementation — see "What remains mock/local" below.

## Required environment variables

Copy `.env.example` to `.env.local` (gitignored) and set:

| Variable | Where to find it |
|---|---|
| `VITE_SUPABASE_URL` | Local: `npx supabase status` → `API_URL`. Hosted (`grocerymate-dev`): dashboard API settings. |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Local: `npx supabase status` → `PUBLISHABLE_KEY` (or `ANON_KEY`). Hosted: dashboard API settings. |

Both are safe for browser code — this is the publishable/anon key, not a
secret. `src/auth/supabaseClient.ts` throws a clear error at startup if
either is missing, rather than failing silently or partially. Never put a
`service_role` key, database password, or management API token in a
`VITE_`-prefixed variable — anything with that prefix ships in the
client-side bundle.

## Running Auth locally

1. `npx supabase start` (starts the local stack; local Auth has email
   confirmation **disabled**, so sign-up returns an active session
   immediately — no email step to simulate).
2. `npm run dev`, then sign up/sign in normally through the UI.

## How hosted email confirmation behaves

The hosted `grocerymate-dev` project requires email confirmation. A
successful `supabase.auth.signUp(...)` call there returns **no session**
until the link in the confirmation email is opened — this is success, not
failure, and the UI must never treat it as a login (see
`src/auth/AuthProvider.tsx`'s `signUp()`, which returns a
`'confirmation-required'` result distinct from `'signed-in'`). The hosted
project also rate-limits how many confirmation emails it will send in a
short window (`over_email_send_rate_limit`) — expect this if you exercise
real hosted sign-up repeatedly in a short span; it is an infrastructure
limit, not an app bug.

## Auth architecture

```
React tree
  └─ <AuthProvider>              src/auth/AuthProvider.tsx — owns session + profile state
       └─ <BrowserRouter>
            └─ <App>             reads useAuth().status to route between
                                  Landing / sign-in / sign-up / the protected app shell
```

- **`src/auth/supabaseClient.ts`** — the one Supabase browser client
  instance, built from the two env vars above.
- **`src/auth/AuthContext.ts` / `AuthProvider.tsx` / `useAuth.ts`** — a
  React Context, which is a deliberate, singular exception to this
  codebase's usual convention (state owned by a hook, threaded down as
  props from `App.tsx` — see `src/hooks/useMembers.ts` and friends).
  Session identity is needed in places with no parent-child relationship
  to one feature page (the route guard, `Sidebar`, `TopBar`,
  `SettingsPage`), which is exactly the case that convention doesn't fit.
  Everywhere else in this app, prefer the existing hook-in-`App.tsx`
  pattern over adding another Context.
- **`src/auth/RouteGuards.tsx`** — `<ProtectedRoute>` (redirects to
  `/sign-in` when signed out; shows a loading state — never a fabricated
  profile — while the session or profile is still resolving) and
  `<GuestRoute>` (redirects an already-signed-in visitor away from
  `/sign-in`/`/sign-up`).
- **`src/features/auth/`** — `SignInPage`, `SignUpPage`, shared
  `AuthLayout`, a `PasswordInput` with a visibility toggle, and client-side
  `validation.ts` (empty/format checks only — Supabase/GoTrue remains the
  authoritative validator).
- **`src/auth/errors.ts`** — maps GoTrue error codes to short, safe,
  user-facing copy; always logs the raw error to the console for developer
  diagnostics first.

## Profile lifecycle

Migration 4 (`supabase/migrations/20260903143905_auth_profile_lifecycle.sql`)
auto-creates a `profiles` row for every new Auth user via a database
trigger — the frontend never inserts a profile itself. `AuthProvider`
fetches it by `.eq('id', session.user.id)` — always the authenticated
user's own id from the session, never a client-selected one — which is
what actually exercises Migration 3's `profiles_select_own` RLS policy
from a real browser session, not just from direct database testing.
`updateDisplayName()` is the only mutation exposed, matching the only
column Migration 3 grants `authenticated` write access to.

## What remains mock/local

Households, members, groceries, and settlements are untouched — still the
existing `src/store/*` seed data and `src/hooks/useMembers.ts` /
`useGroceries.ts` state, exactly as before this slice. `mockHousehold` is
still used as-is by `Sidebar`/`TopBar`. Only `mockUser` was replaced, with
the real authenticated profile, in those same two files. This is a
deliberate seam, not an oversight: Slice 2 is where household/member/
grocery data moves onto the real schema (Migrations 1-3), and nothing here
should be read as already having done that.

## Known limitation: household-creator account deletion

Carried over from Migration 4 (not something this slice introduces or
fixes): a user who has ever created a household cannot have their Auth
account deleted while that household still exists
(`households.created_by ... on delete restrict`). This slice's manual
verification (below) deliberately never calls `create_household()`, so it
never triggers this limitation — test accounts created for this slice are
freely deletable.

## Manual hosted verification log

Performed against `grocerymate-dev` with real (non-committed) credentials
in `.env.local`, using a distinctive throwaway test account (email/password
not reproduced here): logged out → sign up → "check your email" state →
confirmed via the emailed link → signed in → real profile loaded (verified
in Settings) → refreshed (session survived) → navigated the protected
routes → signed out → protected route became inaccessible → refreshed
(remained logged out). Test account cleaned up afterward via the Auth Admin
API — safe and complete, since this slice never creates a household.
