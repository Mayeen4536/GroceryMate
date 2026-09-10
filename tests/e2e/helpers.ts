import { expect, type Page } from '@playwright/test'

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
  // Groceries are session-local state (see src/hooks/useGroceries.ts) — a
  // freshly loaded household always starts with an empty list, so unlike
  // before this can no longer assume a populated one. The heading also
  // renders before the staggered item list finishes animating in, so a
  // caller that immediately reads existing items still needs to wait for
  // real content rather than race that entrance animation — waiting for
  // either real outcome (populated or genuinely empty) covers both.
  await expect(
    page.getByText('Your first grocery starts here.').or(page.locator('main li').first()),
  ).toBeVisible()
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
