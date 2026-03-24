const { test, expect } = require('@playwright/test');

const VIEWPORTS = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'tablet',  width: 1024, height: 768 },
  { name: 'mobile',  width: 375,  height: 812 },
];

// Wait for less.js to finish compiling and applying styles.
// Checks that the about-container has the expected beige background (#D9D5D1).
async function waitForLess(page) {
  await page.waitForFunction(() => {
    const el = document.querySelector('.about-container');
    return el && window.getComputedStyle(el).backgroundColor === 'rgb(217, 213, 209)';
  });
}

for (const vp of VIEWPORTS) {
  test.describe(vp.name, () => {
    test.use({ viewport: { width: vp.width, height: vp.height } });

    test('default', async ({ page }) => {
      await page.goto('/');
      await waitForLess(page);
      await expect(page).toHaveScreenshot(`${vp.name}-default.png`, { fullPage: true });
    });

    // Menu button only exists on tablet and mobile
    if (vp.name !== 'desktop') {
      test('menu open', async ({ page }) => {
        await page.goto('/');
        await waitForLess(page);
        await page.locator('.menu-button:visible').first().click();
        await page.waitForFunction(
          () => !document.getElementById('mobile-menu').classList.contains('hidden')
        );
        await expect(page).toHaveScreenshot(`${vp.name}-menu.png`, { fullPage: true });
      });
    }

    test('education popup open', async ({ page }) => {
      await page.goto('/');
      await waitForLess(page);
      await page.locator('.education-toggle:visible').first().click();
      await page.waitForFunction(
        () => !document.getElementById('education').classList.contains('hidden')
      );
      await expect(page).toHaveScreenshot(`${vp.name}-education.png`, { fullPage: true });
    });
  });
}
