import { test, expect } from '@playwright/test';

const firebaseEmail = process.env.E2E_FIREBASE_EMAIL;
const firebasePassword = process.env.E2E_FIREBASE_PASSWORD;

test.describe('RECALL — Complete Dashboard Workflow & Backend Suite', () => {
  test.skip(!firebaseEmail || !firebasePassword, 'Set E2E_FIREBASE_EMAIL and E2E_FIREBASE_PASSWORD for Firebase-authenticated tests.');

  test('Complete End-to-End Journey: Auth → Dashboard → Incidents → Investigation → Memory → Analytics → Reports → Settings → Demo → Logout', async ({ page }) => {
    test.setTimeout(180000);

    // -------------------------------------------------------------
    // 1. Verify Public Website Pages
    // -------------------------------------------------------------
    await page.goto('http://localhost:3000/');
    await expect(page).toHaveTitle(/RECALL/i);
    await expect(page.locator('h1')).toContainText(/Detect\. Investigate/i);

    // Features
    await page.goto('http://localhost:3000/features');
    await expect(page.locator('h1')).toBeVisible();

    // About
    await page.goto('http://localhost:3000/about');
    await expect(page.locator('h1')).toBeVisible();

    // Contact
    await page.goto('http://localhost:3000/contact');
    await expect(page.locator('h1')).toBeVisible();

    // -------------------------------------------------------------
    // 2. Verify Authentication Gate & Route Protection
    // -------------------------------------------------------------
    await page.goto('http://localhost:3000/dashboard');
    await page.waitForURL(/.*login/);
    expect(page.url()).toContain('/login');

    // Invalid Login
    await page.fill('input[type="email"]', 'invalid@recall.ai');
    await page.fill('input[type="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');
    await expect(page.locator('text=Incorrect email or password')).toBeVisible({ timeout: 6000 });

    // Valid Login with credentials from the Firebase test environment
    await page.fill('input[type="email"]', firebaseEmail ?? '');
    await page.fill('input[type="password"]', firebasePassword ?? '');
    await page.click('button[type="submit"]');

    // Wait for redirect to Dashboard
    await page.waitForURL((url) => url.pathname === '/dashboard', { timeout: 15000 });
    expect(page.url()).toContain('/dashboard');

    // -------------------------------------------------------------
    // 3. Verify Authenticated Dashboard Control Center
    // -------------------------------------------------------------
    await expect(page.locator('text=Total Incidents').first()).toBeVisible();
    await expect(page.locator('text=Total Incidents').first()).toBeVisible();
    await expect(page.locator('text=Recent Incidents')).toBeVisible();
    await expect(page.locator('text=INC-1090').first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Recent Activity Feed').first()).toBeVisible();

    // -------------------------------------------------------------
    // 4. Verify Incidents CRUD & Details
    // -------------------------------------------------------------
    await page.goto('http://localhost:3000/incidents');
    await expect(page.getByRole('heading', { name: 'Incidents' })).toBeVisible();
    await expect(page.locator('text=INC-1090').first()).toBeVisible();

    // Open Incident INC-1090 details
    await page.goto('http://localhost:3000/incidents/INC-1090');
    await expect(page.locator('text=INC-1090').first()).toBeVisible();
    await expect(page.locator('text=Incident Timeline & Events')).toBeVisible();

    // Test Add Event action
    const addEventBtn = page.getByRole('button', { name: /Add Event/i });
    if (await addEventBtn.isVisible()) {
      await addEventBtn.click();
      await page.fill('textarea', 'Automated E2E health check event verification.');
      await page.locator('button[type="submit"]:has-text("Add Event")').click();
      await expect(page.locator('p:has-text("Automated E2E health check event verification.")').first()).toBeVisible({ timeout: 5000 });
    }

    // -------------------------------------------------------------
    // 5. Verify AI Investigation
    // -------------------------------------------------------------
    await page.goto('http://localhost:3000/investigation?id=INC-1090');
    await expect(page.getByRole('heading', { name: /AI Investigation/i })).toBeVisible();
    await expect(page.locator('text=AI Analysis Summary')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Recommended Action')).toBeVisible();

    // -------------------------------------------------------------
    // 6. Verify Memory Intelligence & Learning Loop
    // -------------------------------------------------------------
    await page.goto('http://localhost:3000/memory');
    await expect(page.getByRole('heading', { name: /Memory Intelligence/i })).toBeVisible();
    await expect(page.locator('text=The RECALL Learning Loop')).toBeVisible();

    // -------------------------------------------------------------
    // 7. Verify Analytics Control Center
    // -------------------------------------------------------------
    await page.goto('http://localhost:3000/analytics');
    await expect(page.getByRole('heading', { name: /System Analytics/i })).toBeVisible();
    await expect(page.locator('text=Total Incidents').first()).toBeVisible();
    await expect(page.locator('text=Mean Resolution Time by Severity')).toBeVisible();
    await expect(page.locator('text=Recurring Failure Patterns')).toBeVisible();

    // -------------------------------------------------------------
    // 8. Verify Reports Center
    // -------------------------------------------------------------
    await page.goto('http://localhost:3000/reports');
    await expect(page.getByRole('heading', { name: /Postmortem & Compliance Reports/i })).toBeVisible();
    await expect(page.locator('text=Incident Postmortem Report').first()).toBeVisible();
    await expect(page.locator('button:has-text("Export Postmortem")').first()).toBeVisible();

    // -------------------------------------------------------------
    // 9. Verify Settings & Server-Side Health Checks
    // -------------------------------------------------------------
    await page.goto('http://localhost:3000/settings');
    await expect(page.getByRole('heading', { name: /System Settings & Architecture/i })).toBeVisible();
    await expect(page.locator('text=Hindsight').first()).toBeVisible();
    await expect(page.locator('text=AI Provider').first()).toBeVisible();

    // Run Server Health Probe button
    const probeBtn = page.getByRole('button', { name: /Run Server Health Probe/i });
    await expect(probeBtn).toBeVisible();
    await probeBtn.click();
    await expect(page.locator('text=Server-side diagnostic health probe completed').or(page.locator('text=verified successfully'))).toBeVisible({ timeout: 10000 });

    // -------------------------------------------------------------
    // 10. Verify Learning Demo Loop (Hindsight Proof of Learning)
    // -------------------------------------------------------------
    await page.goto('http://localhost:3000/demo');
    await expect(page.getByRole('heading', { name: /Proof of Learning: The Hindsight Memory Loop/i })).toBeVisible();

    const startBtn = page.getByRole('button', { name: 'START DEMO LOOP' });
    await expect(startBtn).toBeVisible();
    await startBtn.click();

    // Incident 1 appears
    await expect(page.locator('text=INC-1090').first()).toBeVisible({ timeout: 10000 });

    // Step through Steps 1 to 9
    for (let step = 1; step <= 9; step++) {
      const stepBtn = page.locator('button:has-text("Step")').first();
      await stepBtn.waitFor({ state: 'visible', timeout: 15000 });
      await expect(stepBtn).toBeEnabled({ timeout: 15000 });
      await stepBtn.click();
      await page.waitForTimeout(400);
    }

    // Step 10: Verify the Hindsight moment
    await expect(page.locator('text=PREVIOUSLY ENCOUNTERED PATTERN DETECTED')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('text=Memory-Informed Immediate Recommendation')).toBeVisible();

    // -------------------------------------------------------------
    // 11. Verify Search Command Palette & Logout with Confirmation Modal
    // -------------------------------------------------------------
    await page.goto('http://localhost:3000/dashboard');
    const searchTrigger = page.locator('button:has-text("Search incidents, services")');
    if (await searchTrigger.isVisible()) {
      await searchTrigger.click();
      await expect(page.locator('text=RECALL Search Engine')).toBeVisible({ timeout: 5000 });
      await page.keyboard.press('Escape');
    }

    const logoutBtn = page.locator('button:has-text("Log Out")').first();
    if (await logoutBtn.isVisible()) {
      await logoutBtn.click();
      await expect(page.locator('text=Are you sure you want to log out?')).toBeVisible({ timeout: 5000 });
      await page.locator('button:has-text("Log Out")').last().click();
      await page.waitForURL('http://localhost:3000/');
    }
  });
});
