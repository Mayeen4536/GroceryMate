-- Migration 1: foundation identity and membership.
--
-- Creates profiles, households, and household_members ONLY — no grocery
-- tables, no RLS policies (RLS is enabled but left policy-free; see the
-- note above each ENABLE ROW LEVEL SECURITY statement below). Schema
-- source: docs/SUPABASE_SCHEMA_DESIGN.md. Where this migration extends or
-- deviates from that document, it's called out inline and summarized in
-- that file's own "Migration 1 implementation notes" section.
--
-- gen_random_uuid() is used directly rather than via pgcrypto/uuid-ossp:
-- it has been a native pg_catalog function since Postgres 13, and
-- Supabase's managed Postgres is well past that version.


-- =============================================================================
-- Reusable trigger: keep `updated_at` current on every UPDATE.
-- =============================================================================
-- A small, generic, single-row trigger — not the kind of cross-row
-- machinery the owner invariant below deliberately avoids. This is
-- standard, low-risk boilerplate reused by all three tables, so it's
-- defined once here rather than three times.
create function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

comment on function public.set_updated_at() is
  'Generic BEFORE UPDATE trigger: sets updated_at = now() on every row update. Attached per-table below.';


-- =============================================================================
-- profiles
-- =============================================================================
-- One row per Supabase Auth user. Never stores a password or any other
-- authentication credential — auth.users already owns that, and Supabase
-- itself manages it; this table only holds the small amount of
-- application-facing profile data GroceryMate actually displays.
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  display_name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is
  'One row per authenticated account, 1:1 with auth.users. No credentials stored here — see auth.users for those.';
comment on column public.profiles.id is
  'Shared primary key with auth.users(id); this is NOT a separate surrogate identity.';

-- Defense-in-depth: auth.users.email is already unique at the auth layer,
-- but the two are only synchronized if something keeps them that way (see
-- the open item on the missing signup trigger, noted in the schema doc's
-- Migration 1 section). Enforcing it here too costs nothing and prevents
-- this table from ever silently drifting into a duplicate-email state on
-- its own.
create unique index profiles_email_key on public.profiles (email);

create trigger set_profiles_updated_at
  before update on public.profiles
  for each row
  execute function public.set_updated_at();

-- Deny-by-default: RLS is turned on here, in the same migration the table
-- is created in, specifically so there is no window — not even between
-- migrations — where this table exists but is unprotected. No policies
-- are added yet (that's Migration 3, on purpose); with RLS enabled and
-- zero policies, Postgres returns zero rows to the `anon`/`authenticated`
-- roles for every operation. (The `service_role` key bypasses RLS by
-- design, same as it always does in Supabase — that's a deployment/key-
-- handling concern, not something this table's RLS state affects; see
-- the schema doc's threat review.)
alter table public.profiles enable row level security;


-- =============================================================================
-- households
-- =============================================================================
create table public.households (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  currency_code text not null default 'BDT'
    check (currency_code in ('BDT', 'USD', 'EUR', 'GBP', 'INR')),
  -- 'active' | 'archived'. Not in the original schema doc's table-by-table
  -- spec (households had no lifecycle column there — see that file's
  -- Migration 1 notes for why this was added here, consistent with the
  -- same active/archived pattern household_members already uses below).
  status text not null default 'active'
    check (status in ('active', 'archived')),
  archived_at timestamptz,
  -- Provenance only ("who created this household"), not a live "current
  -- owner" pointer — ownership is expressed as a role on household_members
  -- (see the owner invariant discussion below), so this column is never
  -- read to answer "who owns this household right now."
  created_by uuid not null references public.profiles (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.households is
  'One row per household. Ownership lives on household_members.role, not a column here — see that table.';
comment on column public.households.created_by is
  'Provenance only. Not "current owner" — a household''s owner is whichever household_members row has role = ''owner''.';

create trigger set_households_updated_at
  before update on public.households
  for each row
  execute function public.set_updated_at();

-- Same reasoning as profiles above: enabled now, policy-free until
-- Migration 3, so household data is never exposed between migrations.
alter table public.households enable row level security;


-- =============================================================================
-- household_members
-- =============================================================================
-- The financial household identity. What grocery_items and
-- grocery_item_consumers will reference in Migration 2 — never `profiles`
-- directly — which is what lets a member with no account participate at
-- all. See docs/SUPABASE_SCHEMA_DESIGN.md §3 for the full reasoning.
create table public.household_members (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  -- Nullable on purpose: null means "no account" — either not yet (an
  -- invited member who hasn't signed up) or not ever (a non-account
  -- participant who will never log in themselves). Never assume NOT NULL
  -- here; that assumption is exactly what would make non-account
  -- participants unrepresentable.
  profile_id uuid references public.profiles (id) on delete set null,
  display_name text not null,
  -- Set only while status = 'invited'; how an accepted invite gets
  -- matched back to the profile that signs up. Not validated as a real
  -- email format at the schema level — that belongs to application input
  -- validation, not a database constraint.
  invited_email text,
  role text not null default 'member'
    check (role in ('owner', 'member')),
  status text not null default 'active'
    check (status in ('active', 'invited', 'archived')),
  invited_at timestamptz,
  joined_at timestamptz,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- An owner performs authenticated actions (invite, manage household
  -- settings); an account-less owner is a contradiction, not an edge case
  -- to support.
  constraint household_members_owner_requires_profile
    check (role <> 'owner' or profile_id is not null),

  -- Lets Migration 2's grocery_items/grocery_item_consumers reference
  -- (id, household_id) together as a composite foreign key — the schema-
  -- level guarantee that a payer or consumer can never belong to a
  -- different household than the grocery item they're attached to. This
  -- unique constraint is what makes that possible; it isn't needed for
  -- anything else on its own; `id` is already unique alone.
  constraint household_members_id_household_id_key unique (id, household_id)
);

comment on table public.household_members is
  'Financial household identity — independent of account identity. Referenced by grocery data, never profiles directly.';
comment on column public.household_members.profile_id is
  'Null = no account (invited-pending-signup, or a permanent non-account participant). Membership never requires an account.';

-- Prevents the same real person (by account) from holding two membership
-- rows in the same household. Deliberately NOT applied to display_name:
-- two account-less members are allowed to share a name (see the schema
-- doc's discussion of src/adapters/memberIdentity.ts, which already has
-- to handle exactly this ambiguity on the current name-keyed frontend).
create unique index household_members_household_profile_key
  on public.household_members (household_id, profile_id)
  where profile_id is not null;

-- --- Owner invariant: what this migration can and cannot enforce -----------
--
-- "A household has exactly one owner" is really two separate rules:
--
--   (a) never MORE than one owner per household — a same-table,
--       cross-ROW constraint. A single-row CHECK constraint cannot express
--       this (CHECK only ever sees the one row being written), but a
--       PARTIAL UNIQUE INDEX can, and that's exactly what this is:
create unique index household_members_one_owner_per_household
  on public.household_members (household_id)
  where role = 'owner';
--
--   (b) never FEWER than one owner per household — an existence
--       invariant ("this household_id must have at least one matching
--       row with role = 'owner' at all times"). No index or CHECK
--       constraint can express "at least one row must exist" — that's a
--       structurally different kind of rule, and the honest way to
--       enforce it across every INSERT/UPDATE/DELETE that could violate
--       it is a deferred constraint trigger evaluated at transaction
--       commit. That's real complexity for a real cross-cutting
--       invariant, not "unnecessary machinery" — but it's also not
--       something to reach for just to claim this box is checked, per
--       this migration's explicit instructions. It is deliberately NOT
--       implemented here.
--
-- What (b) requires instead, until/unless a future migration adds that
-- trigger, is application/RPC discipline:
--   - Creating a household must ALWAYS insert its first household_members
--     row (role = 'owner') in the very same transaction as the households
--     row — e.g. a single Postgres function exposed as an RPC, or an
--     application-level transaction — never a two-step "create household,
--     then separately add an owner" flow that could fail or be
--     interrupted halfway and leave an ownerless household.
--   - Later actions that touch an owner's role or status — reassigning
--     ownership, archiving/removing the current owner, an owner demoting
--     themselves — are not part of this migration (no RLS or role-change
--     logic exists yet) but will need to guarantee a replacement owner is
--     assigned first, whenever that logic is built.
-- Rule (a) above is real, enforced, database-level protection against
-- ever having two owners; rule (b) remains a documented responsibility of
-- whatever writes to this table, not a false guarantee made by this
-- schema.

create trigger set_household_members_updated_at
  before update on public.household_members
  for each row
  execute function public.set_updated_at();

-- Same reasoning as the two tables above: RLS on, no policies yet.
alter table public.household_members enable row level security;

-- Indexes for the lookups RLS policies (Migration 3) and ordinary
-- application queries will both need constantly: "who's in this
-- household" and "which households is this account in." The partial
-- unique index above already accelerates the (household_id, profile_id)
-- pair specifically; these cover the single-column lookups it doesn't.
create index household_members_household_id_idx on public.household_members (household_id);
create index household_members_profile_id_idx on public.household_members (profile_id);
