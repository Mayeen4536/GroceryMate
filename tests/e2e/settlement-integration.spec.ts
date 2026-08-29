import { test, expect } from '@playwright/test'
import { enterApp } from './helpers'

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
 * The seed groceries are deleted first so this household's balance is
 * driven only by the two items this test controls — this checks
 * user-visible results end to end, not any engine/adapter internals.
 */

const SEED_GROCERY_NAMES = ['Milk (2L)', 'Basmati rice (5kg)', 'Apples (1kg)', 'Dish soap']

test.describe('Settlement reflects the real engine end to end', () => {
  test.beforeEach(({ isMobile }) => {
    test.skip(isMobile, 'this is a calculation-correctness concern, not viewport-dependent; desktop coverage is sufficient')
  })

  test('a manually-verifiable 3-person scenario produces the exact expected settlement', async ({ page }) => {
    await enterApp(page)

    for (const itemName of SEED_GROCERY_NAMES) {
      await page.getByRole('button', { name: `Delete ${itemName}` }).click()
    }
    await expect(page.getByText('Your first grocery starts here.')).toBeVisible()

    // Rice: ৳900, paid by Aisha, shared by Aisha/Bilal/Chloe (deselect Daniyal,
    // who's part of the "everyone" default the sharing picker starts with).
    await page.getByRole('button', { name: 'Add your first grocery' }).click()
    let dialog = page.getByRole('dialog')
    await dialog.getByLabel('Grocery name').fill('Rice')
    await dialog.getByLabel('Price').fill('900')
    await dialog.getByRole('combobox', { name: 'Paid by' }).click()
    await dialog.getByRole('option', { name: 'Aisha Khan' }).click()
    await dialog.getByRole('button', { name: 'Daniyal' }).click()
    await dialog.getByRole('button', { name: 'Add grocery' }).click()
    await expect(dialog).not.toBeVisible()

    // Chicken: ৳600, paid by Bilal, shared by Aisha/Bilal only.
    await page.getByRole('button', { name: 'Add grocery' }).click()
    dialog = page.getByRole('dialog')
    await dialog.getByLabel('Grocery name').fill('Chicken')
    await dialog.getByLabel('Price').fill('600')
    await dialog.getByRole('combobox', { name: 'Paid by' }).click()
    await dialog.getByRole('option', { name: 'Bilal Ahmed' }).click()
    await dialog.getByRole('button', { name: 'Chloe' }).click()
    await dialog.getByRole('button', { name: 'Daniyal' }).click()
    await dialog.getByRole('button', { name: 'Add grocery' }).click()
    await expect(dialog).not.toBeVisible()

    // Members page: each of the three members shows their real, derived numbers.
    await page.getByRole('navigation', { name: 'Main' }).getByRole('button', { name: 'Members', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'Members', exact: true })).toBeVisible()

    const aishaCard = page.getByRole('button', { name: /Open Aisha Khan's profile/ })
    await expect(aishaCard.getByText('House owes')).toBeVisible()
    await expect(aishaCard.getByText('900', { exact: true })).toBeVisible()

    const bilalCard = page.getByRole('button', { name: /Open Bilal Ahmed's profile/ })
    await expect(bilalCard.getByText('Settled up')).toBeVisible()
    await expect(bilalCard.getByText('600', { exact: true })).toBeVisible()

    const chloeCard = page.getByRole('button', { name: /Open Chloe Lee's profile/ })
    await expect(chloeCard.getByText('Owes the house')).toBeVisible()
    await expect(chloeCard.getByText('0', { exact: true })).toBeVisible()

    // Settlements page: the summary and the single settling transfer both match exactly.
    await page.getByRole('navigation', { name: 'Main' }).getByRole('button', { name: 'Settlements', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'Settlements', exact: true })).toBeVisible()

    await expect(page.getByText('Outstanding across Flat 4B')).toBeVisible()
    await expect(page.getByText('৳300', { exact: true }).first()).toBeVisible()

    // Exactly one settling transfer — Bilal, being settled, appears in neither
    // list. Scoped by the one element unique to a JourneyCard ("Mark as
    // paid") rather than DOM-structure traversal, so it stays resilient to
    // any unrelated markup change around it.
    await expect(page.getByRole('button', { name: 'Mark as paid' })).toHaveCount(1)
    const journeyCard = page.locator('li').filter({ has: page.getByRole('button', { name: 'Mark as paid' }) })
    await expect(journeyCard.getByText('Chloe')).toBeVisible()
    await expect(journeyCard.getByText('Aisha')).toBeVisible()
    await expect(journeyCard.getByText('৳300')).toBeVisible()
  })
})
