-- Migration 6: profiles RLS initplan optimization (Slice 6 follow-up).
--
-- Resolves the two remaining `auth_rls_initplan` performance advisor
-- findings from Migration 5's release-security-hardening pass (see
-- docs/RELEASE_SECURITY.md's "profiles RLS initplan" section, which
-- classified this as FIX BEFORE BETA and deliberately deferred it out of
-- that security-only migration). Nothing else changes: same two policies,
-- same commands, same roles, same authorization outcome — only how
-- auth.uid() is written inside their USING/WITH CHECK expressions.
--
-- Bare `auth.uid()` inside a row-security qual gets evaluated once per
-- candidate row during the scan — Postgres has no reason to assume a
-- STABLE function call embedded directly in the qual is safe to hoist
-- out of the per-row check on its own. Wrapping it as an
-- uncorrelated scalar subquery, `(select auth.uid())`, changes nothing
-- about what value is produced (auth.uid() depends only on the current
-- session's JWT, never on the row being checked), but gives the planner
-- an explicit signal it recognizes: a subquery with no reference to the
-- outer row can be computed once, as an InitPlan, before the row scan
-- begins, and its cached result reused for every row instead of being
-- recomputed per row. Same authorization meaning, evaluated once instead
-- of N times per query. This is the exact rewrite Supabase's own RLS
-- performance guidance recommends
-- (https://supabase.com/docs/guides/database/postgres/row-level-security#call-functions-with-select).
--
-- ALTER POLICY, not DROP + CREATE: preserves the policy's identity (OID),
-- touches only the clauses given below, and leaves the `to authenticated`
-- role list, the command each policy applies to, and every other policy
-- on this table (or any other table) completely untouched.

alter policy profiles_select_own on public.profiles
  using (id = (select auth.uid()));

alter policy profiles_update_own on public.profiles
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));
