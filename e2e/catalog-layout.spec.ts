import { expect, test } from '@playwright/test';

async function expectNoHorizontalOverflow(page: import('@playwright/test').Page) {
  const dimensions = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
    overflowingElements: Array.from(document.querySelectorAll('body *'))
      .map((element) => {
        const rect = element.getBoundingClientRect();
        return {
          element: `${element.tagName.toLowerCase()}.${element.className}`,
          left: Math.round(rect.left),
          right: Math.round(rect.right),
          width: Math.round(rect.width),
        };
      })
      .filter(({ left, right }) => right > document.documentElement.clientWidth + 1 || left < -1)
      .slice(0, 12),
  }));

  expect(
    dimensions.scrollWidth,
    JSON.stringify(dimensions.overflowingElements, null, 2),
  ).toBeLessThanOrEqual(dimensions.clientWidth);
}

test.describe('Katalog görünümü', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('liste ve kart görünümü ekran dışına taşmaz', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByRole('button', { name: 'Toptan Liste Görünümü' })).toBeVisible();
    await expectNoHorizontalOverflow(page);

    await page.getByRole('button', { name: 'Kart Görünümü' }).click();
    await expect(page.locator('.product-card').first()).toBeVisible();
    await expectNoHorizontalOverflow(page);

    const firstCard = page.locator('.product-card').first();
    const addButton = firstCard.getByRole('button', { name: 'Sepete ekle' });
    await expect(addButton).toBeVisible();

    const [cardBox, buttonBox] = await Promise.all([firstCard.boundingBox(), addButton.boundingBox()]);
    const buttonDimensions = await addButton.evaluate((button) => ({
      clientWidth: button.clientWidth,
      scrollWidth: button.scrollWidth,
    }));
    expect(cardBox).not.toBeNull();
    expect(buttonBox).not.toBeNull();
    expect(buttonBox!.x).toBeGreaterThanOrEqual(cardBox!.x);
    expect(buttonBox!.x + buttonBox!.width).toBeLessThanOrEqual(cardBox!.x + cardBox!.width);
    expect(buttonDimensions.clientWidth).toBeGreaterThanOrEqual(buttonDimensions.scrollWidth);
    await addButton.click();
    await expect(page.locator('.header-actions').getByText('1', { exact: true })).toBeVisible();
  });

  test('canlı arama sonuçları hizalıdır ve sepete ürün ekler', async ({ page }) => {
    await page.goto('/');
    await page.getByPlaceholder(/Ürün adı, marka/).fill('çelik');

    const modal = page.locator('.search-modal-window');
    await expect(modal).toBeVisible();
    await expectNoHorizontalOverflow(page);

    const cards = modal.locator('.live-search-card');
    await expect(cards).toHaveCount(3);

    const cardWidths = await cards.evaluateAll((elements) => elements.map((element) => Math.round(element.getBoundingClientRect().width)));
    expect(new Set(cardWidths).size).toBe(1);

    const addButton = cards.first().getByRole('button', { name: /sepete ekle/i });
    await expect(addButton).toBeVisible();
    await addButton.click();

    await expect(modal).toBeVisible();
    await expect(page.locator('.header-actions').getByText('1', { exact: true })).toBeVisible();
  });
});
