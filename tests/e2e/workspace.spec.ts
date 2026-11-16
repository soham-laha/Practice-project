import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const themes = [
  { name: 'Light mode', value: 'light' },
  { name: 'Dark mode', value: 'dark' },
  { name: 'High contrast mode', value: 'contrast' },
];
for (const width of [375, 768, 1440])
  for (const theme of themes) {
    test(`${width}px ${theme.value}: layout, accessibility and theme persistence`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 1000 });
      const errors: string[] = [];
      page.on('pageerror', (e) => errors.push(e.message));
      await page.goto('/');
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      await page.getByRole('button', { name: theme.name, exact: true }).click();
      await expect(page.locator('html')).toHaveAttribute('data-theme', theme.value);
      await expect
        .poll(() => page.evaluate(() => localStorage.getItem('targetjee.theme.v1')))
        .toBe(theme.value);
      for (const route of ['/', '/simulator', '/forge', '/dashboard', '/flashcards', '/science']) {
        await page.goto(route);
        await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
        await page.evaluate(() => document.fonts.ready);
        if (route === '/simulator') {
          await page.getByRole('button', { name: 'Begin reference drill' }).click();
          await expect(page.locator('.answer-option').first()).toBeVisible();
        }
        if (route === '/dashboard') {
          await page.getByRole('button', { name: 'Explore a sample report' }).click();
          await page.getByRole('button', { name: 'Deep analysis', exact: true }).click();
        }
        expect(
          await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
          `overflow on ${route}`,
        ).toBe(true);
        const result = await new AxeBuilder({ page })
          .withTags([
            'wcag2a',
            'wcag2aa',
            'wcag21aa',
            ...(theme.value === 'contrast' ? ['wcag2aaa'] : []),
          ])
          .analyze();
        expect(
          result.violations.map((v) => ({
            id: v.id,
            impact: v.impact,
            nodes: v.nodes.map((n) => n.target),
          })),
          `axe on ${route}`,
        ).toEqual([]);
        if (theme.value === 'contrast') {
          const enhanced = await new AxeBuilder({ page })
            .withRules(['color-contrast-enhanced'])
            .analyze();
          expect(
            enhanced.violations.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target) })),
            `AAA contrast on ${route}`,
          ).toEqual([]);
        }
      }
      await page.goto('/');
      await page.evaluate(() => document.fonts.ready);
      await page.screenshot({
        path: `artifacts/overview-${width}-${theme.value}.png`,
        fullPage: true,
      });
      expect(errors).toEqual([]);
    });
  }

test('seeded drill → local history → replay → redemption → flashcard → isolated second browser', async ({
  page,
  browser,
}) => {
  await page.goto('/simulator');
  await page.getByRole('button', { name: 'JEE Advanced', exact: false }).click();
  await expect(page.getByText('270', { exact: true })).toHaveCount(0); // no raw timers/gauges in setup
  await page.getByRole('button', { name: 'Diagnostic practice', exact: false }).click();
  await page.getByRole('button', { name: 'Begin reference drill' }).click();
  await expect(page.getByText('JEE Advanced', { exact: true }).first()).toBeVisible();
  await expect(page.getByText('How sure do you feel?', { exact: false })).toBeVisible();
  const before = await page.locator('.answer-option').allTextContents();
  await page.locator('.answer-option').first().click();
  await page.getByRole('button', { name: 'Certain', exact: true }).click();
  await page.getByRole('button', { name: 'Mark for Review', exact: true }).click();
  await page.reload();
  await expect(page.locator('.answer-option').first()).toBeVisible();
  expect(await page.locator('.answer-option').allTextContents()).toEqual(before);
  // Choose a known wrong option by stored ID, without relying on shuffled order.
  const wrongIndex = await page.evaluate(() => {
    const state = JSON.parse(localStorage.getItem('targetjee.active.v1')!);
    return state.session.items[0].options.findIndex(
      (o: { id: string }) => o.id !== state.session.items[0].correct_id,
    );
  });
  await page.locator('.answer-option').nth(wrongIndex).click();
  await page.getByRole('button', { name: 'Certain', exact: true }).click();
  await page.getByRole('button', { name: 'Finish drill', exact: true }).click();
  await page.getByRole('button', { name: 'Submit & review', exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard\?session=/);
  await expect(page.locator('.review-item')).toHaveCount(6);
  await page.getByRole('button', { name: 'Start recovery check', exact: false }).first().click();
  const answer = await page.evaluate(async () => {
    const req = indexedDB.open('targetjee.local.v1');
    const db = await new Promise<IDBDatabase>((r) => (req.onsuccess = () => r(req.result)));
    const get = db.transaction('state').objectStore('state').get('learner');
    const l = await new Promise<{
      sessions: Array<{
        items: Array<{
          options: Array<{ id: string; trap: null | { recovery_check: { expression: string } } }>;
        }>;
        attempts: Array<{ selected: string | null }>;
      }>;
    }>((r) => (get.onsuccess = () => r(get.result)));
    const s = l.sessions[0];
    return s.items[0].options.find((o) => o.id === s.attempts[0].selected)!.trap!.recovery_check
      .expression;
  });
  await page.getByRole('textbox', { name: 'Recovery answer' }).first().fill(answer);
  await page.getByRole('button', { name: 'Check my thinking', exact: true }).first().click();
  await expect(
    page.getByText('Thinking repaired. Keep the rule.', { exact: false }).first(),
  ).toBeVisible();
  await page.reload();
  await expect(page.getByText('This recovery is saved.', { exact: false }).first()).toBeVisible();
  await page.goto('/flashcards');
  await expect(page.locator('.revision-card')).toHaveCount(1);
  await page.getByRole('button', { name: 'Reveal the thinking', exact: false }).click();
  await page.getByRole('button', { name: 'I recalled it', exact: false }).click();
  const second = await browser.newContext();
  const other = await second.newPage();
  await other.goto('/dashboard');
  await expect(other.getByText('Your first insight is', { exact: false })).toBeVisible();
  await second.close();
});

test('BYOK key isolation, modal keyboard, removal, safe export and proxy transport', async ({
  page,
}) => {
  const key = 'test_fixture_key_not_real_123456789';
  await page.goto('/');
  await page.locator('.key-pill').click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByLabel('Gemini API key', { exact: false }).fill(key);
  await page.getByRole('button', { name: 'Save key on this device' }).click();
  await expect
    .poll(() => page.evaluate(() => localStorage.getItem('targetjee.byok.gemini.v1')))
    .toBe(key);
  await page.route('**/api/engine/v1/coach', async (route) => {
    expect(route.request().headers()['x-gemini-api-key']).toBe(key);
    expect(route.request().url()).not.toContain(key);
    expect(route.request().postData()).not.toContain(key);
    await route.fulfill({
      json: {
        reply:
          'Check the domain before squaring. Try solving $x^2=4$ with $x>0$: the answer is $2$.',
      },
    });
  });
  await page.goto('/dashboard');
  await page.getByLabel('Ask your AI study coach').fill('Help me plan a drill');
  await page.getByRole('button', { name: 'Send message to coach' }).click();
  await expect(page.getByText('Check the domain before squaring.', { exact: false })).toBeVisible();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export JSON' }).click();
  const download = await downloadPromise;
  const stream = await download.createReadStream();
  const chunks: Buffer[] = [];
  for await (const c of stream!) chunks.push(c);
  expect(Buffer.concat(chunks).toString()).not.toContain(key);
  await page.locator('.key-pill').click();
  await page.getByRole('button', { name: 'Remove / Clear Key' }).click();
  expect(await page.evaluate(() => localStorage.getItem('targetjee.byok.gemini.v1'))).toBeNull();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).not.toBeVisible();
});

test('Main NTA drill completes without diagnostic clutter and survives export/reset/import', async ({
  page,
}) => {
  await page.goto('/simulator?start=reference');
  await expect(page.locator('.answer-option').first()).toBeVisible();
  await expect(page.getByText('How sure do you feel?', { exact: false })).toHaveCount(0);
  for (let question = 0; question < 6; question++) {
    const correct = await page.evaluate(() => {
      const active = JSON.parse(localStorage.getItem('targetjee.active.v1')!);
      const item = active.session.items[active.index];
      return item.options.findIndex((option: { id: string }) => option.id === item.correct_id);
    });
    await page.locator('.answer-option').nth(correct).click();
    if (question < 5) await page.getByRole('button', { name: 'Save & Next', exact: true }).click();
  }
  await page.getByRole('button', { name: 'Finish drill', exact: true }).first().click();
  await page.getByRole('button', { name: 'Submit & review', exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard\?session=/);
  await expect(page.getByText('6 of 6 answered correctly', { exact: true })).toBeVisible();
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export JSON', exact: true }).click();
  const download = await pending,
    stream = await download.createReadStream(),
    chunks: Buffer[] = [];
  for await (const chunk of stream!) chunks.push(chunk);
  const backup = Buffer.concat(chunks);
  expect(JSON.parse(backup.toString()).sessions).toHaveLength(1);
  await page.getByRole('button', { name: 'Reset local data', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('button', { name: 'Remove all local data', exact: true }).click();
  await expect(page.getByText('Your first insight is', { exact: false })).toBeVisible();
  await page
    .getByLabel('Import local data backup', { exact: true })
    .setInputFiles({ name: 'backup.json', mimeType: 'application/json', buffer: backup });
  await expect(page.getByText('6 of 6 answered correctly', { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByText('6 of 6 answered correctly', { exact: true })).toBeVisible();
});

test('grace extensions append events and do not interrupt answers', async ({ page }) => {
  await page.goto('/simulator?start=reference');
  await expect(page.locator('.answer-option').first()).toBeVisible();
  await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem('targetjee.active.v1')!);
    s.session.attempts[0].elapsed = 200;
    s.tickAt = Date.now();
    localStorage.setItem('targetjee.active.v1', JSON.stringify(s));
    history.replaceState({}, '', '/simulator');
  });
  await page.reload();
  await expect(page.getByRole('region', { name: 'Optional grace time' })).toBeVisible();
  await page.getByRole('button', { name: '+1 min', exact: true }).click();
  const state = await page.evaluate(() => JSON.parse(localStorage.getItem('targetjee.active.v1')!));
  expect(state.session.timeDeficits).toHaveLength(1);
  expect(state.session.timeDeficits[0].seconds).toBe(60);
  expect(state.session.attempts[0].grace).toBe(60);
  await page.locator('.answer-option').first().click();
  await expect(page.locator('.answer-option[aria-pressed=true]')).toHaveCount(1);
});
