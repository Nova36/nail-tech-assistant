/**
 * Epic F recon script — screenshots across desktop/iPad-landscape/iPhone viewports.
 * Runs against the LIVE dev server on port 3100 (real Firebase, no emulator).
 * Auth: email-link flow — we screenshot the login page + redirect wall.
 * We cannot auto-complete the real email link, so authenticated routes
 * show the redirect-to-login state, which is itself a polish finding.
 */
import { mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

import { chromium } from '@playwright/test';

const BASE_URL = 'http://localhost:3000';
const __dir = dirname(fileURLToPath(import.meta.url));

const VIEWPORTS = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'ipad-landscape', width: 1180, height: 820 },
  { name: 'iphone', width: 390, height: 844 },
];

const ROUTES = [
  { path: '/login', name: '01-login' },
  { path: '/', name: '02-dashboard-redirect' },
  { path: '/design/new', name: '03-design-new-redirect' },
  { path: '/library', name: '04-library-redirect' },
  { path: '/pinterest', name: '05-pinterest-redirect' },
];

async function run() {
  const browser = await chromium.launch({ headless: true });

  for (const vp of VIEWPORTS) {
    const dir = join(__dir, vp.name);
    mkdirSync(dir, { recursive: true });

    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: 1,
    });
    const page = await context.newPage();

    // Capture console errors
    const consoleErrors = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', (err) =>
      consoleErrors.push(`PAGEERROR: ${err.message}`)
    );

    for (const route of ROUTES) {
      try {
        await page.goto(`${BASE_URL}${route.path}`, {
          waitUntil: 'networkidle',
          timeout: 15000,
        });
        await page.waitForTimeout(800);
        const screenshotPath = join(dir, `${route.name}.png`);
        await page.screenshot({ path: screenshotPath, fullPage: true });
        const finalUrl = page.url();
        console.log(`[${vp.name}] ${route.path} → ${finalUrl} ✓`);
      } catch (e) {
        console.error(`[${vp.name}] ${route.path} FAILED: ${e.message}`);
      }
    }

    // Extra: try login form interaction
    try {
      await page.goto(`${BASE_URL}/login`, {
        waitUntil: 'networkidle',
        timeout: 15000,
      });
      await page.waitForTimeout(500);
      // Fill allowed email to see form state
      const emailInput = page.getByLabel(/email/i);
      if (await emailInput.isVisible()) {
        await emailInput.fill('test@example.com');
        await page.screenshot({
          path: join(dir, '06-login-email-filled.png'),
          fullPage: true,
        });
        // Submit with disallowed email to see error state
        const submitBtn = page.getByRole('button', {
          name: /sign in|send.*link|continue/i,
        });
        if (await submitBtn.isVisible()) {
          await submitBtn.click();
          await page.waitForTimeout(1000);
          await page.screenshot({
            path: join(dir, '07-login-error-state.png'),
            fullPage: true,
          });
          console.log(`[${vp.name}] login-error-state ✓`);
        }
      }
    } catch (e) {
      console.error(`[${vp.name}] login-interaction FAILED: ${e.message}`);
    }

    if (consoleErrors.length > 0) {
      console.warn(`[${vp.name}] Console errors collected:`);
      consoleErrors.forEach((e) => console.warn(`  ${e}`));
    }

    await context.close();
  }

  await browser.close();
  console.log('Recon complete.');
}

run().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
