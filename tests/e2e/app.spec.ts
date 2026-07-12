import { test, expect, _electron as electron } from '@playwright/test'
import path from 'path'

test.describe('CineWeave Studio Phase 0', () => {
  test('launches with welcome screen and security checks', async () => {
    const electronApp = await electron.launch({
      args: [path.join(__dirname, '../../out/main/index.js')],
      executablePath: process.env.ELECTRON_EXECUTABLE_PATH
    })
    const page = await electronApp.firstWindow()
    await expect(page).toHaveTitle('CineWeave Studio')
    await expect(page.locator('.topbar-title')).toHaveText('CineWeave Studio')
    await expect(page.locator('.empty-state-title')).toHaveText('Welcome to CineWeave Studio')
    await expect(page.locator('button', { hasText: 'New Project' })).toBeVisible()
    await expect(page.locator('[aria-label="Open settings"]')).toBeVisible()
    const hasNode = await page.evaluate(() => typeof (window as any).require !== 'undefined')
    expect(hasNode).toBe(false)
    await page.setViewportSize({ width: 1280, height: 720 })
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)
    expect(overflow).toBe(false)
    await electronApp.close()
  })
})
