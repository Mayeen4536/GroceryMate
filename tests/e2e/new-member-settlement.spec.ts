import { test, expect } from '@playwright/test'
import { addGrocery, addMember, clearHouseholdGroceries, enterApp, FIXTURE_OWNER_FIRST_NAME, FIXTURE_OWNER_NAME } from './helpers'

/**
 * Proves a member added through the normal Members flow immediately
 * participates in the real settlement engine — no refresh, no separate
 * "activate this person financially" step. Regression coverage for the
 * mockMembers → live-roster fix: Grocery/Assistant payer and shared-by
 * pickers used to only ever offer a fixed set of hardcoded names, so a
 * newly-added member could never actually be selected as a payer or
 * sharer at all.
 *
 *   Snacks ৳500, paid by Zara (the new member), shared by Zara and the fixture owner
 *   Zara consumed ৳250, paid ৳500  → net +৳250 (owed)
 *   Owner consumed ৳250, paid ৳0   → net -৳250 (owes)
 *   Settlement: owner pays Zara ৳250
 *
 * Groceries start empty for every fresh page load, so the household's
 * balance is driven only by the one item this test adds.
 */

test.describe('A newly-added member participates in the real settlement', () => {
  test.beforeEach(({ isMobile }) => {
    test.skip(isMobile, 'this is a calculation-correctness concern, not viewport-dependent; desktop coverage is sufficient')
  })

  test('adding a member, then a grocery involving them, produces the correct real settlement', async ({ page }) => {
    // A single-token name: both the "Paid by" dropdown (full name) and the
    // sharing chip/card text (first name only) end up reading the same
    // string, so this run's unique suffix keeps every locator below
    // unambiguous even as the persistent fixture household accumulates
    // rows from earlier runs.
    const zara = `Zara${Date.now()}`

    await enterApp(page)
    // Groceries genuinely persist now — see the identical note in
    // settlement-integration.spec.ts. Requires --workers=1.
    await clearHouseholdGroceries(page)
    await addMember(page, zara)

    // Add a grocery paid by, and shared by, the new member plus the fixture owner.
    await page.getByRole('navigation', { name: 'Main' }).getByRole('button', { name: 'Groceries', exact: true }).click()
    await addGrocery(page, {
      name: 'Snacks',
      price: '500',
      paidByName: zara,
      sharedByNames: [zara, FIXTURE_OWNER_FIRST_NAME],
    })
    await expect(page.getByText(`Paid by ${zara} · 2 sharing`)).toBeVisible()

    // Members page: Zara's real, engine-derived numbers.
    await page.getByRole('navigation', { name: 'Main' }).getByRole('button', { name: 'Members', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'Members', exact: true })).toBeVisible()
    const zaraCard = page.getByRole('button', { name: new RegExp(`Open ${zara}'s profile`) })
    await expect(zaraCard.getByText('House owes')).toBeVisible()
    await expect(zaraCard.getByText('500', { exact: true })).toBeVisible()
    const ownerCard = page.getByRole('button', { name: new RegExp(`Open ${FIXTURE_OWNER_NAME}'s profile`) })
    await expect(ownerCard.getByText('Owes the house')).toBeVisible()

    // Settlements page: the real transfer names the new member correctly.
    await page.getByRole('navigation', { name: 'Main' }).getByRole('button', { name: 'Settlements', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'Settlements', exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Mark as paid' })).toHaveCount(1)
    const journeyCard = page.locator('li').filter({ has: page.getByRole('button', { name: 'Mark as paid' }) })
    await expect(journeyCard.getByText(FIXTURE_OWNER_FIRST_NAME)).toBeVisible()
    await expect(journeyCard.getByText(zara)).toBeVisible()
    await expect(journeyCard.getByText('৳250')).toBeVisible()
  })
})
