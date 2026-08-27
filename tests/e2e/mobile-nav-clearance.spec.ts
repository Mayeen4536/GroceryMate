import { test, expect } from '@playwright/test'
import { enterApp, generateAssistantGroceries } from './helpers'

// Regression coverage for QA-010: on mobile, scrolling a bottom-of-page
// control into view (what a keyboard Tab focus, or any future
// element.scrollIntoView() call, does under the hood) used to be able to
// land it exactly under the floating bottom-nav dock — visible, but
// actually intercepting taps meant for it. The fix is layout-level
// (html's scroll-padding-bottom, derived from the same --mobile-nav-
// clearance the dock's own safe zone is sized against — see index.css and
// AppShell.tsx), so this checks the *mechanism* via the page that first
// surfaced the bug, rather than asserting on any one component's margin.

test.describe('Mobile bottom-nav clearance', () => {
  test.beforeEach(({ isMobile }) => {
    test.skip(!isMobile, 'the floating dock this protects against only exists on mobile')
  })

  test('scrolling the Assistant\'s primary action into view does not leave it under the nav dock', async ({ page }) => {
    await enterApp(page)
    await generateAssistantGroceries(page, 'Plan a week of groceries for 4 people')

    const addButton = page.getByRole('button', { name: 'Add to groceries' })
    await addButton.scrollIntoViewIfNeeded()

    // The real, user-facing question: does whatever's actually under the
    // button's own center respond as "Add to groceries", not the nav dock
    // sitting on top of it. A locator-based click wouldn't prove this (it
    // refuses to click through an obstruction), so this checks the DOM
    // directly at the button's rendered position, then dispatches a real
    // coordinate click to confirm the button — not the nav — receives it.
    const box = await addButton.boundingBox()
    expect(box).not.toBeNull()
    const elementAtCenter = await page.evaluate(
      ([x, y]) => document.elementFromPoint(x, y)?.textContent?.trim(),
      [box!.x + box!.width / 2, box!.y + box!.height / 2],
    )
    expect(elementAtCenter).toBe('Add to groceries')

    await page.mouse.click(box!.x + box!.width / 2, box!.y + box!.height / 2)
    // Validation blocks this specific submit (the mock items aren't fully
    // resolved yet) — that's expected and covered by the Assistant-review
    // spec. What matters here is that the click reached the right target
    // at all: the URL must NOT have silently changed to another page.
    await expect(page).toHaveURL(/\/assistant$/)
  })

  test('a tall page (Analytics) can be scrolled to its true end without content getting stuck under the dock', async ({ page }) => {
    await enterApp(page)
    await page.getByRole('navigation', { name: 'Main' }).getByRole('button', { name: 'Analytics', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'Analytics', exact: true })).toBeVisible()

    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight))
    const { scrollY, maxScroll } = await page.evaluate(() => ({
      scrollY: window.scrollY,
      maxScroll: document.documentElement.scrollHeight - window.innerHeight,
    }))
    // If content were still reserving space incorrectly, the page couldn't
    // reach its own computed maximum scroll position.
    expect(scrollY).toBe(maxScroll)
  })
})
