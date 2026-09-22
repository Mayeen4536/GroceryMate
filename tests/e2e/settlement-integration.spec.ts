import { test, expect } from '@playwright/test'
import { addGrocery, addMember, clearHouseholdGroceries, enterApp } from './helpers'

/**
 * Proves the Settlements and Members pages genuinely run on the real
 * settlement engine now, not hardcoded mock numbers — by building a small,
 * hand-verifiable scenario through the actual UI and checking the exact
 * expected result:
 *
 *   Rice ৳900, paid by Aisha, shared by Aisha, Bilal, Chloe
 *   Chicken ৳600, paid by Bilal, shared by Aisha, Bilal
 *
 *   Aisha consumed ৳600, paid ৳900 → net +৳300 (owed)
 *   Bilal consumed ৳600, paid ৳600 → net ৳0 (settled)
 *   Chloe consumed ৳300, paid ৳0   → net -৳300 (owes)
 *   Settlement: Chloe pays Aisha ৳300
 *
 * Aisha/Bilal/Chloe are added as real members first (a run of this suite
 * gets its own uniquely-named trio, so it never collides with a previous
 * run's leftover rows in the persistent fixture household — see
 * docs/MEMBER_INTEGRATION.md on duplicate names being valid but still
 * something a *test* should avoid to keep its own assertions unambiguous).
 * Groceries start empty for every fresh page load, so this household's
 * balance is driven only by the two items this test adds — this checks
 * user-visible results end to end, not any engine/adapter internals.
 */

test.describe('Settlement reflects the real engine end to end', () => {
  test.beforeEach(({ isMobile }) => {
    test.skip(
      isMobile,
      'this is a calculation-correctness concern, not viewport-dependent; desktop coverage is sufficient',
    )
  })

  test('a manually-verifiable 3-person scenario produces the exact expected settlement', async ({ page }) => {
    // Single-token names (no spaces): both the "Paid by" dropdown (full
    // name) and the sharing chips/JourneyCard (first name only — see
    // src/utils/name.ts's firstName) end up reading the exact same
    // string, so a run's own unique suffix keeps every locator below
    // unambiguous even as the persistent fixture household accumulates
    // rows from earlier runs.
    const runId = Date.now()
    const aisha = `Aisha${runId}`
    const bilal = `Bilal${runId}`
    const chloe = `Chloe${runId}`

    await enterApp(page)
    // Groceries are now really persisted (see docs/GROCERY_INTEGRATION.md)
    // — the shared fixture household accumulates them across every spec
    // that touches groceries at all, so an exact-math test can't rely on
    // "fresh page load == empty grocery list" the way it used to. Requires
    // --workers=1 (see docs/GROCERY_INTEGRATION.md's Playwright section):
    // a concurrent worker adding its own groceries at the same moment
    // could otherwise be wiped out by this exact call.
    await clearHouseholdGroceries(page)
    await addMember(page, aisha)
    await addMember(page, bilal)
    await addMember(page, chloe)

    // Rice: ৳900, paid by Aisha, shared by Aisha/Bilal/Chloe (deselect the
    // fixture owner, who's part of the "everyone" default the sharing
    // picker starts with but isn't part of this scenario).
    await page
      .getByRole('navigation', { name: 'Main' })
      .getByRole('button', { name: 'Groceries', exact: true })
      .click()
    await addGrocery(page, {
      name: 'Rice',
      price: '900',
      paidByName: aisha,
      sharedByNames: [aisha, bilal, chloe],
    })

    // Chicken: ৳600, paid by Bilal, shared by Aisha/Bilal only.
    await addGrocery(page, {
      name: 'Chicken',
      price: '600',
      paidByName: bilal,
      sharedByNames: [aisha, bilal],
    })

    // Members page: each of the three members shows their real, derived numbers.
    await page
      .getByRole('navigation', { name: 'Main' })
      .getByRole('button', { name: 'Members', exact: true })
      .click()
    await expect(page.getByRole('heading', { name: 'Members', exact: true })).toBeVisible()

    const aishaCard = page.getByRole('button', { name: new RegExp(`Open ${aisha}'s profile`) })
    await expect(aishaCard.getByText('House owes')).toBeVisible()
    await expect(aishaCard.getByText('900', { exact: true })).toBeVisible()

    const bilalCard = page.getByRole('button', { name: new RegExp(`Open ${bilal}'s profile`) })
    await expect(bilalCard.getByText('Settled up')).toBeVisible()
    await expect(bilalCard.getByText('600', { exact: true })).toBeVisible()

    const chloeCard = page.getByRole('button', { name: new RegExp(`Open ${chloe}'s profile`) })
    await expect(chloeCard.getByText('Owes the house')).toBeVisible()
    await expect(chloeCard.getByText('0', { exact: true })).toBeVisible()

    // Settlements page: the summary and the single settling transfer both match exactly.
    await page
      .getByRole('navigation', { name: 'Main' })
      .getByRole('button', { name: 'Settlements', exact: true })
      .click()
    await expect(page.getByRole('heading', { name: 'Settlements', exact: true })).toBeVisible()

    await expect(page.getByText('Outstanding across E2E Fixture Household')).toBeVisible()
    await expect(page.getByText('৳300', { exact: true }).first()).toBeVisible()

    // Exactly one settling transfer — Bilal, being settled, appears in neither
    // list. Scoped by the one element unique to a JourneyCard ("Mark as
    // paid") rather than DOM-structure traversal, so it stays resilient to
    // any unrelated markup change around it.
    await expect(page.getByRole('button', { name: 'Mark as paid' })).toHaveCount(1)
    const journeyCard = page.locator('li').filter({ has: page.getByRole('button', { name: 'Mark as paid' }) })
    await expect(journeyCard.getByText(chloe)).toBeVisible()
    await expect(journeyCard.getByText(aisha)).toBeVisible()
    await expect(journeyCard.getByText('৳300')).toBeVisible()
  })
})
