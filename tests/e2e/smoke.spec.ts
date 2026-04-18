import { test, expect } from '@playwright/test';

test('app root returns HTTP 200', async ({ page }) => {
  const response = await page.goto('/');
  expect(response?.status()).toBe(200);
});
