-- Migration 3: authorization / RLS.
--
-- Adds policies to the five tables Migrations 1-2 already created and
-- enabled RLS on (deny-by-default since the moment each table existed).
-- No new tables, no changes to Migration 1 or 2, no Auth implementation,
-- no payments, no service-role logic. Schema source:
-- docs/SUPABASE_SCHEMA_DESIGN.md; policy intent source: this task's
-- approved permissions list. Full reasoning, the threat-model mapping,
-- and the test matrix are in that file's own Migration 3 section — this
-- file's comments explain *what* and *why it's safe*, not the full audit.
--
-- Core invariant this entire migration exists to enforce: a user must
-- never read or modify another household's data unless authorized
-- through their own household membership. Every policy below derives
-- authorization from auth.uid() — the JWT-verified identity Postgres
-- itself trusts — never from a client-supplied household_id, profile_id,
-- or display name.


-- =============================================================================
-- private schema: authorization helpers, not exposed over the API.
-- =============================================================================
-- PostgREST only routes requests to schemas explicitly configured as
-- exposed (supabase/config.toml's api.schemas — "public" by default; this
-- migration does not add "private" to it). A function living here can be
-- called from *inside* a policy (policies execute in Postgres itself, not
-- through PostgREST), but never directly via `supabase.rpc(...)` from a
-- client. That's the "non-exposed" half of Step 2's instruction; the rest
-- of this section's comments cover the rest.
create schema if not exists private;

-- Not exposed to PostgREST at all regardless, but revoked explicitly too:
-- defense in depth, and it documents the intent even if the schema were
-- ever added to the exposed list by a future, unrelated config change.
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to authenticated;


-- ---------------------------------------------------------------------------
-- private.is_household_member(household_id, include_archived)
-- ---------------------------------------------------------------------------
-- Whether auth.uid() is a member of the given household. Archived members
-- only count when include_archived is true (read-only historical access,
-- per the approved permissions — never for anything that authorizes a
-- write). Invited (not-yet-joined) rows never count, at all: an unaccepted
-- invite grants no access even in the hypothetical case its profile_id
-- were somehow already set.
--
-- Why SECURITY DEFINER, specifically: this function is used by
-- household_members' OWN select policy (see below), and by every other
-- table's policies too. If it ran as SECURITY INVOKER, the SELECT inside
-- it would itself be subject to household_members' RLS — whose policy
-- calls this very function — an infinite loop ("infinite recursion
-- detected in policy for relation household_members"). SECURITY DEFINER,
-- owned by the role that owns household_members (postgres, via this
-- migration itself — table owners are exempt from a table's own RLS by
-- default, since FORCE ROW LEVEL SECURITY is never set anywhere here),
-- breaks the cycle: the SELECT inside this function runs unfiltered by
-- household_members' policies, then the function's own boolean result is
-- what the *caller's* policy evaluation actually uses.
--
-- Why this cannot be abused to bypass authorization despite running with
-- elevated privileges: the household_id argument is caller-supplied and
-- that's fine — asking "am I a member of household X" for an arbitrary X
-- leaks nothing (it returns a bare boolean, never row data). What can
-- never be supplied by the caller is *whose* membership is being
-- checked — that always comes from auth.uid(), which Postgres populates
-- from the verified JWT, not from anything in the function's argument
-- list. There is no parameter here a client could set to "check as
-- someone else."
create or replace function private.is_household_member(
  p_household_id uuid,
  p_include_archived boolean default false
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.household_members hm
    where hm.household_id = p_household_id
      and hm.profile_id = auth.uid()
      and (
        hm.status = 'active'
        or (p_include_archived and hm.status = 'archived')
      )
  );
$$;

revoke execute on function private.is_household_member(uuid, boolean) from public, anon;
grant execute on function private.is_household_member(uuid, boolean) to authenticated;


-- ---------------------------------------------------------------------------
-- private.is_household_owner(household_id)
-- ---------------------------------------------------------------------------
-- Whether auth.uid() is the *active* owner of the given household.
-- Deliberately does not extend to an archived owner: archival ends write
-- authority, even for someone who used to own the household (only their
-- historical read access survives, via is_household_member's own
-- include_archived flag elsewhere). Same SECURITY DEFINER reasoning as
-- above — this queries household_members too.
create or replace function private.is_household_owner(p_household_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.household_members hm
    where hm.household_id = p_household_id
      and hm.profile_id = auth.uid()
      and hm.role = 'owner'
      and hm.status = 'active'
  );
$$;

revoke execute on function private.is_household_owner(uuid) from public, anon;
grant execute on function private.is_household_owner(uuid) to authenticated;


-- ---------------------------------------------------------------------------
-- private.household_member_id_for(household_id)
-- ---------------------------------------------------------------------------
-- The household_members.id row that represents auth.uid() in the given
-- household, if they're an *active* member — null otherwise (including
-- for archived members: this powers creator-identity checks for new
-- writes, which archived members are never allowed to make). This is the
-- answer to "what household_member id am I in household X" that a
-- grocery-creation policy needs — derived server-side, never trusted from
-- the client's own claim of "I am member Y".
create or replace function private.household_member_id_for(p_household_id uuid)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select hm.id
  from public.household_members hm
  where hm.household_id = p_household_id
    and hm.profile_id = auth.uid()
    and hm.status = 'active'
  limit 1;
$$;

revoke execute on function private.household_member_id_for(uuid) from public, anon;
grant execute on function private.household_member_id_for(uuid) to authenticated;


-- ---------------------------------------------------------------------------
-- private.can_edit_grocery_item(grocery_item_id)
-- ---------------------------------------------------------------------------
-- Whether auth.uid() may update/delete the given grocery item, or add/
-- remove its consumers: they must be its original creator, or the
-- household's active owner. Both branches already require active
-- membership on their own (household_member_id_for and is_household_owner
-- both return false/null for anyone who isn't), so there's no separate
-- membership check to add here. SECURITY DEFINER for the same reason as
-- the others: it queries grocery_items directly rather than relying on
-- that table's own SELECT policy being satisfied first, so the same
-- creator/owner rule can be reused unchanged from the consumer-table
-- policies below (which query a different table than the one their own
-- policy governs, so they wouldn't strictly need this to avoid recursion
-- — but reusing one audited function beats re-deriving the same logic in
-- four separate policy bodies).
create or replace function private.can_edit_grocery_item(p_grocery_item_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.grocery_items gi
    where gi.id = p_grocery_item_id
      and (
        gi.created_by_member_id = private.household_member_id_for(gi.household_id)
        or private.is_household_owner(gi.household_id)
      )
  );
$$;

revoke execute on function private.can_edit_grocery_item(uuid) from public, anon;
grant execute on function private.can_edit_grocery_item(uuid) to authenticated;


-- =============================================================================
-- profiles
-- =============================================================================
-- Least privilege: a user sees and can touch only their own profile row,
-- never anyone else's — the household roster's own display_name column
-- (Migration 1) is what the app uses to show other members' names, so
-- broader profiles access is never needed for that.
create policy profiles_select_own
  on public.profiles for select
  to authenticated
  using (id = auth.uid());

create policy profiles_update_own
  on public.profiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- Supabase provisions every project with ALTER DEFAULT PRIVILEGES for the
-- public schema that grants anon/authenticated/service_role full
-- arwdDxtm (SELECT/INSERT/UPDATE/DELETE/TRUNCATE/REFERENCES/TRIGGER) on
-- every table as it's created — this predates and is independent of
-- Migrations 1-2's own SQL, confirmed via pg_default_acl. A column-level
-- GRANT UPDATE (col) is purely additive on top of that: it cannot narrow a
-- privilege the role already holds table-wide. Left unrevoked, every
-- column-level grant below would be a no-op (every column stays writable
-- via the pre-existing table-wide grant) and, worse, TRUNCATE — which
-- bypasses RLS entirely, since Postgres never applies row-security to it —
-- would remain available to any authenticated user on every table. REVOKE
-- ALL here strips that default down to nothing so the GRANTs immediately
-- below are the true, complete, and only privileges authenticated holds.
revoke all on public.profiles from authenticated;

grant select on public.profiles to authenticated;
-- Column-level grant, not a blanket UPDATE: this is what actually prevents
-- changing identity-critical fields (id, email) through a client UPDATE —
-- Postgres rejects an UPDATE that SETs a column the role has no privilege
-- on, regardless of what RLS would otherwise allow. RLS's own
-- id = auth.uid() check above is defense in depth on top of this, not the
-- primary defense.
grant update (display_name) on public.profiles to authenticated;
-- No INSERT grant: nothing in this migration creates profile rows. The
-- signup-time profile-creation trigger was deliberately deferred in
-- Migration 1 (Auth isn't implemented yet, per this task's own
-- instructions) — profile creation remains an open item until Auth work
-- begins, documented rather than worked around here.
-- No DELETE grant: not a feature.


-- =============================================================================
-- households
-- =============================================================================
create policy households_select_member
  on public.households for select
  to authenticated
  using (private.is_household_member(id, true));

create policy households_update_owner
  on public.households for update
  to authenticated
  using (private.is_household_owner(id))
  with check (private.is_household_owner(id));

-- Strips the platform default table-wide grant first — see the identical
-- comment on profiles above for why this is required, not redundant.
revoke all on public.households from authenticated;

grant select on public.households to authenticated;
-- Column-level: name/currency/status/archived_at are the only fields an
-- owner's "household settings" or "archive this household" action would
-- ever touch. id, created_by, created_at stay off the grant entirely —
-- there is no legitimate client operation that rewrites provenance.
grant update (name, currency_code, status, archived_at) on public.households to authenticated;
-- No INSERT grant, deliberately: see the create_household() function
-- below. A direct "authenticated users may insert any household" policy
-- (with an equally unrestricted household_members owner-insert alongside
-- it) is exactly the insecure shortcut this task's instructions warn
-- against — a new household briefly has no owner to authorize against,
-- so the only safe way to create one is atomically, through a function
-- that derives the owner from auth.uid() and cannot be told to use a
-- different one.
-- No DELETE grant: household deletion is not a supported MVP product
-- action (see docs/SUPABASE_SCHEMA_DESIGN.md §16's inherited-limitation
-- note) — archiving via the UPDATE policy above is the only lifecycle
-- exit exposed to clients.


-- =============================================================================
-- household_members
-- =============================================================================
create policy household_members_select_member
  on public.household_members for select
  to authenticated
  using (private.is_household_member(household_id, true));

-- Adding a member to an *existing* household — not the household's first
-- (owner) row, which only create_household() below can ever insert, since
-- is_household_owner(household_id) can't yet be true for a household that
-- has no members at all.
create policy household_members_insert_owner
  on public.household_members for insert
  to authenticated
  with check (private.is_household_owner(household_id));

-- Role/status changes (invite, archive, reactivate) — owner-only, no
-- self-service carve-out. A member cannot promote themselves, cannot
-- archive the owner, and cannot archive themselves either under this
-- policy (self-removal isn't in this task's approved permissions list;
-- see the docs for this as a named limitation, not an oversight).
create policy household_members_update_owner
  on public.household_members for update
  to authenticated
  using (private.is_household_owner(household_id))
  with check (private.is_household_owner(household_id));

-- Strips the platform default table-wide grant first — see the identical
-- comment on profiles above for why this is required, not redundant.
revoke all on public.household_members from authenticated;

grant select on public.household_members to authenticated;
grant insert (household_id, profile_id, display_name, invited_email, role, status, invited_at, joined_at)
  on public.household_members to authenticated;
-- Column-level on UPDATE too: role/status/the three lifecycle timestamps/
-- display_name are what an owner's membership-management actions touch.
-- profile_id is deliberately excluded — linking an invited row to a real
-- profile at signup-acceptance time is its own careful operation (it has
-- to verify the accepting user's identity matches the invite, which this
-- migration does not implement) and belongs in a future function of its
-- own, the same shape as create_household() below, not a plain owner
-- UPDATE grant that would let an owner attach *any* profile_id to *any*
-- row. household_id and id are never grantable — a membership row never
-- moves to a different household, and its identity never changes.
grant update (role, status, display_name, invited_at, joined_at, archived_at)
  on public.household_members to authenticated;
-- No DELETE grant at all: Migration 1's FK from grocery_items/
-- grocery_item_consumers already makes hard-deleting a *referenced*
-- member impossible, but a client could still have hard-deleted an
-- unreferenced one (a withdrawn invite, a same-second mistake). MVP
-- prefers denying that entirely over building a narrow "only if
-- unreferenced" policy for a case the product doesn't need yet — archive
-- is the only removal path exposed to clients.


-- =============================================================================
-- grocery_items
-- =============================================================================
create policy grocery_items_select_member
  on public.grocery_items for select
  to authenticated
  using (private.is_household_member(household_id, true));

-- Only active members may log a grocery, and only as themselves: the
-- household_member_id_for(household_id) call derives the caller's own
-- membership row from auth.uid() — it is never the value the client sent
-- for created_by_member_id, it's what the client's created_by_member_id
-- is *checked against*. A client claiming to be a different member's id
-- here fails this check outright, regardless of what row they typed into
-- the request body. paid_by_member_id is intentionally unconstrained by
-- this policy — Migration 2's composite FK already guarantees it's a real
-- member of this same household; there is no rule that it must be the
-- caller specifically (paying for someone else's logged item is normal).
create policy grocery_items_insert_active_member
  on public.grocery_items for insert
  to authenticated
  with check (
    private.is_household_member(household_id, false)
    and created_by_member_id = private.household_member_id_for(household_id)
  );

create policy grocery_items_update_creator_or_owner
  on public.grocery_items for update
  to authenticated
  using (private.can_edit_grocery_item(id))
  with check (private.can_edit_grocery_item(id));

create policy grocery_items_delete_creator_or_owner
  on public.grocery_items for delete
  to authenticated
  using (private.can_edit_grocery_item(id));

-- Strips the platform default table-wide grant first — see the identical
-- comment on profiles above for why this is required, not redundant. This
-- one matters most on this table: without it, household_id and
-- created_by_member_id below stay writable via the pre-existing table-wide
-- grant no matter what column list this migration writes, silently
-- defeating the entire point of the column-level UPDATE grant two
-- statements down.
revoke all on public.grocery_items from authenticated;

grant select on public.grocery_items to authenticated;
grant insert (household_id, name, category, amount_minor, quantity, paid_by_member_id, created_by_member_id, notes)
  on public.grocery_items to authenticated;
-- Column-level on UPDATE: household_id and created_by_member_id are
-- excluded from the grantable column set entirely — a plain RLS
-- USING/WITH CHECK pair has no built-in way to compare the row's OLD
-- value of a column against its NEW value in one expression (each clause
-- only ever sees one row version), so "you may edit this row, but never
-- move it to another household or reassign who created it" can't be
-- expressed as a single RLS predicate without extra machinery. A
-- column-level grant is the smaller fix: an UPDATE statement that SETs a
-- column outside this list is rejected by Postgres before RLS is even
-- consulted, no trigger required.
grant update (name, category, amount_minor, quantity, paid_by_member_id, notes)
  on public.grocery_items to authenticated;
grant delete on public.grocery_items to authenticated;


-- =============================================================================
-- grocery_item_consumers
-- =============================================================================
create policy grocery_item_consumers_select_member
  on public.grocery_item_consumers for select
  to authenticated
  using (private.is_household_member(household_id, true));

-- Same creator-or-owner rule as editing the grocery itself — adding or
-- removing a consumer is part of editing the grocery, not a separately
-- gated action. can_edit_grocery_item looks up the *real* household_id
-- for the referenced grocery via grocery_items directly, so a caller
-- cannot bypass this by writing a mismatched household_id here — and even
-- if they tried, Migration 2's composite FK
-- (grocery_item_consumers_grocery_item_id_fkey) already refuses any row
-- whose household_id doesn't match the item's real one, independent of
-- RLS entirely.
create policy grocery_item_consumers_insert_authorized_editor
  on public.grocery_item_consumers for insert
  to authenticated
  with check (private.can_edit_grocery_item(grocery_item_id));

create policy grocery_item_consumers_delete_authorized_editor
  on public.grocery_item_consumers for delete
  to authenticated
  using (private.can_edit_grocery_item(grocery_item_id));

-- Strips the platform default table-wide grant first — see the identical
-- comment on profiles above for why this is required, not redundant.
revoke all on public.grocery_item_consumers from authenticated;

grant select on public.grocery_item_consumers to authenticated;
grant insert (grocery_item_id, household_member_id, household_id) on public.grocery_item_consumers to authenticated;
grant delete on public.grocery_item_consumers to authenticated;
-- No UPDATE grant, and no UPDATE policy: "who shares this item" changing
-- is a client-side delete-the-old-row-plus-insert-the-new-row operation
-- (exactly how the current frontend's MemberChipPicker already replaces
-- its whole selection on every change), not an in-place edit of an
-- existing consumer row. Granting UPDATE here "because the other tables
-- have it" would be CRUD-convention cargo culting, not a real need.


-- =============================================================================
-- anon: no access to any application table, explicitly
-- =============================================================================
-- Nothing above ever mentions anon in a `to` clause or a GRANT — this
-- block exists only to make that omission an explicit, auditable
-- assertion rather than an absence someone has to infer. anon already had
-- no SELECT/INSERT/UPDATE/DELETE on any of these five tables before this
-- migration (Migrations 1-2 never granted any), and nothing here changes
-- that.
revoke all on
  public.profiles,
  public.households,
  public.household_members,
  public.grocery_items,
  public.grocery_item_consumers
from anon;


-- =============================================================================
-- create_household(): the only path a client has to create a household.
-- =============================================================================
-- Public schema (unlike the private.* helpers above) — this is meant to
-- be called directly, via `supabase.rpc('create_household', {...})` once
-- Auth exists. Solves the chicken-and-egg problem named in this task's
-- instructions: a brand-new household has no members yet, so no ordinary
-- RLS-gated INSERT policy on households or household_members can
-- authorize creating its first (owner) row without also being loose
-- enough to let anyone insert *any* household or *any* membership row —
-- exactly the insecure shortcut the task instructions warn against.
-- Instead: no direct INSERT policy exists on households at all (see
-- above), and this SECURITY DEFINER function performs both inserts
-- itself, atomically (one function call, one implicit transaction — if
-- either insert fails, neither commits), deriving the owner exclusively
-- from auth.uid(). The caller supplies a household name and, optionally,
-- a per-household display name; they cannot supply — and this function
-- never reads from its arguments — whose profile becomes the owner.
create or replace function public.create_household(
  p_name text,
  p_currency_code text default 'BDT',
  p_display_name text default null
)
returns table (household_id uuid, owner_member_id uuid)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_caller_id uuid := auth.uid();
  v_household_id uuid;
  v_member_id uuid;
  v_display_name text;
begin
  if v_caller_id is null then
    raise exception 'Not authenticated.';
  end if;

  select coalesce(p_display_name, p.display_name) into v_display_name
  from public.profiles p
  where p.id = v_caller_id;

  if v_display_name is null then
    raise exception 'No profile exists for the current user.';
  end if;

  insert into public.households (name, currency_code, created_by)
  values (p_name, p_currency_code, v_caller_id)
  returning id into v_household_id;

  insert into public.household_members (household_id, profile_id, display_name, role, status, joined_at)
  values (v_household_id, v_caller_id, v_display_name, 'owner', 'active', now())
  returning id into v_member_id;

  return query select v_household_id, v_member_id;
end;
$$;

revoke execute on function public.create_household(text, text, text) from public, anon;
grant execute on function public.create_household(text, text, text) to authenticated;
