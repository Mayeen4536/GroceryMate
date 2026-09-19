-- Migration 7: household invite/join backend (Slice 8B).
--
-- Database only — see docs/INVITE_JOIN_DESIGN.md for the full approved
-- design. Implements the minimum needed for a real, single-use,
-- link-based household invite: one table, four RPCs, and RLS tight
-- enough that the table itself grants authenticated users nothing but a
-- narrow, owner-scoped read. No frontend, no routing, no email, no
-- member-claiming, no payments. The existing fake "Invite by link" UI
-- and the orphaned email-invite mechanism (see docs/MEMBER_INTEGRATION.md
-- and docs/INVITE_JOIN_DESIGN.md §1) are untouched — removing them is
-- frontend Slice 8C's job, not this one's.
--
-- Conflicts between the approved design and the current schema, found
-- during re-inspection and resolved here (not silently):
--
-- 1. pgcrypto is already installed (in the `extensions` schema) as part
--    of Supabase's own project bootstrap — confirmed via `pg_extension`,
--    not something any prior migration in this project added. The
--    design doc assumed it would need enabling; it does not. Every call
--    below is fully schema-qualified (`extensions.digest`,
--    `extensions.gen_random_bytes`) regardless, since every function
--    here pins `search_path = ''` — schema-qualification isn't optional
--    once that's true, whether or not the extension already existed.
-- 2. `household_members_household_profile_key` — a pre-existing partial
--    unique index on (household_id, profile_id) WHERE profile_id IS NOT
--    NULL — means a profile that was previously a member of a household
--    (now archived, not deleted) and is re-invited to that *same*
--    household cannot get a second row inserted for that exact pairing.
--    This is a real, structural edge case the approved design's "always
--    insert a new row" rule doesn't fully cover on its own. Handled
--    below by catching the resulting unique_violation and surfacing a
--    clear, specific error instead of a raw constraint message — see
--    accept_household_invite. Not a claiming/merging feature (still
--    explicitly deferred): it does not resurrect the archived row, it
--    just explains why a fresh insert failed.
-- 3. The approved design's own §8 pseudocode covers the single-invite
--    replay/double-accept race (a conditional UPDATE on the invite row)
--    but not a *second*, independent race: the same profile accepting
--    two *different* invites (to two different households) concurrently.
--    Two concurrent calls could each see "no active membership yet" and
--    both proceed to insert, landing the profile in the exact
--    >1-active-membership 'unsupported' state HouseholdProvider already
--    refuses to render. Closed below with `select ... for update` on the
--    caller's own profile row before the "already have a household"
--    check — a standard "lock a row tied to the invariant you're
--    protecting" technique, serializing any concurrent accept attempts
--    by the same profile regardless of which invite each one targets.
--    This is a correctness addition beyond the design doc's literal
--    pseudocode, not a change in intended behavior.


-- =============================================================================
-- household_invites
-- =============================================================================
-- A real, single-use, link-based invitation. Never stores the raw token
-- (see token_hash below) and never gets a role column — an invited user
-- is always a plain 'member', hardcoded in accept_household_invite, never
-- read from this table.
create table public.household_invites (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  -- The invite's secret, hashed. Never the raw token — see
  -- create_household_invite, which returns the raw value to the owner
  -- exactly once and persists only this. A fast, uniform hash (SHA-256)
  -- is the right tool here, unlike a password: the raw token already
  -- carries 256 bits of entropy, so there's no low-entropy brute-force
  -- risk a slow hash would need to defend against.
  token_hash text not null,
  -- Who generated it. Composite FK (below) guarantees this member
  -- genuinely belongs to *this* row's own household_id — same
  -- cross-household guarantee every other creator/payer/consumer
  -- reference in this schema already has. Always derived server-side
  -- from auth.uid() inside create_household_invite; never a value a
  -- client supplies directly.
  created_by_member_id uuid not null,
  created_at timestamptz not null default now(),
  -- Server-computed (now() + 7 days) inside create_household_invite —
  -- never a client-supplied value, so no CHECK constraint is needed to
  -- defend against a bad one; there is no path for a bad one to arrive.
  expires_at timestamptz not null,
  -- Null = still live. Set only by revoke_household_invite, only by the
  -- household's owner.
  revoked_at timestamptz,
  -- Null = not yet used. Set only inside accept_household_invite's own
  -- conditional UPDATE, which is also this table's concurrency
  -- guarantee — see that function's comments.
  accepted_at timestamptz,
  -- Who actually used it — an audit trail, and the field that pairs
  -- with accepted_at (enforced below) rather than a column client code
  -- could set independently; always auth.uid() at accept time, on
  -- delete set null for the same reason household_members.profile_id
  -- already is (deleting a profile shouldn't be blocked by a historical
  -- "who accepted this" reference, unlike households.created_by's
  -- deliberately stricter ON DELETE RESTRICT).
  accepted_by_profile_id uuid references public.profiles (id) on delete set null,

  -- accepted_at and accepted_by_profile_id are only ever meaningful
  -- together — this is a real data-integrity invariant worth enforcing
  -- at the database level, independent of any RPC, since it's cheap and
  -- protects against any future direct-SQL mistake (including one made
  -- with service_role) leaving the two out of sync.
  constraint household_invites_accepted_fields_together
    check ((accepted_at is null) = (accepted_by_profile_id is null)),

  constraint household_invites_created_by_member_id_fkey
    foreign key (created_by_member_id, household_id)
    references public.household_members (id, household_id)
);

comment on table public.household_invites is
  'Real, single-use, link-based household invitations. Never stores a raw token — only its SHA-256 hash.';
comment on column public.household_invites.token_hash is
  'SHA-256 hash of the raw token (hex-encoded), never the raw value itself. See create_household_invite/resolve_household_invite/accept_household_invite.';

-- The lookup EVERY resolve/accept call performs, and the uniqueness
-- guarantee for the hash itself — one index doing both jobs, exactly the
-- same reasoning grocery_items_household_id_created_at_idx already
-- follows for its own table's primary access pattern.
create unique index household_invites_token_hash_key
  on public.household_invites (token_hash);

-- "List this household's invites, newest first" — the query pattern a
-- future "pending invites" owner view needs (docs/INVITE_JOIN_DESIGN.md
-- §4/§12), and already the exact shape of
-- grocery_items_household_id_created_at_idx's own justification.
create index household_invites_household_id_created_at_idx
  on public.household_invites (household_id, created_at desc);

-- Deliberately no index on created_by_member_id or
-- accepted_by_profile_id: nothing queries this table by either column
-- yet — same reasoning grocery_items.created_by_member_id's own
-- deliberately-unindexed precedent already documents. Add one if that
-- changes.

alter table public.household_invites enable row level security;

-- =============================================================================
-- Grants — as minimal as this schema gets anywhere.
-- =============================================================================
-- Every mutation (create/accept/revoke) happens exclusively through the
-- SECURITY DEFINER RPCs below, which run with the function owner's
-- privileges, not the caller's — so authenticated needs no direct
-- INSERT/UPDATE/DELETE grant on this table at all, not even a
-- column-restricted one. The only direct table privilege granted is a
-- narrow, RLS-scoped SELECT, for an owner viewing their own household's
-- invites. TRUNCATE is therefore already unavailable to anyone but the
-- table owner, the same as everywhere else in this schema.
revoke all on public.household_invites from public, anon, authenticated;
grant select on public.household_invites to authenticated;

-- =============================================================================
-- RLS — the table policy stays owner-only; everything else is RPC-gated.
-- =============================================================================
-- Deliberately not "any household member can see pending invites": the
-- approved design only asks for owner-only create/revoke, and there is
-- no stated need for a regular member to browse invites they can't act
-- on anyway. Anyone resolving a specific token to join goes through
-- resolve_household_invite instead (SECURITY DEFINER, its own tightly
-- scoped return shape) — never a table read.
create policy household_invites_select_owner
  on public.household_invites for select
  to authenticated
  using (private.is_household_owner(household_id));

-- No INSERT/UPDATE/DELETE policy at all: with no grant for any of the
-- three, a policy would be moot — its absence is itself part of this
-- design record, the same pattern already used for
-- household_members' missing DELETE grant.


-- =============================================================================
-- create_household_invite(): owner-only, generates one real, single-use invite.
-- =============================================================================
-- Returns the raw token exactly once — the only place it ever exists in
-- plaintext outside the caller's own browser. Only the SHA-256 hash is
-- persisted. Mirrors create_household()'s own shape: SECURITY DEFINER,
-- search_path pinned to '', identity derived exclusively from auth.uid(),
-- never a client-supplied parameter.
create or replace function public.create_household_invite(p_household_id uuid)
returns table (invite_id uuid, token text, expires_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_caller_id uuid := auth.uid();
  v_household_status text;
  v_creator_member_id uuid;
  v_raw_token text;
  v_token_hash text;
  v_invite_id uuid;
  v_expires_at timestamptz;
begin
  if v_caller_id is null then
    raise exception 'Not authenticated.';
  end if;

  select h.status into v_household_status
  from public.households h
  where h.id = p_household_id;

  if not found then
    raise exception 'Household not found.';
  end if;

  if v_household_status <> 'active' then
    raise exception 'This household is archived.';
  end if;

  -- Re-derives ownership itself from auth.uid() — never trusts anything
  -- about the caller's identity or role from a parameter, exactly like
  -- every other owner-gated action in this schema.
  if not private.is_household_owner(p_household_id) then
    raise exception 'Only the household owner can create an invite.';
  end if;

  -- is_household_owner(true) already proved an active, owner-role
  -- membership row exists for this caller in this household, so this
  -- can never come back null here.
  v_creator_member_id := private.household_member_id_for(p_household_id);

  v_raw_token := encode(extensions.gen_random_bytes(32), 'hex');
  v_token_hash := encode(extensions.digest(v_raw_token, 'sha256'), 'hex');
  v_expires_at := now() + interval '7 days';

  insert into public.household_invites (household_id, token_hash, created_by_member_id, expires_at)
  values (p_household_id, v_token_hash, v_creator_member_id, v_expires_at)
  returning id into v_invite_id;

  return query select v_invite_id, v_raw_token, v_expires_at;
end;
$$;

comment on function public.create_household_invite(uuid) is
  'Owner-only. Generates a real, single-use, 7-day invite and returns the raw token exactly once — only its hash is ever persisted.';

revoke execute on function public.create_household_invite(uuid) from public, anon;
grant execute on function public.create_household_invite(uuid) to authenticated;


-- =============================================================================
-- resolve_household_invite(): usable before authentication, minimal reveal.
-- =============================================================================
-- The one function in this entire schema anon is allowed to call — by
-- design, since a recipient must be able to see "you're invited to join
-- X" before ever signing up. Returns only a status label and (only when
-- genuinely still valid) the household's display name — never a member
-- list, never any profile/email, never the token hash, never anything
-- about a household this specific token doesn't resolve to. An
-- already-archived household behind an otherwise-still-live invite is
-- reported as 'invalid', not with its real name — a household going
-- archived after an invite was issued shouldn't retroactively become
-- more exposed than any other invalid token.
create or replace function public.resolve_household_invite(p_token text)
returns table (status text, household_name text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_token_hash text;
  v_invite record;
begin
  v_token_hash := encode(extensions.digest(p_token, 'sha256'), 'hex');

  select hi.revoked_at, hi.accepted_at, hi.expires_at, h.name as h_name, h.status as h_status
  into v_invite
  from public.household_invites hi
  join public.households h on h.id = hi.household_id
  where hi.token_hash = v_token_hash;

  if not found then
    return query select 'invalid'::text, null::text;
    return;
  end if;

  if v_invite.revoked_at is not null then
    return query select 'revoked'::text, null::text;
    return;
  end if;

  if v_invite.accepted_at is not null then
    return query select 'accepted'::text, null::text;
    return;
  end if;

  if v_invite.expires_at <= now() then
    return query select 'expired'::text, null::text;
    return;
  end if;

  if v_invite.h_status <> 'active' then
    return query select 'invalid'::text, null::text;
    return;
  end if;

  return query select 'valid'::text, v_invite.h_name;
end;
$$;

comment on function public.resolve_household_invite(text) is
  'Callable before authentication. Returns only a status label and, when genuinely valid, the household display name — never member/financial/profile data.';

revoke execute on function public.resolve_household_invite(text) from public;
grant execute on function public.resolve_household_invite(text) to anon, authenticated;


-- =============================================================================
-- accept_household_invite(): the atomic join transaction.
-- =============================================================================
-- SECURITY DEFINER because the resulting household_members insert could
-- never satisfy household_members_insert_owner's owner-only WITH CHECK
-- from the invitee's own session — this is the same structural reason
-- create_household() already has to be SECURITY DEFINER, not a new
-- exception to the rule. The only parameter is the raw token; household,
-- role, and profile identity are never client-supplied.
create or replace function public.accept_household_invite(p_token text)
returns table (household_id uuid, member_id uuid)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_caller_id uuid := auth.uid();
  v_display_name text;
  v_token_hash text;
  v_invite record;
  v_member_id uuid;
begin
  if v_caller_id is null then
    raise exception 'Not authenticated.';
  end if;

  -- Locks the caller's own profile row for the rest of this
  -- transaction. This is the guard against a *second* race the approved
  -- design's own pseudocode didn't cover: the same profile accepting two
  -- different invites (to two different households) concurrently, each
  -- seeing "no active membership yet" before either commits. Locking a
  -- row tied to the invariant being protected — even though this exact
  -- row isn't being written — serializes any concurrent accept attempts
  -- by this same profile, regardless of which invite each one targets.
  select p.display_name into v_display_name
  from public.profiles p
  where p.id = v_caller_id
  for update;

  if not found then
    raise exception 'No profile exists for the current user.';
  end if;

  v_token_hash := encode(extensions.digest(p_token, 'sha256'), 'hex');

  select hi.id, hi.household_id, hi.revoked_at, hi.accepted_at, hi.expires_at, h.status as h_status
  into v_invite
  from public.household_invites hi
  join public.households h on h.id = hi.household_id
  where hi.token_hash = v_token_hash;

  if not found then
    raise exception 'Invalid invite.';
  end if;

  if v_invite.revoked_at is not null then
    raise exception 'This invite has been revoked.';
  end if;

  if v_invite.accepted_at is not null then
    raise exception 'This invite has already been used.';
  end if;

  if v_invite.expires_at <= now() then
    raise exception 'This invite has expired.';
  end if;

  if v_invite.h_status <> 'active' then
    raise exception 'This household is archived.';
  end if;

  -- The check HouseholdContext's 'unsupported' state (>1 active
  -- membership, no switcher yet) exists to guard against — enforced
  -- here, server-side, not left to the frontend to discover after the
  -- fact. Archived memberships elsewhere do NOT block this: a profile
  -- with only archived history (0 active rows) can freely join a new
  -- household, exactly matching HouseholdProvider.loadHousehold's own
  -- tolerance for "1 active + N archived" as a perfectly normal, 'ready'
  -- state.
  if exists (
    select 1 from public.household_members hm
    where hm.profile_id = v_caller_id and hm.status = 'active'
  ) then
    raise exception 'You already belong to a household.';
  end if;

  -- The atomic consumption: this conditional UPDATE is the entire
  -- concurrency guarantee for double-accept/replay of this *specific*
  -- invite. Postgres serializes concurrent UPDATEs to the same row —
  -- whichever call commits first "wins"; a second, concurrent or later
  -- call re-evaluates this WHERE clause against the now-committed row
  -- and finds accepted_at already set, updating 0 rows.
  update public.household_invites
  set accepted_at = now(), accepted_by_profile_id = v_caller_id
  where id = v_invite.id and accepted_at is null;

  if not found then
    raise exception 'This invite has already been used.';
  end if;

  begin
    insert into public.household_members (household_id, profile_id, display_name, role, status, joined_at)
    values (v_invite.household_id, v_caller_id, v_display_name, 'member', 'active', now())
    returning id into v_member_id;
  exception when unique_violation then
    -- household_members_household_profile_key: this profile already has
    -- a (necessarily archived, given the active-membership check above
    -- already passed) row in this exact household from before. Not the
    -- claiming/merging feature the approved design defers — just an
    -- honest explanation for why a fresh insert can't happen here,
    -- surfaced instead of a raw constraint-violation message. Raising
    -- here rolls back the whole function, including the accepted_at
    -- update above, so the invite is not burned by this failure.
    raise exception 'You were previously a member of this household. Ask the household owner to reactivate your membership.';
  end;

  return query select v_invite.household_id, v_member_id;
end;
$$;

comment on function public.accept_household_invite(text) is
  'Authenticated only. Atomically consumes a single-use invite and creates the caller''s real, active, member-role household_members row. household_id/role/profile_id are never client-supplied.';

revoke execute on function public.accept_household_invite(text) from public, anon;
grant execute on function public.accept_household_invite(text) to authenticated;


-- =============================================================================
-- revoke_household_invite(): owner-only, closes an unused invite early.
-- =============================================================================
create or replace function public.revoke_household_invite(p_invite_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_household_id uuid;
begin
  select hi.household_id into v_household_id
  from public.household_invites hi
  where hi.id = p_invite_id;

  if not found then
    raise exception 'Invite not found.';
  end if;

  if not private.is_household_owner(v_household_id) then
    raise exception 'Only the household owner can revoke an invite.';
  end if;

  update public.household_invites
  set revoked_at = now()
  where id = p_invite_id and revoked_at is null and accepted_at is null;

  if not found then
    raise exception 'This invite has already been used or revoked.';
  end if;
end;
$$;

comment on function public.revoke_household_invite(uuid) is
  'Owner-only. Marks an unused, unrevoked invite as revoked — a consumed invite cannot become usable again, and this never resurrects one.';

revoke execute on function public.revoke_household_invite(uuid) from public, anon;
grant execute on function public.revoke_household_invite(uuid) to authenticated;
