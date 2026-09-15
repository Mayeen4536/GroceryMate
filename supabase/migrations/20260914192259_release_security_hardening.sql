-- Migration 5: release security hardening (Frontend/Backend Slice 6).
--
-- Two narrowly-scoped fixes, surfaced by Supabase's hosted security
-- advisor against grocerymate-dev ahead of the app's first real
-- deployment. See docs/RELEASE_SECURITY.md for the full audit trail —
-- including what was inspected and found to already be correct
-- (create_household(), leaked-password-protection is a dashboard/Auth
-- config item, not SQL) and is therefore NOT touched here. No RLS
-- policies, no tables, no application-facing behavior changes.


-- =============================================================================
-- 1. public.rls_auto_enable() — Supabase platform housekeeping, not ours
-- =============================================================================
-- This function is not defined in any of GroceryMate's own migrations —
-- it is absent from a fresh `supabase start` local database (confirmed:
-- `supabase db reset` produces no such function). It exists only on the
-- hosted project, provisioned by Supabase's own platform tooling and
-- wired to a real `ensure_rls` event trigger (fires on `ddl_command_end`)
-- that auto-enables RLS on any newly created public-schema table — a
-- Supabase safety net, unrelated to any GroceryMate schema or app code.
--
-- Its RETURN TYPE is `event_trigger`, which Postgres will only ever
-- invoke through the event-trigger dispatch mechanism itself: the body
-- calls `pg_event_trigger_ddl_commands()`, which raises an error when
-- called outside a live DDL event-trigger context. A direct call — e.g.
-- via `/rest/v1/rpc/rls_auto_enable`, the exact path the advisor flagged
-- as reachable by `anon`/`authenticated` — fails immediately with that
-- error. There is therefore no exploitable path through the EXECUTE
-- grants the advisor found; the underlying SECURITY DEFINER + broad
-- grant combination looks worse on paper than it is in practice.
--
-- GroceryMate's application code never calls this function and has no
-- legitimate reason to — its only real "caller" is Postgres's own event-
-- trigger manager, which does not need EXECUTE privilege the way an
-- ordinary SQL/RPC caller would. Per least privilege, the grants are
-- revoked anyway. Guarded with an existence check because the function
-- does not exist locally (nothing to revoke from on a fresh
-- `supabase db reset`) and this migration must be a harmless no-op there.
do $$
begin
  if exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'rls_auto_enable'
  ) then
    revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
  end if;
end;
$$;


-- =============================================================================
-- 2. public.set_updated_at() — pin search_path
-- =============================================================================
-- Already SECURITY INVOKER (the default — Migration 1 never added a
-- DEFINER clause, and none is needed: this trigger only ever needs the
-- calling statement's own privileges to write NEW.updated_at). Its only
-- advisor finding was a mutable search_path. The body calls only now()
-- (a pg_catalog built-in) and reads/writes NEW (a trigger-context
-- pseudo-variable, not schema-resolved) — nothing here needs `public` on
-- the search path at all, so pinning it to pg_catalog alone is both safe
-- and sufficient; SECURITY DEFINER was never introduced and still isn't.
--
-- ALTER FUNCTION ... SET touches only the function's configuration, not
-- its body, its OID, or any attached trigger — every existing
-- set_..._updated_at trigger (profiles, households, household_members,
-- grocery_items) keeps firing exactly as before.
alter function public.set_updated_at() set search_path = pg_catalog;


-- =============================================================================
-- Accepted-by-design, not modified here (see docs/RELEASE_SECURITY.md)
-- =============================================================================
-- public.create_household(): SECURITY DEFINER + authenticated-executable
-- is intentional — it's the one path a client has to atomically create a
-- household AND its owner membership row, deriving the owner exclusively
-- from auth.uid() (never a caller-supplied argument), with search_path
-- already pinned to '' since Migration 3. Re-verified, not re-written.
--
-- Leaked password protection: an Auth/dashboard configuration setting,
-- not a schema object — nothing to migrate here. See
-- docs/RELEASE_SECURITY.md for the current state and how to enable it.
