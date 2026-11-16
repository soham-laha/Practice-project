import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { test, expect } from '@playwright/test';
import type { Exam, GeminiModel, Item } from '@/lib/types';

// Successful responses are produced by the REAL backend parser and bounded
// verifier, with only Google's transport mocked in a separate local process.
// No production fallback or real key is used by this test.
type Fixture = {
  exam: Exam;
  model: GeminiModel;
  source: string;
  response: {
    items: Item[];
    verification: { valid: boolean }[];
    source: 'gemini';
  };
};
const KEY = 'browser_forge_fixture_not_a_real_key_012345';
let fixtures: Fixture[];
test.beforeAll(() => {
  const python = existsSync('.venv/bin/python') ? '.venv/bin/python' : 'python';
  fixtures = JSON.parse(
    execFileSync(python, ['-m', 'backend.tests.forge_fixture'], {
      encoding: 'utf8',
      timeout: 30000,
    }),
  );
  expect(fixtures).toHaveLength(4);
  expect(JSON.stringify(fixtures)).not.toContain(KEY);
});
for (const exam of ['main', 'advanced'] as const)
  for (const model of ['gemini-flash-latest', 'gemini-flash-lite-latest'] as const) {
    test(`checked ${exam} / ${model} output survives preview and starts a forged, not reference, drill`, async ({
      page,
    }) => {
      const fixture = fixtures.find((entry) => entry.exam === exam && entry.model === model)!;
      expect(fixture.response.verification.every((entry) => entry.valid)).toBe(true);
      let requests = 0;
      await page.addInitScript(
        ({ key, exam, model }) => {
          localStorage.setItem('targetjee.byok.gemini.v1', key);
          localStorage.setItem('targetjee.exam.v1', exam);
          localStorage.setItem('targetjee.model.v1', model);
        },
        { key: KEY, exam, model },
      );
      await page.route('**/api/engine/v1/extractions', async (route) => {
        const request = route.request();
        requests++;
        expect(request.postDataJSON()).toEqual({ text: fixture.source, exam, model });
        expect(request.headers()['x-gemini-api-key']).toBe(KEY);
        expect(request.url()).not.toContain(KEY);
        expect(request.postData()).not.toContain(KEY);
        await route.fulfill({ json: fixture.response });
      });
      await page.goto('/forge');
      await expect(
        page.getByRole('button', { name: 'Forge my drill', exact: false }),
      ).toBeVisible();
      await expect(page.locator('#forge-model')).toHaveValue(model);
      await expect(
        page.getByRole('button', {
          name: exam === 'main' ? 'JEE Main' : 'JEE Advanced',
          exact: false,
        }),
      ).toHaveAttribute('aria-pressed', 'true');
      await page.locator('#problem-text').fill(fixture.source);
      await page.getByRole('button', { name: 'Forge my drill', exact: false }).click();
      await expect(
        page.getByRole('heading', { name: 'Review the extracted problem.' }),
      ).toBeVisible();
      await expect(page.getByText('Algebraic certificates passed', { exact: true })).toBeVisible();
      await expect(page.locator('.forge-result')).toContainText(fixture.source);
      expect(requests).toBe(1);
      // Nothing starts or fabricates a successful session before review.
      expect(await page.evaluate(() => localStorage.getItem('targetjee.active.v1'))).toBeNull();
      await page
        .getByRole('button', { name: 'Looks right. Start this drill', exact: false })
        .click();
      await expect(page.locator('.answer-option')).toHaveCount(4);
      await expect
        .poll(() =>
          page.evaluate(
            () =>
              JSON.parse(localStorage.getItem('targetjee.active.v1') || 'null')?.session?.source,
          ),
        )
        .toBe('forged');
      const handoff = await page.evaluate(() => sessionStorage.getItem('targetjee.forged.v1'));
      expect(handoff).not.toBeNull();
      expect(handoff).not.toContain(KEY);
      expect(JSON.parse(handoff!)[0].id).toBe(`fixture-generated-lift-${exam}`);
      const active = await page.evaluate(() => localStorage.getItem('targetjee.active.v1'));
      expect(active).not.toContain(KEY);
      const session = JSON.parse(active!).session;
      expect(session.exam).toBe(exam);
      expect(session.items).toHaveLength(1);
      expect(session.items[0].id).toBe(`fixture-generated-lift-${exam}`);
      expect(session.items[0].prompt).toBe(fixture.source);
      expect(session.items[0].negative_marks).toBe(exam === 'main' ? 1 : 2);
      expect(
        session.items[0].options.every((option: Item['options'][number]) => option.latex !== '0'),
      ).toBe(true);
      expect(requests).toBe(1);
    });
  }
