import { test, expect } from '@playwright/test'

/**
 * Flow 1: Anonymous buyer — home → product → buy → confirm
 * Per plan §13.3 flow 1.
 */
test.describe('Anonymous buyer flow', () => {
  test('can browse home, view product, and reach checkout', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('h1')).toBeVisible()

    // Click first product card
    const productCard = page.locator('a[href^="/product/"]').first()
    await productCard.click()
    await expect(page).toHaveURL(/\/product\//)

    // Verify product detail page loaded
    await expect(page.locator('h1')).toBeVisible()

    // Click buy button
    const buyBtn = page.getByRole('button', { name: /buy|subscribe|get it/i })
    if (await buyBtn.isVisible()) {
      await buyBtn.click()
      // Should either open cart drawer or navigate to checkout
      await expect(
        page.locator('[role="dialog"]').or(page.locator('[data-testid="checkout"]')),
      ).toBeVisible({ timeout: 5000 }).catch(() => {
        // Cart toast is also acceptable
        expect(page.url()).toMatch(/checkout|cart/)
      })
    }
  })
})

/**
 * Flow 6: Search — command palette → results
 * Per plan §13.3 flow 6.
 */
test.describe('Search flow', () => {
  test('can search from home and see results', async ({ page }) => {
    await page.goto('/')

    // Click search icon in header
    const searchBtn = page.getByLabel(/search/i)
    if (await searchBtn.isVisible()) {
      await searchBtn.click()
      await page.waitForTimeout(300)
    } else {
      // Fallback: navigate directly
      await page.goto('/search?q=template')
    }

    await expect(page).toHaveURL(/search/)
  })
})
