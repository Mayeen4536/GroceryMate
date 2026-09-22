import { test, expect, type Locator, type Page } from '@playwright/test'
import { addGrocery, enterApp, FIXTURE_OWNER_FIRST_NAME, FIXTURE_OWNER_NAME } from './helpers'

// Regression coverage for QA-005 (grocery deletion used to be instant and
// permanent, with no recovery). The product decision was a reversible
// delete: the item disappears immediately, and an "Undo" toast keeps it
// recoverable for a short window before the deletion becomes final.

/** The item's name lives in its own accessible name, not a CSS class — read it from there. */
async function nameOf(deleteButton: Locator) {
  const label = await deleteButton.getAttribute('aria-label')
  return label!.replace(/^Delete /, '')
}

/**
 * Groceries are real, persisted data now (see docs/GROCERY_INTEGRATION.md)
 * — every test here needs at least two of its own, added through the real
 * form. Per-call unique names: groceries never expire from the shared
 * fixture household the way session-local state used to, so a fixed name
 * would eventually collide with a leftover row from an earlier run and
 * make a "Delete <name>" locator match more than one item.
 */
async function seedTwoGroceries(page: Page) {
  const runId = Date.now()
  await addGrocery(page, {
    name: `Milk (2L) ${runId}`,
    price: '240',
    paidByName: FIXTURE_OWNER_NAME,
    sharedByNames: [FIXTURE_OWNER_FIRST_NAME],
  })
  await addGrocery(page, {
    name: `Basmati rice (5kg) ${runId}`,
    price: '1450',
    paidByName: FIXTURE_OWNER_NAME,
    sharedByNames: [FIXTURE_OWNER_FIRST_NAME],
  })
}

test('deleting a grocery removes it immediately, and Undo restores it', async ({ page }) => {
  await enterApp(page)
  await seedTwoGroceries(page)
  const deleteButton = page
    .locator('main li')
    .first()
    .getByRole('button', { name: /^Delete /i })
  const itemName = await nameOf(deleteButton)

  await deleteButton.click()
  await expect(page.getByRole('button', { name: `Delete ${itemName}` })).toHaveCount(0)
  const undoButton = page.getByRole('button', { name: 'Undo' })
  await expect(undoButton).toBeVisible()
  await expect(page.getByRole('status')).toContainText(`${itemName} deleted`)

  await undoButton.click()
  await expect(page.getByRole('button', { name: `Delete ${itemName}` })).toBeVisible()
})

test.describe('Delete and undo details', () => {
  test.beforeEach(({ isMobile }) => {
    test.skip(isMobile, 'these checks exercise state logic, not layout; desktop coverage is sufficient')
  })

  test('Undo restores the grocery to its original position among the others', async ({ page }) => {
    await enterApp(page)
    await seedTwoGroceries(page)
    const deleteButtons = () => page.locator('main li').getByRole('button', { name: /^Delete /i })
    const namesBefore = await deleteButtons().evaluateAll((buttons) =>
      buttons.map((b) => b.getAttribute('aria-label')?.replace(/^Delete /, '')),
    )
    expect(namesBefore.length).toBeGreaterThan(1)

    // Delete the second item specifically, so restoring "at the end" (a bug)
    // would be distinguishable from restoring "in place" (correct).
    const targetName = namesBefore[1]
    await page.getByRole('button', { name: `Delete ${targetName}` }).click()
    await expect(page.getByRole('button', { name: `Delete ${targetName}` })).toHaveCount(0)

    await page.getByRole('button', { name: 'Undo' }).click()
    await expect(page.getByRole('button', { name: `Delete ${targetName}` })).toBeVisible()

    const namesAfter = await deleteButtons().evaluateAll((buttons) =>
      buttons.map((b) => b.getAttribute('aria-label')?.replace(/^Delete /, '')),
    )
    expect(namesAfter).toEqual(namesBefore)
  })

  test('a deletion that is not undone stays deleted once the undo window passes', async ({ page }) => {
    await enterApp(page)
    await seedTwoGroceries(page)
    // A real wait, not a virtual clock: the undo window's own finalize step
    // now makes a genuine network call (the real, persisted delete), and
    // mixing Playwright's fake timers with real async I/O is its own
    // source of flakiness — simpler and more reliable to just wait out the
    // real (short) window.
    const deleteButton = page
      .locator('main li')
      .first()
      .getByRole('button', { name: /^Delete /i })
    const itemName = await nameOf(deleteButton)
    await deleteButton.click()
    await expect(page.getByRole('button', { name: 'Undo' })).toBeVisible()

    await expect(page.getByRole('button', { name: 'Undo' })).not.toBeVisible({ timeout: 8000 })
    await expect(page.getByRole('button', { name: `Delete ${itemName}` })).toHaveCount(0)

    // The undo window closing doesn't just hide it locally — a genuine
    // reload proves it's gone server-side, not just from this one render.
    await page.reload()
    await expect(page.getByRole('heading', { name: 'Groceries', exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: `Delete ${itemName}` })).toHaveCount(0)
  })

  test('clicking Undo rapidly does not restore the grocery more than once', async ({ page }) => {
    await enterApp(page)
    await seedTwoGroceries(page)
    const countBefore = await page.locator('main li').count()
    const deleteButton = page
      .locator('main li')
      .first()
      .getByRole('button', { name: /^Delete /i })
    const itemName = await nameOf(deleteButton)
    await deleteButton.click()

    const undoButton = page.getByRole('button', { name: 'Undo' })
    await expect(undoButton).toBeVisible()
    await Promise.all([
      undoButton.click({ force: true }).catch(() => {}),
      undoButton.click({ force: true }).catch(() => {}),
      undoButton.click({ force: true }).catch(() => {}),
    ])

    await expect(page.getByRole('button', { name: `Delete ${itemName}` })).toHaveCount(1)
    await expect(page.locator('main li')).toHaveCount(countBefore)
  })
})
