import { test, expect } from '@playwright/test'
import { enterApp, FIXTURE_OWNER_FIRST_NAME, FIXTURE_OWNER_NAME, generateAssistantGroceries } from './helpers'

// Regression coverage for QA-011: GroceryMate must never silently invent
// who paid or who shared an AI-generated item. Adding used to fill both in
// unconditionally (current user as payer, the whole household as sharers)
// with no confirmation; now every item must have both resolved — by
// already having them, or by the user filling them in — before "Add to
// groceries" can succeed at all.
//
// Every generated item ships with no payer/sharers at all (see
// src/store/assistantGenerated.ts) — a mock "AI" has no way to know a real
// household's actual member names, so nothing is ever pre-filled; this
// suite exercises the review/resolution flow itself, not a "some already
// known" shortcut a real integration couldn't actually provide.

test.describe('Assistant generated-groceries review', () => {
  test.beforeEach(async ({ page, isMobile }) => {
    test.skip(isMobile, 'this is form/validation logic, not viewport-dependent; desktop coverage is sufficient')
    await enterApp(page)
    await generateAssistantGroceries(page, 'Plan a week of groceries for 4 people')
  })

  test('every generated item is visibly flagged as needing input', async ({ page }) => {
    const milkRow = page.locator('main li').filter({ hasText: 'Milk (2L)' })
    await expect(milkRow.getByText('Needs payer')).toBeVisible()
    await expect(milkRow.getByText('Needs sharers')).toBeVisible()
    const butterRow = page.locator('main li').filter({ hasText: 'Butter' })
    await expect(butterRow.getByText('Needs payer')).toBeVisible()
    await expect(butterRow.getByText('Needs sharers')).toBeVisible()
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

  test('resolving every item allows Add to groceries to succeed, using exactly what the user chose', async ({
    page,
  }) => {
    // Every item is missing both fields — resolve each the same way, always
    // picking the fixture owner specifically as the lone sharer (not the
    // "Everyone" shortcut, which selects the household's *entire* current
    // roster — a size this test can't assume, since the fixture household
    // persists and accumulates members across every spec's run).
    for (const itemText of ['Milk (2L)', 'Eggs (dozen)', 'Brown bread', 'Butter', 'Orange juice']) {
      const row = page.locator('main li').filter({ hasText: itemText })
      await row.getByRole('combobox', { name: 'Paid by' }).click()
      await row.getByRole('option', { name: FIXTURE_OWNER_NAME }).click()
      await row.getByRole('button', { name: FIXTURE_OWNER_NAME }).click()
    }

    await expect(page.getByText('Needs payer')).toHaveCount(0)
    await expect(page.getByText('Needs sharers')).toHaveCount(0)

    await page.getByRole('button', { name: 'Add to groceries' }).click()
    // Each of the 5 items now persists through a real, sequential
    // add-grocery call (an item insert plus a consumer insert apiece) —
    // genuinely slower than the old in-memory version, so this needs more
    // room than the default timeout.
    await expect(page).toHaveURL(/\/groceries$/, { timeout: 20000 })

    const milkCard = page.locator('main li').filter({ hasText: 'Milk (2L)' })
    await expect(milkCard.getByText(`Paid by ${FIXTURE_OWNER_FIRST_NAME} · 1 sharing`)).toBeVisible()
  })

  test('"Try another prompt" discards the in-progress review with no crash', async ({ page }) => {
    const milkRow = page.locator('main li').filter({ hasText: 'Milk (2L)' })
    await milkRow.getByRole('combobox', { name: 'Paid by' }).click()
    await milkRow.getByRole('option', { name: FIXTURE_OWNER_NAME }).click()

    await page.getByRole('button', { name: 'Try another prompt' }).click()

    await expect(page.getByText('Ask GroceryMate')).toBeVisible()
    await expect(page.getByLabel('Describe what your household needs')).toHaveValue('')
  })
})
