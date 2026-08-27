import { test, expect } from '@playwright/test'
import { enterApp, generateAssistantGroceries } from './helpers'

// Regression coverage for QA-011: GroceryMate must never silently invent
// who paid or who shared an AI-generated item. Adding used to fill both in
// unconditionally (current user as payer, the whole household as sharers)
// with no confirmation; now every item must have both resolved — by
// already having them, or by the user filling them in — before "Add to
// groceries" can succeed at all.

test.describe('Assistant generated-groceries review', () => {
  test.beforeEach(async ({ page, isMobile }) => {
    test.skip(isMobile, 'this is form/validation logic, not viewport-dependent; desktop coverage is sufficient')
    await enterApp(page)
    await generateAssistantGroceries(page, 'Plan a week of groceries for 4 people')
  })

  test('an item that already has no payer or sharers is visibly flagged as needing input', async ({ page }) => {
    const milkRow = page.locator('main li').filter({ hasText: 'Milk (2L)' })
    await expect(milkRow.getByText('Needs payer')).toBeVisible()
    await expect(milkRow.getByText('Needs sharers')).toBeVisible()
  })

  test('an item with both payer and sharers already known shows no warning at all', async ({ page }) => {
    const butterRow = page.locator('main li').filter({ hasText: 'Butter' })
    await expect(butterRow.getByText('Needs payer')).not.toBeVisible()
    await expect(butterRow.getByText('Needs sharers')).not.toBeVisible()
    await expect(butterRow.getByRole('combobox', { name: 'Paid by' })).toHaveText('Bilal Ahmed')
  })

  test('clicking Add to groceries while items are unresolved does not add anything', async ({ page }) => {
    await page.getByRole('button', { name: 'Add to groceries' }).click()

    // Still on Assistant — the action did not succeed and did not navigate.
    await expect(page).toHaveURL(/\/assistant$/)
    await expect(page.getByText('Your groceries are ready')).toBeVisible()
    await expect(page.getByText(/still need a payer or sharers/)).toBeVisible()
    // Every previously-unresolved field now shows its own inline error too.
    const milkRow = page.locator('main li').filter({ hasText: 'Milk (2L)' })
    await expect(milkRow.getByText('Choose who paid for this item.')).toBeVisible()
    await expect(milkRow.getByText('Pick at least one person sharing this item.')).toBeVisible()
  })

  test('resolving every item allows Add to groceries to succeed, using exactly what the user chose', async ({ page }) => {
    // Milk: missing both payer and sharers.
    const milkRow = page.locator('main li').filter({ hasText: 'Milk (2L)' })
    await milkRow.getByRole('combobox', { name: 'Paid by' }).click()
    await milkRow.getByRole('option', { name: 'Aisha Khan' }).click()
    await milkRow.getByRole('button', { name: 'Everyone' }).click()

    // Eggs: payer already known, only sharers missing.
    const eggsRow = page.locator('main li').filter({ hasText: 'Eggs (dozen)' })
    await expect(eggsRow.getByRole('combobox', { name: 'Paid by' })).toHaveText('Aisha Khan')
    await eggsRow.getByRole('button', { name: 'Everyone' }).click()

    // Brown bread: sharers already known, only payer missing.
    const breadRow = page.locator('main li').filter({ hasText: 'Brown bread' })
    await breadRow.getByRole('combobox', { name: 'Paid by' }).click()
    await breadRow.getByRole('option', { name: 'Daniyal Raza' }).click()

    // Orange juice: missing both.
    const ojRow = page.locator('main li').filter({ hasText: 'Orange juice' })
    await ojRow.getByRole('combobox', { name: 'Paid by' }).click()
    await ojRow.getByRole('option', { name: 'Chloe Lee' }).click()
    await ojRow.getByRole('button', { name: 'Everyone' }).click()

    // Butter was already fully resolved — nothing to do.
    await expect(page.getByText('Needs payer')).toHaveCount(0)
    await expect(page.getByText('Needs sharers')).toHaveCount(0)

    await page.getByRole('button', { name: 'Add to groceries' }).click()
    await expect(page).toHaveURL(/\/groceries$/)

    // .first(): the newly-added items are prepended to the list, and the seed
    // data (src/store/groceries.ts) happens to already contain its own
    // "Milk (2L)" paid by Aisha and shared by all 4 — so without `.first()`
    // this would ambiguously match both the old and the newly-added card.
    const milkCard = page.locator('main li').filter({ hasText: 'Milk (2L)' }).first()
    await expect(milkCard.getByText('Paid by Aisha · 4 sharing')).toBeVisible()
    const breadCard = page.locator('main li').filter({ hasText: 'Brown bread' })
    // Brown bread's pre-existing sharers (2 people) were preserved, not overwritten to "Everyone".
    await expect(breadCard.getByText('Paid by Daniyal · 2 sharing')).toBeVisible()
    const butterCard = page.locator('main li').filter({ hasText: 'Butter' })
    await expect(butterCard.getByText('Paid by Bilal · 4 sharing')).toBeVisible()
  })

  test('"Try another prompt" discards the in-progress review with no crash', async ({ page }) => {
    const milkRow = page.locator('main li').filter({ hasText: 'Milk (2L)' })
    await milkRow.getByRole('combobox', { name: 'Paid by' }).click()
    await milkRow.getByRole('option', { name: 'Aisha Khan' }).click()

    await page.getByRole('button', { name: 'Try another prompt' }).click()

    await expect(page.getByText('Ask GroceryMate')).toBeVisible()
    await expect(page.getByLabel('Describe what your household needs')).toHaveValue('')
  })
})
