-- Migration 4: Auth profile lifecycle.
--
-- Resolves the open item named in Migration 1's own comments and in
-- docs/SUPABASE_SCHEMA_DESIGN.md's Migration 1 notes: "no profiles row is
-- created automatically today." Adds exactly one trigger and its function.
-- No new tables, no changes to Migrations 1-3, no RLS policy or GRANT
-- changes on profiles/households/household_members/grocery_items/
-- grocery_item_consumers (none are required — see the reasoning below),
-- no frontend code, no payments, no service-role logic.
--
-- Schema facts this migration relies on, confirmed by inspection before
-- writing it (not assumed):
--   - public.profiles: id uuid primary key references auth.users(id) on
--     delete cascade; email text not null with its own unique index
--     (profiles_email_key); display_name text not null; updated_at kept
--     current by Migration 1's existing set_updated_at() trigger, reused
--     here unchanged.
--   - Migration 3 granted authenticated: select on profiles, update
--     (display_name) only. No insert grant exists, and none is added by
--     this migration — see "Why no INSERT grant" below.
--   - auth.users.email is character varying(255), with the auth schema's
--     OWN uniqueness enforced by a case-sensitive partial unique index
--     (users_email_partial_key, where is_sso_user = false) — not a
--     lower(email) index (that one, users_instance_id_email_idx, is a
--     plain non-unique index, used for case-insensitive lookup at login,
--     not for uniqueness). This migration copies auth.users.email
--     verbatim, in whatever case GoTrue already normalized/stored it in —
--     see "Email handling" below for why that's the right choice, not a
--     gap to fix here.
--   - auth.users.raw_user_meta_data is jsonb — arbitrary, client-supplied
--     signup metadata. Never trusted wholesale; only one specific key is
--     ever read (see "Display name" below).
--   - This project's local config has enable_anonymous_sign_ins = false
--     and auth.phone's enable_signup = false — only email/password signup
--     is reachable today, so auth.users.email is not null in practice for
--     every currently-possible signup path. See "Fail-safe behavior"
--     below for what happens if that ever changes without revisiting this
--     migration.


-- =============================================================================
-- public.handle_new_user(): AFTER INSERT ON auth.users trigger function.
-- =============================================================================
-- Why a database trigger, not frontend code calling some "create my
-- profile" endpoint after signup: a trigger runs inside GoTrue's own
-- signup transaction, so there is no window — not even a network
-- round-trip — where an auth.users row exists with no matching profile.
-- Frontend-driven creation has two failure modes a trigger structurally
-- cannot: the client can crash/lose connectivity between "signup
-- succeeded" and "profile created," and a malicious or buggy client could
-- skip the profile-creation call entirely, or call it for a DIFFERENT
-- uuid than its own session (there is no way to check "is this really the
-- caller's own id" from inside an RPC as reliably as reading NEW.id
-- straight off the row Postgres itself just inserted). A trigger has
-- neither problem: it fires exactly once, exactly when the row it reads
-- from is guaranteed to exist and be correct, with no network step in
-- between and no argument a client supplies at all.
--
-- Why SECURITY DEFINER: the trigger fires as whatever role performs the
-- INSERT into auth.users — that's supabase_auth_admin (GoTrue's own
-- dedicated Postgres role), which has no reason to hold INSERT privilege
-- on public.profiles and should not be given one just for this. SECURITY
-- DEFINER, owned by postgres (the same table-owning role Migration 3's
-- helper functions already use for the same reason), runs the INSERT with
-- the owner's privileges instead — the only privilege escalation this
-- function performs is "insert exactly one row, into exactly one table,
-- with values read only from the row that triggered it." set search_path
-- = '' and a fully-qualified public.profiles reference close off the
-- search-path-hijacking vector the same way every SECURITY DEFINER
-- function in this project already does.
--
-- Why this cannot be abused as a generic "create a profile for any uuid"
-- backdoor despite running with elevated privilege: it is a trigger
-- function (returns trigger), which Postgres refuses to invoke any other
-- way — calling it directly via SQL fails with "trigger functions can
-- only be called as triggers" regardless of who holds EXECUTE on it. It
-- takes no arguments at all; every value it writes (id, email,
-- raw_user_meta_data) comes from NEW, the row Postgres itself just
-- inserted into auth.users, never from a parameter a caller could set.
-- There is structurally no way to call this function "as" a different
-- uuid than the auth.users row that is actually being created.
--
-- Never trusts a client-supplied profile id: NEW.id is auth.users.id for
-- the row just inserted — GoTrue generates this server-side; nothing in
-- the public signup API lets a client choose it. profiles.id is always
-- exactly that value, never anything read from request metadata.
--
-- Never creates duplicate profiles: ON CONFLICT (id) DO NOTHING makes the
-- insert idempotent. Normal signup only ever fires this trigger once per
-- auth.users row (id is that table's primary key), so this is defense in
-- depth — cheap insurance against a replayed/retried trigger invocation,
-- not a scenario this schema expects to happen.
--
-- Fail-safe behavior: this function performs no exception handling of its
-- own (no EXCEPTION block swallowing errors). If the insert cannot
-- succeed — most plausibly, a future auth.users row with email null
-- (phone or anonymous auth, both disabled in this project's config today)
-- violating profiles.email's NOT NULL constraint — the error propagates
-- and rolls back the entire signup transaction, auth.users insert
-- included. A signup that fails outright, leaving no orphaned
-- auth.users-without-profile row behind, is the deliberately chosen
-- failure mode: a user profile is the trusted identity every household
-- authorization check in Migration 3 depends on, so a half-created
-- account with no profile would be a broken state no RLS policy or
-- frontend code could safely recover from. Extending this trigger to
-- support a null-email auth mode is out of scope for this migration (see
-- docs section for the named limitation) — not something worked around
-- here.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, display_name)
  values (
    new.id,
    new.email,
    -- Display name: read ONLY the display_name key out of the client-
    -- supplied metadata blob — never the whole jsonb object, and never
    -- any other key in it. Empty/whitespace-only counts as absent.
    -- Falls back to the email's local part, then to a fixed literal, so
    -- signup can never fail for lack of a display name — Migration 3's
    -- profiles_update_own policy already lets the user change this
    -- afterward.
    coalesce(
      nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''),
      nullif(split_part(new.email, '@', 1), ''),
      'New Member'
    )
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

comment on function public.handle_new_user() is
  'AFTER INSERT ON auth.users trigger: creates the matching profiles row. Never callable directly (trigger functions cannot be), takes no arguments, and reads only NEW — see this migration''s own comments for the full reasoning.';

-- Defense in depth alongside the "trigger functions can't be called
-- directly" language restriction above: makes the "nobody may invoke this
-- as an ordinary function" intent an explicit, auditable grant state
-- rather than an accident of the return type. No role is granted EXECUTE
-- at all — not even authenticated — because nothing legitimate ever calls
-- this function directly; only the trigger mechanism itself invokes it,
-- and that does not require the firing role (supabase_auth_admin) to hold
-- EXECUTE on the function being fired.
revoke execute on function public.handle_new_user() from public, anon, authenticated;


-- =============================================================================
-- Trigger: fire handle_new_user() after every new Auth user.
-- =============================================================================
-- No COMMENT ON TRIGGER here: auth.users is owned by supabase_auth_admin,
-- not the role this migration runs as, and COMMENT ON (unlike CREATE
-- TRIGGER, which only needs the TRIGGER privilege) requires object
-- ownership. The full rationale lives in this file's own comments above
-- instead.
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();


-- =============================================================================
-- Why no RLS, GRANT, or policy changes accompany this migration
-- =============================================================================
-- profiles.id is asked to remain database-derived, not client-writable,
-- and profile creation is asked to happen without opening a direct
-- client-writable INSERT path — SECURITY DEFINER already gives this
-- trigger everything it needs to insert without any GRANT to
-- authenticated at all. Migration 3's existing profiles policies
-- (profiles_select_own, profiles_update_own) and grants (select;
-- update (display_name) only) are exactly correct for the lifecycle this
-- migration adds and need no change: a user can read and edit their own
-- freshly-created profile the moment it exists, and still cannot insert,
-- delete, or touch another profile, or their own id/email — unchanged
-- from Migration 3. No table's RLS-enabled state, policy set, or GRANT
-- matrix is touched anywhere in this file.
