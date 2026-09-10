import { readFileSync } from 'node:fs'
import { expect, type Page } from '@playwright/test'

const envText = readFileSync(new URL('../../.env.local', import.meta.url), 'utf8')
const SUPABASE_URL = envText.match(/VITE_SUPABASE_URL=(.*)/)?.[1]?.trim()
const PUBLISHABLE_KEY = envText.match(/VITE_SUPABASE_PUBLISHABLE_KEY=(.*)/)?.[1]?.trim()

/**
 * The one real member every fresh run of the fixture household starts
 * with — its owner, created alongside the household itself during
 * global-setup.ts's sign-up. Kept here (rather than imported from
 * global-setup.ts, which is a one-shot script, not a module meant for
 * specs to import) for specs that need a real, always-present member to
 * act as a grocery's payer/sharer.
 */
export const FIXTURE_OWNER_NAME = 'E2E Fixture'
/** `MemberChipPicker` labels its chips by first name only. */
export const FIXTURE_OWNER_FIRST_NAME = 'E2E'

/**
 * Passes the Landing gate and lands on the default Groceries page. Nearly
 * every spec needs to be inside the app rather than on Landing, so this is
 * shared rather than repeated in every file.
 */
export async function enterApp(page: Page) {
  await page.goto('/')
  await page.getByRole('button', { name: 'Start splitting fairly' }).click()
  await expect(page.getByRole('heading', { name: 'Groceries', exact: true })).toBeVisible()
  // Groceries are real, persisted data now (see src/groceries/), so the
  // fixture household's list only grows across runs — this can't assume
  // either outcome. The heading also renders before the staggered item
  // list finishes animating in, so a caller that immediately reads
  // existing items still needs to wait for real content rather than race
  // that entrance animation — waiting for either real outcome (populated
  // or genuinely empty) covers both.
  await expect(
    page.getByText('Your first grocery starts here.').or(page.locator('main li').first()),
  ).toBeVisible()
}

/**
 * Wipes every persisted grocery (and, via cascade, its consumers) from the
 * *current* household — used only as test setup, before a spec that needs
 * exact settlement math and so can't tolerate whatever accumulated from
 * earlier runs sharing the same fixture household. Issues a real,
 * RLS-gated REST call using the already-signed-in browser session's own
 * JWT (read out of localStorage) plus the anon/publishable key — never
 * service_role, exactly the same access the app's own UI already has.
 * Assumes `enterApp` has already run (a session must exist to read).
 */
export async function clearHouseholdGroceries(page: Page) {
  if (!SUPABASE_URL || !PUBLISHABLE_KEY) {
    throw new Error('clearHouseholdGroceries: could not read VITE_SUPABASE_URL/VITE_SUPABASE_PUBLISHABLE_KEY from .env.local')
  }
  const token = await page.evaluate(() => {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key?.startsWith('sb-') && key.endsWith('-auth-token')) {
        const raw = localStorage.getItem(key)
        if (!raw) return null
        return (JSON.parse(raw) as { access_token?: string }).access_token ?? null
      }
    }
    return null
  })
  if (!token) throw new Error('clearHouseholdGroceries: no signed-in session found')

  const headers = { apikey: PUBLISHABLE_KEY, Authorization: `Bearer ${token}` }
  const householdsRes = await fetch(`${SUPABASE_URL}/rest/v1/households?select=id`, { headers })
  const households = (await householdsRes.json()) as { id: string }[]
  const householdId = households[0]?.id
  if (!householdId) throw new Error('clearHouseholdGroceries: no household found for the current session')

  const deleteRes = await fetch(`${SUPABASE_URL}/rest/v1/grocery_items?household_id=eq.${householdId}`, {
    method: 'DELETE',
    headers,
  })
  if (!deleteRes.ok) {
    throw new Error(`clearHouseholdGroceries: delete failed with status ${deleteRes.status}`)
  }
}

/**
 * Adds one grocery through the real Add Grocery form — the only supported
 * way to get session-local grocery state into a test, now that nothing
 * seeds it automatically. Assumes the Groceries page is already showing
 * (call `enterApp` first). `sharedByNames` takes each member's *first*
 * name, matching `MemberChipPicker`'s chip label; every name given must
 * match exactly one current, selectable member.
 */
export async function addGrocery(
  page: Page,
  options: { name: string; price: string; paidByName: string; sharedByNames: string[] },
) {
  // The floating "Add grocery" FAB is present regardless of whether the
  // list is empty or populated (only the empty state's own centered CTA
  // differs), so it's the one reliable way to open the form either way.
  await page.getByRole('button', { name: 'Add grocery', exact: true }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByLabel('Grocery name').fill(options.name)
  await dialog.getByLabel('Price').fill(options.price)
  await dialog.getByRole('combobox', { name: 'Paid by' }).click()
  await dialog.getByRole('option', { name: options.paidByName }).click()
  // Everyone is selected by default; clear down to none, then select
  // exactly the requested names, so the result never depends on how many
  // members happened to exist when this ran.
  await dialog.getByRole('button', { name: 'Clear' }).click()
  for (const name of options.sharedByNames) {
    // A plain (non-regex) name performs a substring match, which is what's
    // needed here: a chip's accessible name is its Avatar's full-name
    // aria-label followed by its own first-name text (e.g. "Zara123 Zara123"
    // or "E2E Fixture E2E"), never just the bare first name on its own.
    await dialog.getByRole('button', { name }).click()
  }
  await dialog.getByRole('button', { name: 'Add grocery', exact: true }).click()
  await expect(dialog).not.toBeVisible()
}

/**
 * Adds one real, no-account household member through the Members page's
 * "Add member" flow (owner-only — see docs/MEMBER_INTEGRATION.md), and
 * waits for their card to actually appear before returning. Prefer a
 * unique `name` per call (e.g. include the test's own title or a
 * timestamp): the fixture household's roster persists across runs, so a
 * fixed name would eventually collide with a leftover row from an earlier
 * run and make `getByRole('button', { name: /Open …/ })` ambiguous.
 */
export async function addMember(page: Page, name: string) {
  await page.getByRole('navigation', { name: 'Main' }).getByRole('button', { name: 'Members', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Members', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Add member' }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByLabel('Name').fill(name)
  await dialog.getByRole('button', { name: 'Add member' }).click()
  await expect(dialog).not.toBeVisible()
  await expect(page.getByRole('button', { name: new RegExp(`Open ${name}'s profile`) })).toBeVisible()
}

/**
 * Archives a real household member through the Members page's own
 * "Remove from household" flow (archive, never a hard delete — see
 * docs/MEMBER_INTEGRATION.md). Assumes the member's card is already
 * reachable (real, current name) and that the caller is the household
 * owner (archive is owner-only).
 */
export async function archiveMember(page: Page, name: string) {
  await page.getByRole('navigation', { name: 'Main' }).getByRole('button', { name: 'Members', exact: true }).click()
  await page.getByRole('button', { name: new RegExp(`Open ${name}'s profile`) }).click()
  const drawer = page.getByRole('dialog', { name: 'Member profile' })
  await drawer.getByRole('button', { name: 'Remove from household' }).click()
  await page.getByRole('button', { name: 'Yes, remove them' }).click()
  // A successful archive closes the drawer (useMembers.handleRemove clears
  // the open profile on success) — the confirmation is the member's own
  // card now showing the Archived badge, not anything still inside the drawer.
  await expect(drawer).not.toBeVisible()
  await expect(
    page.locator('main li').filter({ hasText: name }).filter({ hasText: 'Archived' }),
  ).toBeVisible()
}

/**
 * From inside the app, navigates to Assistant and runs its (fully mocked,
 * local) generate flow through to the review screen. Shared because both
 * the mobile-nav-clearance and Assistant-review specs need this same setup.
 */
export async function generateAssistantGroceries(page: Page, prompt: string) {
  await page.getByRole('navigation', { name: 'Main' }).getByRole('button', { name: 'Assistant', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'AI Assistant', exact: true })).toBeVisible()
  await page.getByLabel('Describe what your household needs').fill(prompt)
  await page.getByRole('button', { name: 'Generate' }).click()
  await expect(page.getByText('Your groceries are ready')).toBeVisible({ timeout: 8000 })
}
