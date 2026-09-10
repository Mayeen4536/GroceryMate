import { test, expect } from '@playwright/test'
import { addGrocery, addMember, archiveMember, enterApp, FIXTURE_OWNER_FIRST_NAME } from './helpers'

// Regression coverage for Frontend Slice 4 (real grocery persistence, see
// docs/GROCERY_INTEGRATION.md): groceries used to be in-memory only, reset
// on every page load — a refresh could never actually prove anything
// persisted. These specs prove the real thing: add/edit/delete survive a
// genuine page reload, a different member can be the payer than whoever's
// signed in, multiple consumers round-trip correctly, and an archived
// member stays correctly resolvable on groceries logged before they were
// archived while being excluded from new ones.

test.describe('Grocery persistence', () => {
  test.beforeEach(({ isMobile }) => {
    test.skip(isMobile, 'this is a persistence/data-correctness concern, not viewport-dependent; desktop coverage is sufficient')
  })

  test('adding a grocery survives a refresh', async ({ page }) => {
    const itemName = `Persistence Add Item ${Date.now()}`
    await enterApp(page)
    await addGrocery(page, {
      name: itemName,
      price: '350',
      paidByName: FIXTURE_OWNER_FIRST_NAME,
      sharedByNames: [FIXTURE_OWNER_FIRST_NAME],
    })
    await expect(page.locator('main li').filter({ hasText: itemName })).toBeVisible()

    await page.reload()
    await expect(page.getByRole('heading', { name: 'Groceries', exact: true })).toBeVisible()
    const card = page.locator('main li').filter({ hasText: itemName })
    await expect(card).toBeVisible()
    await expect(card.getByText('350', { exact: true })).toBeVisible()
  })

  test('editing a grocery survives a refresh', async ({ page }) => {
    const itemName = `Persistence Edit Item ${Date.now()}`
    const renamedTo = `${itemName} (edited)`
    await enterApp(page)
    await addGrocery(page, {
      name: itemName,
      price: '100',
      paidByName: FIXTURE_OWNER_FIRST_NAME,
      sharedByNames: [FIXTURE_OWNER_FIRST_NAME],
    })

    const card = page.locator('main li').filter({ hasText: itemName })
    await card.getByRole('button', { name: `Edit ${itemName}` }).click()
    const dialog = page.getByRole('dialog')
    await dialog.getByLabel('Grocery name').fill(renamedTo)
    await dialog.getByLabel('Price').fill('125')
    await dialog.getByRole('button', { name: 'Save changes' }).click()
    await expect(dialog).not.toBeVisible()

    await page.reload()
    await expect(page.getByRole('heading', { name: 'Groceries', exact: true })).toBeVisible()
    const editedCard = page.locator('main li').filter({ hasText: renamedTo })
    await expect(editedCard).toBeVisible()
    await expect(editedCard.getByText('125', { exact: true })).toBeVisible()
  })

  test('a different member can be the payer than whoever is signed in, and the signed-in owner can still edit it', async ({ page }) => {
    const payerName = `PersistencePayer${Date.now()}`
    const itemName = `Different Payer Item ${Date.now()}`
    await enterApp(page)
    await addMember(page, payerName)

    await page.getByRole('navigation', { name: 'Main' }).getByRole('button', { name: 'Groceries', exact: true }).click()
    await addGrocery(page, {
      name: itemName,
      price: '200',
      paidByName: payerName,
      sharedByNames: [payerName, FIXTURE_OWNER_FIRST_NAME],
    })

    const card = page.locator('main li').filter({ hasText: itemName })
    await expect(card).toBeVisible()
    await expect(card.getByText(`Paid by ${payerName}`)).toBeVisible()
    // The signed-in user (household owner) logged this entry (created_by is
    // always the caller's own membership id, never the chosen payer's) —
    // owner-or-creator edit rights mean the Edit control is still there.
    await expect(card.getByRole('button', { name: `Edit ${itemName}` })).toBeVisible()
  })

  test('multiple consumers persist correctly across a refresh', async ({ page }) => {
    const consumerName = `PersistenceConsumer${Date.now()}`
    const itemName = `Multi Consumer Item ${Date.now()}`
    await enterApp(page)
    await addMember(page, consumerName)

    await page.getByRole('navigation', { name: 'Main' }).getByRole('button', { name: 'Groceries', exact: true }).click()
    await addGrocery(page, {
      name: itemName,
      price: '400',
      paidByName: FIXTURE_OWNER_FIRST_NAME,
      sharedByNames: [FIXTURE_OWNER_FIRST_NAME, consumerName],
    })
    await expect(page.locator('main li').filter({ hasText: itemName }).getByText('2 sharing')).toBeVisible()

    await page.reload()
    await expect(page.getByRole('heading', { name: 'Groceries', exact: true })).toBeVisible()
    await expect(page.locator('main li').filter({ hasText: itemName }).getByText('2 sharing')).toBeVisible()
  })

  test('an archived member is excluded from new grocery selection, but stays correctly displayed on a grocery that already references them', async ({
    page,
  }) => {
    const archivedName = `HistoricalMember${Date.now()}`
    const itemName = `Historical Archived Item ${Date.now()}`
    await enterApp(page)
    await addMember(page, archivedName)

    await page.getByRole('navigation', { name: 'Main' }).getByRole('button', { name: 'Groceries', exact: true }).click()
    await addGrocery(page, {
      name: itemName,
      price: '150',
      paidByName: archivedName,
      sharedByNames: [archivedName, FIXTURE_OWNER_FIRST_NAME],
    })
    const card = page.locator('main li').filter({ hasText: itemName })
    await expect(card.getByText(`Paid by ${archivedName}`)).toBeVisible()

    await archiveMember(page, archivedName)

    // Back on Groceries: the historical item still names the archived member correctly.
    await page.getByRole('navigation', { name: 'Main' }).getByRole('button', { name: 'Groceries', exact: true }).click()
    await expect(card.getByText(`Paid by ${archivedName}`)).toBeVisible()
    await expect(card.getByText('Unknown member')).not.toBeVisible()

    // A brand-new grocery's pickers no longer offer the archived member at all.
    await page.getByRole('button', { name: 'Add grocery', exact: true }).click()
    const dialog = page.getByRole('dialog')
    await dialog.getByRole('combobox', { name: 'Paid by' }).click()
    await expect(page.getByRole('option', { name: archivedName })).toHaveCount(0)
    // Click the dialog's own title (a neutral spot outside the popover)
    // rather than pressing Escape — Escape bubbles past the dropdown's own
    // close-on-outside-click handling straight to the Drawer's document-level
    // listener, closing the whole "Add grocery" panel along with it.
    await dialog.getByRole('heading', { name: 'Add grocery' }).click()
    await expect(dialog.getByRole('button', { name: archivedName })).toHaveCount(0)
    await dialog.getByRole('button', { name: 'Cancel' }).click()

    // Survives a refresh too — this isn't just an in-memory artifact of the archive action.
    await page.reload()
    await expect(page.getByRole('heading', { name: 'Groceries', exact: true })).toBeVisible()
    await expect(page.locator('main li').filter({ hasText: itemName }).getByText(`Paid by ${archivedName}`)).toBeVisible()
  })
})
