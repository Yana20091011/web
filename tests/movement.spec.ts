import { test, expect, type Locator } from '@playwright/test';

async function strength(slider: Locator, value: number) {
  await slider.focus();
  await slider.press('Home');
  for (let n = 0; n < value; n += 5) await slider.press('ArrowRight');
}
async function cheerOffset(pet: Locator) {
  return pet.evaluate((node) => {
    const animation = node.getAnimations()[0];
    if (!animation) throw new Error('The reaction must have a movement animation.');
    animation.pause();
    animation.currentTime = 250;
    const matrix = new DOMMatrix(getComputedStyle(node).transform);
    return { y: matrix.m42, angle: (Math.atan2(matrix.b, matrix.a) * 180) / Math.PI };
  });
}

test('scales actual reaction movement, resets it, and restores it with the saved pet', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/');
  const slider = page.getByRole('slider', { name: 'Movement strength' });
  const pet = page.getByTestId('active-pet');
  const playground = page.getByRole('textbox', { name: 'Typing playground' });
  await expect(slider).toHaveValue('100');
  await playground.press('Enter');
  await expect(pet).toHaveAttribute('data-action', 'cheer');
  const full = await cheerOffset(pet);
  expect(full.y).toBeCloseTo(-13, 1);
  expect(full.angle).toBeCloseTo(4, 1);
  await strength(slider, 25);
  await playground.press('Enter');
  const gentle = await cheerOffset(pet);
  expect(gentle.y).toBeCloseTo(full.y / 4, 1);
  expect(gentle.angle).toBeCloseTo(full.angle / 4, 1);
  await page.getByRole('button', { name: 'Reset movement strength' }).click();
  await expect(slider).toHaveValue('100');
  await strength(slider, 25);
  await page.getByRole('button', { name: 'Save pet', exact: true }).click();
  await page.reload();
  await expect(slider).toHaveValue('25');
  await expect(pet).toHaveAttribute('data-motion-strength', '25');
  expect(await page.getByRole('slider', { name: 'Pet size' }).inputValue()).toBe('100');
});

test('zero movement keeps blink frames and key reactions playing', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Animate', exact: true }).click();
  await page.getByRole('button', { name: 'Use laptop buddy', exact: true }).click();
  await expect(page.locator('.animation-frame')).toHaveCount(4);
  await strength(page.getByRole('slider', { name: 'Movement strength' }), 0);
  const pet = page.getByTestId('active-pet');
  await page.getByRole('textbox', { name: 'Typing playground' }).press('Enter');
  await expect(pet).toHaveAttribute('data-action', 'cheer');
  await expect(pet).toHaveCSS('animation-name', 'none');
  await expect(pet).toHaveCSS('transform', 'none');
  await expect(pet.locator('img')).toHaveAttribute('data-animated', 'true');
  await expect
    .poll(() => pet.locator('img').getAttribute('data-frame-index'), { intervals: [20] })
    .toBe('2');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
