import { test, expect } from '@playwright/test'
import { enterApp } from './helpers'

/**
 * Proves a member added through the normal Members flow immediately
 * participates in the real settlement engine — no refresh, no separate
 * "activate this person financially" step. Regression coverage for the
 * mockMembers → live-roster fix: Grocery/Assistant payer and shared-by
 * pickers used to only ever offer the four hardcoded seed names, so a
 * newly-added member could never actually be selected as a payer or
 * sharer at all.
 *
 *   Snacks ৳500, paid by Zara (the new member), shared by Zara and Aisha
 *   Zara consumed ৳250, paid ৳500 → net +৳250 (owed)
 *   Aisha consumed ৳250, paid ৳0   → net -৳250 (owes)
 *   Settlement: Aisha pays Zara ৳250
 *
 * The seed groceries are deleted first so the household's balance is
 * driven only by the one item this test controls.
 */

const SEED_GROCERY_NAMES = ['Milk (2L)', 'Basmati rice (5kg)', 'Apples (1kg)', 'Dish soap']

test.describe('A newly-added member participates in the real settlement', () => {
  test.beforeEach(({ isMobile }) => {
    test.skip(isMobile, 'this is a calculation-correctness concern, not viewport-dependent; desktop coverage is sufficient')
  })

  test('adding a member, then a grocery involving them, produces the correct real settlement', async ({ page }) => {
    await enterApp(page)

    // Add the new member.
    await page.getByRole('navigation', { name: 'Main' }).getByRole('button', { name: 'Members', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'Members', exact: true })).toBeVisible()
    await page.getByRole('button', { name: 'Add member' }).click()
    const addMemberDialog = page.getByRole('dialog')
    await addMemberDialog.getByLabel('Name').fill('Zara Islam')
    await addMemberDialog.getByRole('button', { name: 'Add member' }).click()
    await expect(addMemberDialog).not.toBeVisible()
    await expect(page.getByRole('button', { name: /Open Zara Islam's profile/ })).toBeVisible()

    // Clear the seed groceries so only the item this test adds drives the balance.
    await page.getByRole('navigation', { name: 'Main' }).getByRole('button', { name: 'Groceries', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'Groceries', exact: true })).toBeVisible()
    for (const itemName of SEED_GROCERY_NAMES) {
      await page.getByRole('button', { name: `Delete ${itemName}` }).click()
    }
    await expect(page.getByText('Your first grocery starts here.')).toBeVisible()

    // Add a grocery paid by, and shared by, the new member (plus one existing member).
    await page.getByRole('button', { name: 'Add your first grocery' }).click()
    const groceryDialog = page.getByRole('dialog')
    await groceryDialog.getByLabel('Grocery name').fill('Snacks')
    await groceryDialog.getByLabel('Price').fill('500')
    await groceryDialog.getByRole('combobox', { name: 'Paid by' }).click()
    await groceryDialog.getByRole('option', { name: 'Zara Islam' }).click()
    // Everyone is selected by default; keep only Zara and Aisha sharing.
    await groceryDialog.getByRole('button', { name: 'Bilal' }).click()
    await groceryDialog.getByRole('button', { name: 'Chloe' }).click()
    await groceryDialog.getByRole('button', { name: 'Daniyal' }).click()
    await groceryDialog.getByRole('button', { name: 'Add grocery' }).click()
    await expect(groceryDialog).not.toBeVisible()
    await expect(page.getByText('Paid by Zara · 2 sharing')).toBeVisible()

    // Members page: Zara's real, engine-derived numbers.
    await page.getByRole('navigation', { name: 'Main' }).getByRole('button', { name: 'Members', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'Members', exact: true })).toBeVisible()
    const zaraCard = page.getByRole('button', { name: /Open Zara Islam's profile/ })
    await expect(zaraCard.getByText('House owes')).toBeVisible()
    await expect(zaraCard.getByText('500', { exact: true })).toBeVisible()
    const aishaCard = page.getByRole('button', { name: /Open Aisha Khan's profile/ })
    await expect(aishaCard.getByText('Owes the house')).toBeVisible()

    // Settlements page: the real transfer names the new member correctly.
    await page.getByRole('navigation', { name: 'Main' }).getByRole('button', { name: 'Settlements', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'Settlements', exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Mark as paid' })).toHaveCount(1)
    const journeyCard = page.locator('li').filter({ has: page.getByRole('button', { name: 'Mark as paid' }) })
    await expect(journeyCard.getByText('Aisha')).toBeVisible()
    await expect(journeyCard.getByText('Zara')).toBeVisible()
    await expect(journeyCard.getByText('৳250')).toBeVisible()
  })
})
