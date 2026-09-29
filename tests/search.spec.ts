import { test, expect } from '@playwright/test';
import path from 'path';

const firebaseEmail = process.env.E2E_FIREBASE_EMAIL;
const firebasePassword = process.env.E2E_FIREBASE_PASSWORD;

test.describe('Search Bar History Dropdown & Fast Search Algorithm', () => {
  test.skip(!firebaseEmail || !firebasePassword, 'Set E2E_FIREBASE_EMAIL and E2E_FIREBASE_PASSWORD for Firebase-authenticated tests.');

  test('verify background blur, history dropdown, all categories, fast searching, and keyboard controls', async ({ page }) => {
    // 1. Authenticate
    await page.goto('http://localhost:3000/login');
    await page.fill('input[type="email"]', firebaseEmail ?? '');
    await page.fill('input[type="password"]', firebasePassword ?? '');
    await page.click('button[type="submit"]');
    await page.waitForURL('http://localhost:3000/dashboard');

    // 2. Find and click the search bar
    const searchInput = page.locator('input[placeholder="Search incidents, services, or memories..."]');
    await expect(searchInput).toBeVisible();
    await searchInput.click();

    // 3. Verify Background Blur Overlay is active
    const blurOverlay = page.locator('div.fixed.inset-0.bg-black\\/60.backdrop-blur-md');
    await expect(blurOverlay).toBeVisible();

    // 4. Verify History Dropdown Box
    const historyHeader = page.locator('text=Recent Search History');
    await expect(historyHeader).toBeVisible();
    await expect(page.locator('text=Clear All')).toBeVisible();

    // Check default history items
    await expect(page.locator('text=INC-1090 payment latency')).toBeVisible();
    await expect(page.locator('text=checkout-service pool limit')).toBeVisible();

    // Check Suggested Jumps
    await expect(page.locator('text=Suggested Jumps')).toBeVisible();
    await expect(page.locator('button:has-text("INC-1090")')).toBeVisible();
    await expect(page.locator('button:has-text("checkout-service")')).toBeVisible();

    // Take screenshot of History Dropdown with Background Blur Overlay
    const screenshotDir = path.join(process.cwd(), 'tests', 'screenshots');
    await page.screenshot({ path: path.join(screenshotDir, 'search_history_dropdown.png') });

    // 5. Test Fast Searching Across ALL Categories
    // Test Category 1: Services
    await searchInput.fill('checkout');
    await page.waitForTimeout(200);

    // Verify all Category Filter Pills are present
    await expect(page.locator('text=Filter:')).toBeVisible();
    await expect(page.locator('button:has-text("All Results")')).toBeVisible();
    await expect(page.locator('button:has-text("Incidents")')).toBeVisible();
    await expect(page.locator('button:has-text("Services")')).toBeVisible();
    await expect(page.locator('button:has-text("Hindsight Memory")')).toBeVisible();
    await expect(page.locator('button:has-text("Reports")')).toBeVisible();
    await expect(page.locator('button:has-text("Analytics")')).toBeVisible();
    await expect(page.locator('button:has-text("Actions")')).toBeVisible();
    await expect(page.locator('button:has-text("Navigation")')).toBeVisible();

    // Result should show checkout-service with category tag
    await expect(page.locator('text=checkout-service').first()).toBeVisible();

    // Take screenshot of Fast Search Results
    await page.screenshot({ path: path.join(screenshotDir, 'fast_search_results.png') });

    // Test Category 2: Actions & Diagnostics
    await searchInput.fill('probe');
    await page.waitForTimeout(200);
    await expect(page.locator('text=Run Server Health Probe')).toBeVisible();

    // Test Category 3: Hindsight Memory & Playbooks
    await searchInput.fill('pool');
    await page.waitForTimeout(200);
    await expect(page.locator('text=Database Connection Pool Exhaustion')).toBeVisible();

    // Test Category 4: Reports & Postmortems
    await searchInput.fill('report');
    await page.waitForTimeout(200);
    await expect(page.locator('text=Executive Postmortem Report').or(page.locator('text=Monthly Reliability')).first()).toBeVisible();

    // Test Category 5: Analytics
    await searchInput.fill('mttr');
    await page.waitForTimeout(200);
    await expect(page.locator('text=Mean Time to Resolution (MTTR) Analysis')).toBeVisible();

    // 6. Test Category Filter Pill click (filtering by Actions)
    await searchInput.fill('');
    await page.locator('button:has-text("Actions")').click();
    await expect(page.locator('text=Run Server Health Probe')).toBeVisible();
    await expect(page.locator('text=Create New Incident')).toBeVisible();

    // 7. Test keyboard navigation: ArrowDown and ArrowUp
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowUp');

    // 8. Test Escape key to close dropdown & remove blur overlay
    await page.keyboard.press('Escape');
    await expect(blurOverlay).not.toBeVisible();

    // 9. Navigate to /demo and verify OPAQUE search dropdown over heavy text
    await page.goto('http://localhost:3000/demo');
    await page.waitForURL('http://localhost:3000/demo');
    const demoSearchInput = page.locator('input[placeholder="Search incidents, services, or memories..."]');
    await demoSearchInput.click();
    await expect(page.locator('text=Recent Search History')).toBeVisible();
    await page.screenshot({ path: path.join(screenshotDir, 'demo_search_opaque.png') });

    // Click outside on the blur overlay to close
    await page.mouse.click(50, 400);
    await expect(page.locator('text=Recent Search History')).not.toBeVisible();
  });
});
