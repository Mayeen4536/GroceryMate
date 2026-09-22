import { test, expect, type Browser } from '@playwright/test'
import {
  addGrocery,
  addMember,
  clearHouseholdGroceries,
  FIXTURE_OWNER_FIRST_NAME,
  generateInviteLink,
  revokeInviteByToken,
  signUpNewUser,
} from './helpers'

/**
 * A fresh browser context signed in as the shared fixture household's
 * owner (see global-setup.ts) — every scenario here needs a real owner to
 * generate a real invite from, but the file itself defaults to signed-out
 * (see below) so recipient-side steps don't have to fight that session.
 */
async function ownerContext(browser: Browser) {
  return browser.newContext({ storageState: 'tests/e2e/.auth/user.json' })
}

// Most of this file is about the *recipient* experience, which must start
// signed out — opt out of the default authenticated storageState (see
// playwright.config.ts), matching auth-redirect.spec.ts's own convention.
test.use({ storageState: { cookies: [], origins: [] } })

test.describe('Invite/Join', () => {
  test('1. Owner creates a real, single-use invite link', async ({ browser }) => {
    const owner = await ownerContext(browser)
    const page = await owner.newPage()
    await page.goto('/groceries')

    const { url, token } = await generateInviteLink(page)

    expect(url).toBe(`${new URL(page.url()).origin}/join/${token}`)
    expect(token).toMatch(/^[0-9a-f]{64}$/) // 256-bit, hex-encoded — see Slice 8B
    await owner.close()
  })

  test('2. A logged-out recipient opens /join/:token and sees the household name plus both auth actions', async ({
    browser,
    page,
  }) => {
    const owner = await ownerContext(browser)
    const ownerPage = await owner.newPage()
    await ownerPage.goto('/groceries')
    const { url } = await generateInviteLink(ownerPage)
    await owner.close()

    await page.goto(url)
    await expect(page.getByText(/You've been invited to join/)).toBeVisible()
    await expect(page.getByRole('button', { name: 'Sign in to join' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Create account to join' })).toBeVisible()
    // Never accepted just by viewing it.
    await expect(page.getByRole('button', { name: /^Join /i })).not.toBeVisible()
  })

  test('3. Recipient signs in (not up) and returns to the exact same invite', async ({ browser, page }) => {
    const owner = await ownerContext(browser)
    const ownerPage = await owner.newPage()
    await ownerPage.goto('/groceries')
    const { url } = await generateInviteLink(ownerPage)
    await owner.close()

    // A real, no-household account this test can sign back IN with —
    // created via a plain signup (no invite involved yet).
    const email = `e2e-signin-return-${Date.now()}@example.com`
    const password = 'JoinPassword9!'
    await page.goto('/sign-up')
    await signUpNewUser(page, { name: 'Sign In Return', email, password })
    await expect(page.getByRole('heading', { name: 'Create your household' })).toBeVisible({ timeout: 15000 })
    await page.getByRole('button', { name: 'Sign out' }).click()
    await expect(page).toHaveURL(/\/sign-in$/)

    await page.goto(url)
    await page.getByRole('button', { name: 'Sign in to join' }).click()
    await expect(page).toHaveURL(/\/sign-in\?redirect=/)

    await page.getByLabel('Email').fill(email)
    await page.getByLabel('Password', { exact: true }).fill(password)
    await page.getByRole('button', { name: 'Sign in' }).click()

    // Back on the exact same invitation — not dumped at /groceries.
    await expect(page).toHaveURL(url)
    await expect(page.getByRole('button', { name: /^Join /i })).toBeVisible()
  })

  test('4, 5, 6. Authenticated recipient explicitly accepts, lands in the correct household, and it survives a refresh', async ({
    browser,
    page,
  }) => {
    const owner = await ownerContext(browser)
    const ownerPage = await owner.newPage()
    await ownerPage.goto('/groceries')
    const { url } = await generateInviteLink(ownerPage)
    await owner.close()

    // A unique-per-run name — the fixture household's roster persists
    // across runs (and across the Desktop/Mobile Chrome projects sharing
    // it), so a fixed name would eventually collide with a leftover row
    // from an earlier run, same as addMember's own established convention.
    const recipientName = `Real Recipient ${Date.now()}`
    const email = `e2e-accept-${Date.now()}@example.com`
    await page.goto(url)
    await page.getByRole('button', { name: 'Create account to join' }).click()
    await signUpNewUser(page, { name: recipientName, email, password: 'JoinPassword9!' })

    // Landed back on the invite (not onboarding) — explicit accept required.
    await expect(page).toHaveURL(url)
    const joinButton = page.getByRole('button', { name: /^Join /i })
    await expect(joinButton).toBeVisible()
    await joinButton.click()

    // No manual refresh needed — real household context, real navigation.
    await expect(page).toHaveURL(/\/groceries$/, { timeout: 15000 })
    await expect(page.getByRole('heading', { name: 'Groceries', exact: true })).toBeVisible()

    // Members page proves this is the *correct* (owner's) household, not a fabricated one.
    await page
      .getByRole('navigation', { name: 'Main' })
      .getByRole('button', { name: 'Members', exact: true })
      .click()
    const profileButton = page.getByRole('button', { name: new RegExp(`Open ${recipientName}'s profile`) })
    await expect(profileButton).toBeVisible()

    // Refresh: real, Supabase-persisted membership, not session-local state.
    await page.reload()
    await expect(page.getByRole('heading', { name: 'Members', exact: true })).toBeVisible({ timeout: 15000 })
    await expect(profileButton).toBeVisible()
  })

  test('7. An invalid invite token shows a clear invalid state', async ({ page }) => {
    await page.goto('/join/this-token-does-not-exist-at-all')
    await expect(page.getByRole('heading', { name: "This invite link isn't valid" })).toBeVisible()
  })

  test('8. An expired invite shows a clear expired state', async ({ page }) => {
    // The backend's own 7-day expiry is already proven correct at the RPC
    // layer (Slice 8B's local + hosted verification) — real time can't
    // reasonably be advanced from a frontend test, so this deterministically
    // exercises the frontend's own handling of that status the same way
    // auth-signup.spec.ts's "confirmation-required" test intercepts a
    // hard-to-reach-for-real backend response.
    await page.route('**/rest/v1/rpc/resolve_household_invite*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ status: 'expired', household_name: null }),
      })
    })
    await page.goto('/join/anytoken')
    await expect(page.getByRole('heading', { name: 'This invite has expired' })).toBeVisible()
  })

  test('9. A revoked invite shows a clear revoked state', async ({ browser, page }) => {
    const owner = await ownerContext(browser)
    const ownerPage = await owner.newPage()
    await ownerPage.goto('/groceries')
    const { url, token } = await generateInviteLink(ownerPage)
    await revokeInviteByToken(ownerPage, token)
    await owner.close()

    await page.goto(url)
    await expect(page.getByRole('heading', { name: 'This invite is no longer active' })).toBeVisible()
  })

  test('10. An already-used invite is rejected on a second visit/accept attempt', async ({
    browser,
    page,
  }) => {
    const owner = await ownerContext(browser)
    const ownerPage = await owner.newPage()
    await ownerPage.goto('/groceries')
    const { url } = await generateInviteLink(ownerPage)
    await owner.close()

    const email = `e2e-already-used-${Date.now()}@example.com`
    await page.goto(url)
    await page.getByRole('button', { name: 'Create account to join' }).click()
    await signUpNewUser(page, { name: 'First Claimant', email, password: 'JoinPassword9!' })
    await page.getByRole('button', { name: /^Join /i }).click()
    await expect(page).toHaveURL(/\/groceries$/, { timeout: 15000 })

    // Same link, fresh visit — the resolve step itself now reports it used.
    await page.goto(url)
    await expect(page.getByRole('heading', { name: 'This invite has already been used' })).toBeVisible()
  })

  test("11. A recipient who already belongs to another household is rejected, with GroceryMate's limitation explained", async ({
    browser,
    page,
  }) => {
    const owner = await ownerContext(browser)
    const ownerPage = await owner.newPage()
    await ownerPage.goto('/groceries')
    const { url } = await generateInviteLink(ownerPage)
    await owner.close()

    // A recipient who already owns their own (different) household.
    const email = `e2e-second-household-${Date.now()}@example.com`
    await page.goto('/sign-up')
    await signUpNewUser(page, { name: 'Already Elsewhere', email, password: 'JoinPassword9!' })
    await expect(page.getByRole('heading', { name: 'Create your household' })).toBeVisible({ timeout: 15000 })
    await page.getByLabel('Household name').fill(`E2E Second Household ${Date.now()}`)
    await page.getByRole('button', { name: 'Create household' }).click()
    await expect(page.getByRole('heading', { name: 'Groceries', exact: true })).toBeVisible({
      timeout: 15000,
    })

    await page.goto(url)
    await page.getByRole('button', { name: /^Join /i }).click()
    await expect(page.getByText('You already belong to a household.')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Go to your household' })).toBeVisible()
  })

  test('12. A non-owner member cannot access owner invite-creation UI', async ({ browser, page }) => {
    const owner = await ownerContext(browser)
    const ownerPage = await owner.newPage()
    await ownerPage.goto('/groceries')
    const { url } = await generateInviteLink(ownerPage)
    await owner.close()

    const email = `e2e-nonowner-${Date.now()}@example.com`
    await page.goto(url)
    await page.getByRole('button', { name: 'Create account to join' }).click()
    await signUpNewUser(page, { name: 'Regular Joiner', email, password: 'JoinPassword9!' })
    await page.getByRole('button', { name: /^Join /i }).click()
    await expect(page).toHaveURL(/\/groceries$/, { timeout: 15000 })

    await page
      .getByRole('navigation', { name: 'Main' })
      .getByRole('button', { name: 'Members', exact: true })
      .click()
    await expect(page.getByRole('heading', { name: 'Members', exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Invite', exact: true })).not.toBeVisible()
    await expect(page.getByRole('button', { name: 'Add member' })).not.toBeVisible()
  })

  test('13. "Add member" still works as a real, non-account financial participant', async ({ browser }) => {
    const owner = await ownerContext(browser)
    const page = await owner.newPage()
    await page.goto('/groceries')
    // Deliberately does NOT start with "E2E" — new-member-settlement.spec.ts's
    // own addGrocery helper matches the fixture owner's chip by the
    // substring "E2E" (FIXTURE_OWNER_FIRST_NAME), so any other member whose
    // name also starts with "E2E" makes that unrelated, pre-existing test's
    // locator ambiguous. Learned this the hard way while writing this file.
    await addMember(page, `AddMember Regression Check ${Date.now()}`)
    await owner.close()
  })

  test('14. The old fake "send it for them" email path is gone — no way left to create an orphaned invited row', async ({
    browser,
  }) => {
    const owner = await ownerContext(browser)
    const page = await owner.newPage()
    await page.goto('/groceries')
    await page
      .getByRole('navigation', { name: 'Main' })
      .getByRole('button', { name: 'Members', exact: true })
      .click()
    await page.getByRole('button', { name: 'Invite', exact: true }).click()

    const dialog = page.getByRole('dialog')
    await expect(dialog.getByLabel('Invite link')).toBeVisible()
    await expect(dialog.getByText('or send it for them')).not.toBeVisible()
    await expect(dialog.getByRole('button', { name: 'Send invite' })).not.toBeVisible()
    await expect(dialog.getByLabel('Email', { exact: true })).not.toBeVisible()
    await owner.close()
  })

  // Groceries genuinely persist in the shared fixture household (same as
  // new-member-settlement.spec.ts/settlement-integration.spec.ts) — this
  // clears them first for a deterministic balance, so it requires
  // --workers=1 like those other specs already do.
  test('15. Golden path: a real invited member participates correctly in the real settlement engine', async ({
    browser,
    page,
  }) => {
    const owner = await ownerContext(browser)
    const ownerPage = await owner.newPage()
    await ownerPage.goto('/groceries')
    // Deterministic starting balance — see clearHouseholdGroceries's own doc comment.
    await clearHouseholdGroceries(ownerPage)
    const { url } = await generateInviteLink(ownerPage)

    // A single-token name — both the "Paid by" dropdown (full name) and the
    // sharing chip/settlement-card text (first name only) then read the
    // same string, matching new-member-settlement.spec.ts's identical fix.
    const recipientName = `GoldenPath${Date.now()}`
    const email = `e2e-golden-${Date.now()}@example.com`
    await page.goto(url)
    await page.getByRole('button', { name: 'Create account to join' }).click()
    await signUpNewUser(page, { name: recipientName, email, password: 'JoinPassword9!' })
    await expect(page).toHaveURL(url)
    await page.getByRole('button', { name: /^Join /i }).click()
    await expect(page).toHaveURL(/\/groceries$/, { timeout: 15000 })

    // The owner's own tab loaded its roster before the recipient joined, and
    // useHouseholdMembers only refetches on household/identity change, not
    // on its own navigation — reload so the owner's page actually sees the
    // new member before trying to select them as a sharer.
    await ownerPage.reload()
    await ownerPage
      .getByRole('navigation', { name: 'Main' })
      .getByRole('button', { name: 'Groceries', exact: true })
      .click()

    // Owner adds one real grocery paid by them, shared by both real, distinct
    // household_members rows — no mocks anywhere in this path.
    await addGrocery(ownerPage, {
      name: 'Golden Path Snacks',
      price: '400',
      paidByName: FIXTURE_OWNER_FIRST_NAME,
      sharedByNames: [FIXTURE_OWNER_FIRST_NAME, recipientName],
    })
    await owner.close()

    // Recipient refreshes and sees the real, deterministic-settlement-engine
    // result — never a fabricated or session-local number.
    await page.reload()
    await page
      .getByRole('navigation', { name: 'Main' })
      .getByRole('button', { name: 'Settlements', exact: true })
      .click()
    await expect(page.getByRole('heading', { name: 'Settlements', exact: true })).toBeVisible({
      timeout: 15000,
    })
    const journeyCard = page.locator('li').filter({ has: page.getByRole('button', { name: 'Mark as paid' }) })
    await expect(journeyCard.getByText(FIXTURE_OWNER_FIRST_NAME)).toBeVisible()
    await expect(journeyCard.getByText(recipientName)).toBeVisible()
    await expect(journeyCard.getByText('৳200')).toBeVisible() // half of ৳400, split two ways
  })
})
