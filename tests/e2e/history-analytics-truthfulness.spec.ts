import { test, expect } from '@playwright/test'
import {
  addGrocery,
  clearHouseholdGroceries,
  enterApp,
  FIXTURE_OWNER_FIRST_NAME,
  FIXTURE_OWNER_NAME,
} from './helpers'

/**
 * Regression coverage for Frontend Slice 5 (real history + removing
 * misleading mock financial data — see docs/HISTORY_INTEGRATION.md):
 * History and Analytics used to run entirely on hand-written mock sessions,
 * unrelated to what the signed-in household actually did. These specs prove
 * both pages now show only the household's real, persisted groceries — one
 * timeline entry per real grocery, real totals derived from them, an honest
 * empty state when there's nothing yet, and never any of the old seeded
 * mock names.
 */

test.describe('History and Analytics reflect real, persisted groceries', () => {
  test.beforeEach(({ isMobile }) => {
    test.skip(
      isMobile,
      'this is a data-correctness concern, not viewport-dependent; desktop coverage is sufficient',
    )
  })

  test('History shows exactly the real groceries just added, one entry each — never a fabricated session', async ({
    page,
  }) => {
    const runId = Date.now()
    const itemA = `History Milk ${runId}`
    const itemB = `History Rice ${runId}`

    await enterApp(page)
    await clearHouseholdGroceries(page)
    await addGrocery(page, {
      name: itemA,
      price: '240',
      paidByName: FIXTURE_OWNER_NAME,
      sharedByNames: [FIXTURE_OWNER_FIRST_NAME],
    })
    await addGrocery(page, {
      name: itemB,
      price: '900',
      paidByName: FIXTURE_OWNER_NAME,
      sharedByNames: [FIXTURE_OWNER_FIRST_NAME],
    })

    await page
      .getByRole('navigation', { name: 'Main' })
      .getByRole('button', { name: 'History', exact: true })
      .click()
    await expect(page.getByRole('heading', { name: 'History', exact: true })).toBeVisible()

    await expect(page.getByText('2 entries', { exact: true }).first()).toBeVisible()
    const cardA = page.locator('li').filter({ hasText: itemA })
    const cardB = page.locator('li').filter({ hasText: itemB })
    await expect(cardA).toBeVisible()
    await expect(cardB).toBeVisible()
    await expect(cardA.getByText('৳240', { exact: true })).toBeVisible()
    await expect(cardB.getByText('৳900', { exact: true })).toBeVisible()

    // No fabricated "session" grouping/settlement badge from the old mock model.
    await expect(page.getByText('Weekly shop')).toHaveCount(0)
    await expect(page.getByText('Settled', { exact: true })).toHaveCount(0)
  })

  test('History persists across a refresh', async ({ page }) => {
    const itemName = `History Persist Item ${Date.now()}`
    await enterApp(page)
    await addGrocery(page, {
      name: itemName,
      price: '150',
      paidByName: FIXTURE_OWNER_NAME,
      sharedByNames: [FIXTURE_OWNER_FIRST_NAME],
    })

    await page
      .getByRole('navigation', { name: 'Main' })
      .getByRole('button', { name: 'History', exact: true })
      .click()
    await expect(page.locator('li').filter({ hasText: itemName })).toBeVisible()

    await page.reload()
    await expect(page.getByRole('heading', { name: 'History', exact: true })).toBeVisible()
    await expect(page.locator('li').filter({ hasText: itemName })).toBeVisible()
  })

  test('editing a grocery is reflected in its History entry', async ({ page }) => {
    const itemName = `History Edit Item ${Date.now()}`
    const renamedTo = `${itemName} (edited)`
    await enterApp(page)
    await addGrocery(page, {
      name: itemName,
      price: '100',
      paidByName: FIXTURE_OWNER_NAME,
      sharedByNames: [FIXTURE_OWNER_FIRST_NAME],
    })

    const card = page.locator('main li').filter({ hasText: itemName })
    await card.getByRole('button', { name: `Edit ${itemName}` }).click()
    const dialog = page.getByRole('dialog')
    await dialog.getByLabel('Grocery name').fill(renamedTo)
    await dialog.getByLabel('Price').fill('175')
    await dialog.getByRole('button', { name: 'Save changes' }).click()
    await expect(dialog).not.toBeVisible()

    await page
      .getByRole('navigation', { name: 'Main' })
      .getByRole('button', { name: 'History', exact: true })
      .click()
    const historyCard = page.locator('li').filter({ hasText: renamedTo })
    await expect(historyCard).toBeVisible()
    await expect(historyCard.getByText('৳175', { exact: true })).toBeVisible()
    await expect(
      page.locator('li').filter({ hasText: itemName }).filter({ hasNotText: '(edited)' }),
    ).toHaveCount(0)
  })

  test('deleting a grocery removes it from History once the delete is final', async ({ page }) => {
    const itemName = `History Delete Item ${Date.now()}`
    await enterApp(page)
    await addGrocery(page, {
      name: itemName,
      price: '90',
      paidByName: FIXTURE_OWNER_NAME,
      sharedByNames: [FIXTURE_OWNER_FIRST_NAME],
    })

    const deleteButton = page
      .locator('main li')
      .filter({ hasText: itemName })
      .getByRole('button', { name: `Delete ${itemName}` })
    await deleteButton.click()
    await expect(page.getByRole('button', { name: 'Undo' })).toBeVisible()
    // Let the undo window pass so the delete actually becomes persisted (see docs/GROCERY_INTEGRATION.md).
    await expect(page.getByRole('button', { name: 'Undo' })).not.toBeVisible({ timeout: 8000 })

    await page
      .getByRole('navigation', { name: 'Main' })
      .getByRole('button', { name: 'History', exact: true })
      .click()
    await expect(page.getByRole('heading', { name: 'History', exact: true })).toBeVisible()
    await expect(page.locator('li').filter({ hasText: itemName })).toHaveCount(0)
  })

  test('Analytics shows an honest empty state with no real groceries, and real totals once there are some', async ({
    page,
  }) => {
    await enterApp(page)
    await clearHouseholdGroceries(page)
    // clearHouseholdGroceries deletes server-side directly (bypassing the
    // app), so the already-fetched in-memory grocery list doesn't know yet —
    // a reload forces the real refetch that picks up the deletion.
    await page.reload()
    await expect(page.getByRole('heading', { name: 'Groceries', exact: true })).toBeVisible()

    await page
      .getByRole('navigation', { name: 'Main' })
      .getByRole('button', { name: 'Analytics', exact: true })
      .click()
    await expect(page.getByRole('heading', { name: 'Analytics', exact: true })).toBeVisible()
    await expect(page.getByText('Nothing to analyze yet.')).toBeVisible()

    await page
      .getByRole('navigation', { name: 'Main' })
      .getByRole('button', { name: 'Groceries', exact: true })
      .click()
    await addGrocery(page, {
      name: `Analytics Item ${Date.now()}`,
      price: '325',
      paidByName: FIXTURE_OWNER_NAME,
      sharedByNames: [FIXTURE_OWNER_FIRST_NAME],
    })

    await page
      .getByRole('navigation', { name: 'Main' })
      .getByRole('button', { name: 'Analytics', exact: true })
      .click()
    await expect(page.getByText('Nothing to analyze yet.')).toHaveCount(0)
    const totalSpentTile = page.getByRole('heading', { name: 'Total spent' }).locator('xpath=../../..')
    await expect(totalSpentTile).toBeVisible()
    await expect(totalSpentTile.getByText('৳325', { exact: true })).toBeVisible()
  })

  test('no seeded mock data ever appears in History or Analytics', async ({ page }) => {
    await enterApp(page)

    await page
      .getByRole('navigation', { name: 'Main' })
      .getByRole('button', { name: 'History', exact: true })
      .click()
    for (const fakeName of ['Aisha Khan', 'Bilal Ahmed', 'Chloe Lee', 'Daniyal Raza']) {
      await expect(page.getByText(fakeName)).toHaveCount(0)
    }

    await page
      .getByRole('navigation', { name: 'Main' })
      .getByRole('button', { name: 'Analytics', exact: true })
      .click()
    for (const fakeName of ['Aisha Khan', 'Bilal Ahmed', 'Chloe Lee', 'Daniyal Raza']) {
      await expect(page.getByText(fakeName)).toHaveCount(0)
    }
  })

  test('the Settlements payment timeline shows an honest empty state rather than a fabricated history', async ({
    page,
  }) => {
    await enterApp(page)
    await page
      .getByRole('navigation', { name: 'Main' })
      .getByRole('button', { name: 'Settlements', exact: true })
      .click()
    await expect(page.getByRole('heading', { name: 'Settlements', exact: true })).toBeVisible()

    // Either a real "Mark as paid" event exists from a prior run in this shared
    // fixture household, or the honest empty state does — never the old fake feed.
    await expect(page.getByText('Chloe paid Aisha')).toHaveCount(0)
    await expect(page.getByText('Weekly shop logged')).toHaveCount(0)
    await expect(page.getByText('settled up fully')).toHaveCount(0)
  })
})
