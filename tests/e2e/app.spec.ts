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

test.describe('CineWeave Studio - Project Management', () => {
  let electronApp: any;
  let page: any;

  test.beforeAll(async () => {
    electronApp = await electron.launch({
      args: [path.join(__dirname, '../../out/main/index.js')],
      executablePath: process.env.ELECTRON_EXECUTABLE_PATH
    })
    page = await electronApp.firstWindow()
  })

  test.afterAll(async () => {
    await electronApp.close()
  })

  test('should create a new project', async () => {
    // Click new project button
    const newButton = page.locator('button', { hasText: 'New Project' })
    await newButton.click()

    // Fill in project name
    const nameInput = page.locator('input[name="projectName"]')
    await nameInput.fill('E2E Test Project')

    // Submit
    const submitButton = page.locator('button[type="submit"]')
    await submitButton.click()

    // Wait for project to appear
    await page.waitForSelector('text=E2E Test Project')

    // Verify project exists
    const projectCard = page.locator('text=E2E Test Project')
    await expect(projectCard).toBeVisible()
  })

  test('should open project', async () => {
    // Click on the project
    const projectCard = page.locator('text=E2E Test Project')
    await projectCard.click()

    // Verify we're in the project view
    const timeline = page.locator('[data-testid="timeline"]')
    await expect(timeline).toBeVisible()
  })

  test('should display keyboard shortcuts', async () => {
    // Press Ctrl+K
    await page.keyboard.press('Control+k')

    // Check command palette
    const commandPalette = page.locator('[data-testid="command-palette"]')
    await expect(commandPalette).toBeVisible()

    // Close it
    await page.keyboard.press('Escape')
  })
})

test.describe('CineWeave Studio - Security', () => {
  let electronApp: any;
  let page: any;

  test.beforeAll(async () => {
    electronApp = await electron.launch({
      args: [path.join(__dirname, '../../out/main/index.js')],
      executablePath: process.env.ELECTRON_EXECUTABLE_PATH
    })
    page = await electronApp.firstWindow()
  })

  test.afterAll(async () => {
    await electronApp.close()
  })

  test('should have node integration disabled', async () => {
    const hasNode = await page.evaluate(() => typeof (window as any).require !== 'undefined')
    expect(hasNode).toBe(false)
  })

  test('should have context isolation enabled', async () => {
    const hasContextIsolation = await page.evaluate(() => {
      return (window as any).electron !== undefined
    })
    expect(hasContextIsolation).toBe(true)
  })

  test('should block javascript: URLs', async () => {
    // Try to navigate to javascript: URL
    const result = await page.evaluate(() => {
      try {
        window.location.href = 'javascript:alert(1)'
        return 'allowed'
      } catch {
        return 'blocked'
      }
    })
    expect(result).toBe('blocked')
  })
})
