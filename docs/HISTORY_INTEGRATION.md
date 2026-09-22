# Frontend Release-Readiness — Slice 5: Real History + Removing Misleading Mock Financial Data

Builds on `docs/AUTH_INTEGRATION.md` (Slice 1), `docs/HOUSEHOLD_INTEGRATION.md`
(Slice 2), `docs/MEMBER_INTEGRATION.md` (Slice 3), and `docs/GROCERY_INTEGRATION.md`
(Slice 4). This slice does not add any new persistence — it stops the
authenticated application from presenting fabricated financial/history data
as if it belonged to the signed-in household, using the real, persisted
grocery log (`grocery_items`) that Slice 4 already made real.

No migrations, no RLS changes, no payments, no receipt scanning, no
redesign. Every change here is either: (a) deriving a real value from
already-loaded `groceries`/`members` instead of a mock constant, or (b)
replacing a fabricated UI state with an honest one.

## Why there's no "shopping session" concept

The schema has no session/trip grouping column — `grocery_items` rows are
flat and independent (see `docs/SUPABASE_SCHEMA_DESIGN.md`). The old
History/Analytics UI assumed sessions because the mock data was shaped that
way, not because the domain has them. Rather than fabricate a grouping that
doesn't exist, History is now **one entry per real grocery**, chronologically
ordered and grouped by real calendar month. This is a deliberate scope
decision, not a placeholder for a future "sessions" feature — if session
grouping is ever wanted, it needs a real schema concept first.

## Architecture

```
App.tsx
  const groceries = useGroceries()     Slice 4, unchanged
  const members = useMembers()         Slice 3, unchanged
  ...same groceries.items/members.members now also threaded into
     HistoryPage, AnalyticsPage, and SettingsPage (previously only
     Groceries/Members/Settlements/Assistant received them)

useHistory(groceries, members)         rewritten — real entries, no fake sessions
  └─ buildHistoryEntries()             src/features/history/buildHistoryEntries.ts — new, pure mapping
useAnalytics(groceries, members)       rewritten — same aggregation logic, real + id-keyed inputs
useSettlements(transfers)              timeline now starts empty, not seeded
exportAllData(...)                     src/services/settingsExportService.ts — real data only
```

No new hooks own new state; History/Analytics/Export all consume the exact
same `groceries`/`members` arrays `App.tsx` already loads once — never a
second query, never a second financial source of truth.

## Real grocery history

- `src/types/grocery.ts`'s `GroceryItem` gained `createdAt: string` (ISO,
  `grocery_items.created_at`); `src/groceries/types.ts`'s `mapGroceryItemRow`
  now sets it.
- `src/types/history.ts` was rewritten: the old `HistorySession`/`HistoryItem`/
  `HistoryPayment`/`SessionStatus`/`SettlementStatus` types are gone,
  replaced by a single `GroceryHistoryEntry` — one real grocery, reshaped for
  display (real amount, category, payer/sharer names resolved from real
  ids, real date labels).
- `src/features/history/buildHistoryEntries.ts` maps `(groceries, members)`
  straight to `GroceryHistoryEntry[]`, preserving whatever order `groceries`
  already arrives in (newest-first, per Slice 4's load order) — it never
  re-sorts and never groups multiple groceries into one entry.
- `src/hooks/useHistory.ts` now takes `(groceries, members)` and owns only
  search/month-filter/preview-drawer state. The old settled/pending status
  filter is gone — an individual grocery has no truthful per-item settlement
  state of its own (that's a household-wide concept, already shown for real
  on Settlements).
- `src/features/history/HistoryCard.tsx` and `HistoryPreviewDrawer.tsx` were
  rewritten around `GroceryHistoryEntry`: a real category badge instead of
  the old fabricated settlement-status badge, real payer/sharer names, real
  amount, real notes.
- `src/services/historyExportService.ts`'s `exportEntry`/`exportEntries`
  export real entries as plain text (replacing `exportSession`/`exportSessions`).

### Identity

History (and Analytics, and Export) key everything by the real, stable
`household_members.id` — never by display name. `src/members/resolveMemberName.ts`
(`buildMemberNameResolver`, extracted from `GroceriesPage`'s own inline
resolver so the same archived-inclusion + "Unknown member" fallback behavior
can't drift between features) is the single shared name-resolution path for
Groceries, History, Analytics, and Export. Two members who share a display
name never merge — see the "never merges two different members who happen
to share a display name" tests in `buildHistoryEntries.test.ts` and
`useAnalytics.test.ts`. An archived member's historical groceries still
resolve to their real name; a truly orphaned id falls back to
"Unknown member" rather than a blank or a guess.

### Real history states

No history, one entry, many entries, an archived member's name still
resolving, a deleted grocery no longer appearing (the same optimistic-delete
undo window Slice 4 built — History never shows an item still inside that
window, since it reads the same `groceries` state Groceries does), long
names/large values/decimal money (all pass through untouched, same as
Groceries), and loading/query-failure (see below) are all handled without
fabricating a fallback.

## Analytics truthfulness

`src/hooks/useAnalytics.ts` keeps its existing aggregation _shapes_
(`MonthlySpend`, `TopGroceryItem`, `CategorySpend`, `MemberSpend`,
`MemberPersonalShared`, `AnalyticsSummary`) — the charts didn't need to
change — but every value is now derived from real `groceries`/`members`:

- Monthly spend groups by the real `createdAt` (via new `src/utils/date.ts`
  UTC-based helpers — `monthKey` for a stable sort/group key, `monthYearLabel`
  for display), not a fabricated `sortKey`/`monthLabel`.
- Member contribution and personal/shared split are keyed by the real
  `paidByMemberId`/`sharedByMemberIds` — **this fixes a real bug**: the old
  version keyed by `member.name`, so two members sharing a display name
  would have silently merged into one bar.
- Category breakdown and top-groceries-by-name logic are unchanged in shape,
  just fed real data.
- An empty `groceries` array naturally produces empty chart data and a
  `summary` whose `topCategory`/`topSpender` are `null` — this is the
  "smallest truthful solution" the task asked for: no chart was hidden or
  disabled, because every one of them was already honestly derivable from
  real data once fed real inputs.

`AnalyticsPage.tsx` shows an honest empty state ("Nothing to analyze yet.")
when there are no real groceries yet, instead of ever rendering charts built
from nothing.

## Settlement timeline

`src/hooks/useSettlements.ts`'s `timeline` now starts as `[]` instead of the
old hand-written `initialTimeline` (deleted along with `src/store/settlements.ts`).
Every entry the timeline can ever hold is a real "Mark as paid" dismissal
from the current browser session (unchanged from before — still not
persisted; recording a real payment event is a new domain concept out of
scope for this slice). `Timeline.tsx` shows "No recorded payments yet."
when empty, rather than ever rendering a fabricated feed. `TimelineKind` was
trimmed from `'payment' | 'session' | 'square'` to just `'payment'` — the
other two kinds were leftover from the deleted mock feed and had become
unreachable dead code.

## Export truthfulness

`src/services/settingsExportService.ts`'s `exportAllData` now takes the real
household id/name (from `useHousehold()`), real `members`/`groceries`
(threaded into `SettingsPage` from `App.tsx`, same as every other page),
real settlement transfers (from `useSettlementResult`'s view model), and
reuses `buildHistoryEntries` for the history section — no second history
implementation. Included: household name, members, groceries, pending
settlement transfers, grocery history. Excluded (documented in the file's
own doc comment): appearance/notification preferences (device-local, not
household data) and the settlement payment timeline (nothing persisted
exists yet for it). An empty section reports itself honestly ("No members
yet.", "No groceries logged yet.", "Everyone is settled up.", "No history
yet.") rather than a blank or fabricated row.

## Dashboard/overview and Members-page truthfulness

Auditing every authenticated screen for anything that could make a real
user believe fake data belongs to their household (the task's STEP 14)
surfaced several issues **outside** History/Analytics/Settlements/Export
that were still showing literal placeholder text to every real user,
regardless of their actual household. Fixed as narrow, specific corrections
(no redesign):

- `SummaryCard.tsx` (Settlements) hardcoded **"Outstanding across Flat 4B"**
  — now `Outstanding across {household?.name}` via `useHousehold()`.
- `MemberProfileDrawer.tsx`'s "Recent activity" list was **entirely
  fabricated** (`"{name} added Milk (2L)"`, `"Settled up with Aisha"`,
  `"Joined Flat 4B"`) for every member, always the same three lines
  regardless of what that member actually did. Replaced with real activity
  derived from `groceries` filtered by `createdByMemberId` (the member's own
  most recent real grocery additions) plus a real "Joined `<household name>`"
  line; the fabricated "settled up" line was dropped entirely — there is no
  persisted payment-event history yet, same limitation as the Settlements
  timeline above, so nothing was invented to replace it.
- `MembersPage.tsx`'s `withRealFinancials` previously left `itemsAdded` at
  its placeholder `0` with a comment claiming `GroceryItem` had "no concept
  of who added it" — stale: Slice 4 added `createdByMemberId` specifically
  for this. `itemsAdded` is now a real count
  (`groceries.filter(item => item.createdByMemberId === member.id).length`),
  computed independently of whether the settlement calculation itself
  succeeded.
- `MemberCard.tsx`/`MemberProfileDrawer.tsx` labeled the member's real,
  all-time `amountPaid` total as **"Paid this month"** — there is no
  month-scoping anywhere in the calculation, so the label was inaccurate
  regardless of mock data. Relabeled "Total paid".
- `config/navigation.ts`'s History nav item description still said "Past
  grocery sessions, saved for reference." — updated to match the real,
  per-item model.

Everything else on the dashboard/overview (Sidebar, TopBar) was already
confirmed real in earlier slices; no changes were needed there.

## Files created

- `src/utils/date.ts` — UTC-based date formatting for a persisted ISO
  timestamp (`monthKey`, `dayOfMonth`, `monthShort`, `fullDateLabel`,
  `monthYearLabel`), matching the UTC convention `src/members/types.ts`
  already established for lifecycle labels.
- `src/members/resolveMemberName.ts` — `buildMemberNameResolver`, shared by
  Groceries/History/Analytics/Export.
- `src/features/history/buildHistoryEntries.ts`,
  `src/features/history/buildHistoryEntries.test.ts`
- `src/hooks/useAnalytics.test.ts`, `src/hooks/useSettlements.test.ts`
- `src/services/settingsExportService.test.ts`, `src/services/historyExportService.test.ts`
- `tests/e2e/history-analytics-truthfulness.spec.ts`
- `docs/HISTORY_INTEGRATION.md` — this file.

## Files modified (non-exhaustive; see git diff for the full list)

`src/types/{grocery,history,settlement}.ts`, `src/groceries/types.ts`,
`src/hooks/{useHistory,useAnalytics,useSettlements,useSettings}.ts`,
`src/features/history/{HistoryPage,HistoryCard,HistoryPreviewDrawer}.tsx`,
`src/features/analytics/AnalyticsPage.tsx`,
`src/features/settlements/{Timeline,SummaryCard}.tsx`,
`src/features/settings/SettingsPage.tsx`,
`src/features/members/{MembersPage,MemberCard,MemberProfileDrawer}.tsx`,
`src/services/settingsExportService.ts`, `src/config/navigation.ts`,
`src/App.tsx` (`/history`, `/analytics`, `/settings` routes now receive
`groceries`/`members`, matching the other four routes).

## Files deleted

`src/store/{history,members,groceries,settlements}.ts` (mock seed data, no
longer imported anywhere), `src/constants/historyStatus.ts` (status/badge
metadata for the deleted session model).

## What remains mock or unavailable

- **Household invite-by-link** (`AddMemberDialog.tsx`): the "Household
  link" shown to a real owner is a hardcoded, non-functional URL
  (`grocerymate.app/join/flat-4b`) — copying and sharing it would not
  actually work. This is a deeper feature-completeness gap (there is no
  real backend-issued invite-link mechanism to wire it to, only the
  separate real email-invite path via `onInvite`), so implementing it is
  out of this slice's scope and flagged here for a future slice. The
  accompanying text ("Anyone with the link can join `<household name>`.")
  was still hardcoded to the old mock household name ("Flat 4B") — found
  during the hosted release-truth pass — and _was_ fixed (real
  `useHousehold()` name), since that part is the same narrow,
  already-established household-identity fix applied everywhere else in
  this slice. Only the link's own non-functionality remains a known gap.
- **Settlement payment timeline** and **Member "Recent activity"** both
  remain session-local/limited, as described above — both are honest about
  it (empty state / real-only entries) rather than fabricated, but neither
  is a persisted history yet.
- **Landing/pre-auth decorative content** (`HeroMockup.tsx`, `HowItWorks.tsx`,
  `src/store/household.ts`'s `mockHousehold`/`mockMembers`,
  `SettlementFlow.tsx`) is unchanged — pre-auth, clearly a product demo,
  never reachable by a signed-in user's real data.

## Next release seam

Real per-item history exists now; a real "shopping session" or "trip"
grouping, if wanted later, needs an actual schema concept (a session table
or a nullable grouping column on `grocery_items`) before the UI should ever
group entries again. Similarly, a real settlement payment-timeline needs a
persisted "payment recorded" domain event — Mark-as-paid is deliberately
still local-only pending that.
