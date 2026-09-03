-- Migration 2: grocery persistence.
--
-- Creates grocery_items and grocery_item_consumers ONLY — no RLS policies
-- (RLS is enabled but left policy-free, same reasoning as Migration 1: see
-- the note above each ENABLE ROW LEVEL SECURITY statement below), no
-- payments, no history/session tables, no Auth, no application code.
-- Schema source: docs/SUPABASE_SCHEMA_DESIGN.md. Does NOT modify Migration
-- 1's already-applied file; reuses its set_updated_at() trigger function
-- rather than redefining it. Where this migration extends or deviates
-- from the schema doc, it's called out inline and summarized in that
-- file's own "Migration 2 implementation notes" section.


-- =============================================================================
-- grocery_items
-- =============================================================================
-- One purchased line item. Financial references use stable
-- household_member ids exclusively — never a display name — via the same
-- composite-FK pattern Migration 1 established for exactly this reason.
create table public.grocery_items (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  name text not null,
  category text not null default 'pantry'
    check (category in ('produce', 'dairy', 'bakery', 'pantry', 'beverages', 'household')),
  -- The line's TOTAL cost, already final — not a unit price to be
  -- multiplied by `quantity` at read time. See docs/SUPABASE_SCHEMA_DESIGN.md
  -- §5 for why this is a deliberate simplification versus the in-memory
  -- domain model's unitPrice x quantity, and this migration's own notes
  -- section for why the check here is `>= 0`, not `> 0`.
  amount_minor integer not null check (amount_minor >= 0),
  -- Informational only — never re-multiplied into amount_minor. A
  -- household member reading a grocery card still wants to see "x 2".
  quantity integer not null default 1 check (quantity > 0),
  -- Who actually paid. Composite FK below guarantees they're a member of
  -- THIS item's household, not merely a member of some household.
  paid_by_member_id uuid not null,
  -- Who logged the entry — independent of who paid (someone can log an
  -- expense on another member's behalf). Same composite-FK guarantee.
  created_by_member_id uuid not null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Enables grocery_item_consumers' own composite FK (below) to confirm a
  -- consumer row's claimed household_id genuinely matches this item's
  -- real household — not just that the referenced member belongs to
  -- *some* household matching the claim. `id` is already unique alone
  -- (it's the primary key); this additional constraint is what makes the
  -- pairing usable as a composite FK target.
  constraint grocery_items_id_household_id_key unique (id, household_id),

  constraint grocery_items_paid_by_member_id_fkey
    foreign key (paid_by_member_id, household_id) references public.household_members (id, household_id),

  constraint grocery_items_created_by_member_id_fkey
    foreign key (created_by_member_id, household_id) references public.household_members (id, household_id)
);

comment on table public.grocery_items is
  'One purchased line item. amount_minor is the line''s final total, not a unit price — see column comment.';
comment on column public.grocery_items.amount_minor is
  'Integer minor units (paisa for BDT), already the line total. Currency is not repeated here — it lives on households (one currency per household for this MVP).';
comment on column public.grocery_items.paid_by_member_id is
  'Who actually paid — may differ from created_by_member_id. Composite FK guarantees same-household as this item.';
comment on column public.grocery_items.created_by_member_id is
  'Who logged this entry — may differ from paid_by_member_id. Composite FK guarantees same-household as this item.';

-- No FK-driven cascade/restrict clause is written for either member
-- reference above: Postgres's default (NO ACTION) is exactly the desired
-- behavior — a household_members row cannot be hard-deleted while any
-- grocery_items row still points to it as payer or creator. See this
-- migration's notes section for the full delete/archive discussion.

create trigger set_grocery_items_updated_at
  before update on public.grocery_items
  for each row
  -- Reusing Migration 1's function, not redefining it — same trigger
  -- mechanics, one implementation.
  execute function public.set_updated_at();

-- Two indexes, not three: household_id and created_at are combined into
-- one composite index because every realistic query needs both together
-- ("this household's groceries, newest first") — a household_id-only
-- index would serve the filter but not the sort, so the composite index
-- replaces rather than supplements it.
create index grocery_items_household_id_created_at_idx
  on public.grocery_items (household_id, created_at desc);

-- A member's own "total paid" is a real, frequent lookup (it's what the
-- settlement engine's per-member spentMinorUnits is ultimately built
-- from) — worth its own index rather than relying on a table scan.
create index grocery_items_paid_by_member_id_idx
  on public.grocery_items (paid_by_member_id);

-- Deliberately no index on created_by_member_id: nothing in the current
-- product queries "everything I logged" (Step 14's open question #2 in
-- the schema doc already established that editing/deleting isn't even
-- restricted to the logger) — the column exists for data completeness,
-- not because a lookup pattern needs it yet. Add one if that changes.

-- Deny-by-default from the moment this table exists — not deferred to
-- Migration 3 alongside its policies, for the same reason Migration 1's
-- three tables were enabled immediately: no window where grocery data
-- exists but is unprotected. No policies are added here.
alter table public.grocery_items enable row level security;


-- =============================================================================
-- grocery_item_consumers
-- =============================================================================
-- Who shares a grocery item's cost. A pure relation table — no surrogate
-- id, no updated_at (a consumer relationship is added or removed, never
-- "edited" in place, so there is nothing for an updated_at column to
-- track — see this migration's notes section).
create table public.grocery_item_consumers (
  grocery_item_id uuid not null,
  household_member_id uuid not null,
  -- Denormalized rather than derived via a join through grocery_item_id
  -- every time: it's what lets both composite FKs below exist as plain
  -- schema constraints instead of a trigger. Set once at insert and never
  -- updated — grocery items don't move between households (households
  -- themselves are never reassigned once created).
  household_id uuid not null,
  created_at timestamptz not null default now(),

  -- Same member cannot be listed twice as a consumer of the same item.
  primary key (grocery_item_id, household_member_id),

  -- Confirms the referenced grocery item exists AND that this row's
  -- claimed household_id genuinely matches that item's real household —
  -- not just that household_id is well-formed on its own. This is the
  -- half of cross-household protection a plain `grocery_item_id
  -- references grocery_items(id)` FK alone could not provide (that FK
  -- would still let someone attach a real item to a mismatched
  -- household_id here). ON DELETE CASCADE: deleting a grocery item takes
  -- its consumer rows with it — they have no independent meaning once
  -- the item they describe is gone.
  constraint grocery_item_consumers_grocery_item_id_fkey
    foreign key (grocery_item_id, household_id)
    references public.grocery_items (id, household_id)
    on delete cascade,

  -- Confirms the referenced member exists AND genuinely belongs to the
  -- same household_id claimed above — the other half of cross-household
  -- protection, and the same guarantee Migration 1 already relies on
  -- elsewhere. No ON DELETE clause (defaults to NO ACTION): a
  -- household_members row cannot be hard-deleted while still listed as a
  -- consumer anywhere, exactly like the payer/creator references above.
  constraint grocery_item_consumers_household_member_id_fkey
    foreign key (household_member_id, household_id)
    references public.household_members (id, household_id)
);

comment on table public.grocery_item_consumers is
  'Who shares a grocery item''s cost. Consumer identity is always a household_member id — never a display name.';
comment on column public.grocery_item_consumers.household_id is
  'Denormalized from grocery_items.household_id, set once at insert. Exists so both composite FKs above can be plain schema constraints instead of a trigger.';

-- Lookup by grocery_item_id is already efficient via the composite
-- primary key above (it's the leading column) — no separate index needed.
-- Lookup by household_member_id is NOT covered by that same index (it's
-- the trailing column), and is exactly what reconstructing a member's
-- consumed total needs — see this migration's engine-reconstruction demo.
create index grocery_item_consumers_household_member_id_idx
  on public.grocery_item_consumers (household_member_id);

-- No index on household_id alone: nothing queries this table by
-- household_id directly — every real access path goes through either
-- grocery_item_id or household_member_id, both already covered above.

alter table public.grocery_item_consumers enable row level security;
