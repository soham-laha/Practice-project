import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const MODEL = 'SmolLM2-360M-Instruct-q4f32_1-MLC';
const source = `https://huggingface.co/mlc-ai/${MODEL}/resolve/main/params_shard_0.bin`;
const other = 'https://huggingface.co/mlc-ai/another-model/resolve/main/params_shard_0.bin';
const external =
  /^https:\/\/(?:huggingface\.co|raw\.githubusercontent\.com|[^/]*\.hf\.co|[^/]*\.huggingface\.co|generativelanguage\.googleapis\.com)\//;

async function openLocal(page: Page) {
  await page.goto('/forge');
  await page.locator('#local-assistant summary').click();
  await expect(
    page.getByRole('button', { name: 'Load local assistant', exact: false }),
  ).toBeVisible();
}
async function fakeWorker(page: Page) {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'gpu', {
      configurable: true,
      value: { requestAdapter: () => null },
    });
    const clients: Array<{
      onmessage: ((event: { data: unknown }) => void) | null;
      onerror: ((event: { preventDefault: () => void }) => void) | null;
      commands: unknown[];
      terminated: boolean;
    }> = [];
    Object.defineProperty(window, '__localClients', { value: clients });
    window.Worker = class {
      onmessage = null;
      onerror = null;
      commands: unknown[] = [];
      terminated = false;
      constructor() {
        clients.push(this);
      }
      postMessage(command: unknown) {
        this.commands.push(command);
      }
      terminate() {
        this.terminated = true;
      }
    } as unknown as typeof Worker;
  });
}
async function deliver(page: Page, data: unknown) {
  await page.evaluate((message) => {
    const clients = (
      window as unknown as {
        __localClients: Array<{ onmessage: (event: { data: unknown }) => void }>;
      }
    ).__localClients;
    clients.at(-1)!.onmessage({ data: message });
  }, data);
}
async function clientState(page: Page) {
  return page.evaluate(() =>
    (
      window as unknown as { __localClients: Array<{ commands: unknown[]; terminated: boolean }> }
    ).__localClients.map(({ commands, terminated }) => ({ commands, terminated })),
  );
}

test('consent is explicit; the real worker removes partial model files without fetching a manifest', async ({
  page,
}) => {
  const requests: string[] = [];
  page.on('request', (request) => {
    if (external.test(request.url()) || request.url().includes('/api/engine/'))
      requests.push(request.url());
  });
  await openLocal(page);
  expect(requests).toEqual([]);
  await page.evaluate(
    async ({ source, other }) => {
      const store = await caches.open('webllm/model');
      await store.put(source, new Response('tiny synthetic shard; not model weights'));
      await store.put(other, new Response('unrelated model fixture'));
    },
    { source, other },
  );
  await page.getByRole('button', { name: 'Remove downloaded model' }).click();
  await expect(
    page.getByRole('status').filter({ hasText: 'Downloaded model files removed.' }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      async ({ source, other }) => {
        const store = await caches.open('webllm/model');
        return { own: !!(await store.match(source)), other: !!(await store.match(other)) };
      },
      { source, other },
    ),
  ).toEqual({ own: false, other: true });
  expect(requests).toEqual([]);
});

test('unsupported WebGPU does not create a worker, download files or contact Gemini', async ({
  page,
}) => {
  await fakeWorker(page);
  await page.addInitScript(() =>
    Object.defineProperty(navigator, 'gpu', { configurable: true, value: undefined }),
  );
  const network: string[] = [];
  page.on('request', (request) => {
    if (external.test(request.url()) || request.url().includes('/api/engine/'))
      network.push(request.url());
  });
  await openLocal(page);
  await page.getByRole('button', { name: 'Load local assistant', exact: false }).click();
  await expect(
    page.getByRole('status').filter({ hasText: 'does not expose WebGPU' }),
  ).toBeVisible();
  expect(await clientState(page)).toEqual([]);
  expect(network).toEqual([]);
});

test('local lifecycle: explicit load, Stop, single-turn text, unverified answer, Unload and Remove', async ({
  page,
}) => {
  await fakeWorker(page);
  const requests: string[] = [];
  page.on('request', (request) => {
    if (external.test(request.url()) || request.url().includes('/api/engine/'))
      requests.push(request.url());
  });
  await openLocal(page);
  expect(await clientState(page)).toEqual([]);
  await page.getByRole('button', { name: 'Load local assistant', exact: false }).click();
  await expect(
    page.getByRole('progressbar', { name: 'Local model loading progress' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Stop local assistant' }).click();
  expect((await clientState(page))[0].terminated).toBe(true);
  await page.getByRole('button', { name: 'Load local assistant', exact: false }).click();
  await deliver(page, { kind: 'ready' });
  await page
    .getByRole('textbox', { name: 'Ask the local text assistant' })
    .fill('Make a short sign-check reminder.');
  await page.getByRole('button', { name: 'Ask on this device' }).click();
  expect((await clientState(page))[1].commands).toEqual([
    { kind: 'load' },
    { kind: 'ask', text: 'Make a short sign-check reminder.' },
  ]);
  await page.getByRole('button', { name: 'Stop local assistant' }).click();
  expect((await clientState(page))[1].terminated).toBe(true);
  await page.getByRole('button', { name: 'Load local assistant', exact: false }).click();
  await deliver(page, { kind: 'ready' });
  await page.getByRole('button', { name: 'Ask on this device' }).click();
  await deliver(page, {
    kind: 'answer',
    text: 'Check the sign before squaring. <img src=x onerror=alert(1)>',
  });
  await expect(page.getByText('Unverified local suggestion', { exact: true })).toBeVisible();
  await expect(page.locator('.local-answer img')).toHaveCount(0);
  await expect(page.locator('.local-answer')).toContainText('<img');
  const saved = await page.evaluate(() =>
    JSON.stringify({ local: { ...localStorage }, session: { ...sessionStorage } }),
  );
  expect(saved).not.toContain('Make a short sign-check reminder.');
  expect(saved).not.toContain('Check the sign before squaring.');
  const accessibility = await new AxeBuilder({ page })
    .include('#local-assistant')
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();
  expect(accessibility.violations).toEqual([]);
  await page.getByRole('button', { name: 'Unload from memory' }).click();
  expect((await clientState(page))[2].terminated).toBe(true);
  await page.getByRole('button', { name: 'Remove downloaded model' }).click();
  expect((await clientState(page))[3].commands).toEqual([{ kind: 'remove' }]);
  await deliver(page, { kind: 'removed' });
  await expect(page.locator('.local-answer')).toHaveCount(0);
  await expect(
    page.getByRole('status').filter({ hasText: 'Downloaded model files removed.' }),
  ).toBeVisible();
  expect((await clientState(page))[3].terminated).toBe(true);
  expect(requests).toEqual([]);
});

test('a bounded local deadline terminates the worker instead of silently switching to cloud', async ({
  page,
}) => {
  await fakeWorker(page);
  await openLocal(page);
  const cloud: string[] = [];
  page.on('request', (request) => {
    if (external.test(request.url()) || request.url().includes('/api/engine/'))
      cloud.push(request.url());
  });
  await page.clock.install();
  await page.getByRole('button', { name: 'Load local assistant', exact: false }).click();
  await page.clock.fastForward(600001);
  await expect(page.getByRole('alert').filter({ hasText: 'took too long' })).toBeVisible();
  expect((await clientState(page))[0].terminated).toBe(true);
  expect(cloud).toEqual([]);
});

test('the optional API check is keyless even with a saved key; source tabs support keyboard navigation', async ({
  page,
}) => {
  const key = 'keyless_health_fixture_not_a_real_key_123456';
  await page.addInitScript((key) => localStorage.setItem('targetjee.byok.gemini.v1', key), key);
  let checks = 0;
  await page.route('**/api/engine/health', async (route) => {
    checks++;
    expect(route.request().headers()['x-gemini-api-key']).toBeUndefined();
    expect(route.request().url()).not.toContain(key);
    expect(route.request().method()).toBe('GET');
    await route.fulfill({
      json: { status: 'ok', schema: 'targetjee.item.v2', revision: '1234abcd' },
    });
  });
  await page.goto('/forge');
  expect(checks).toBe(0);
  await page.getByRole('button', { name: 'Check API connection (no key)' }).click();
  await expect(
    page.getByRole('status').filter({ hasText: 'API revision: 1234abcd' }),
  ).toBeVisible();
  expect(checks).toBe(1);
  const textTab = page.getByRole('tab', { name: 'Paste text' });
  await textTab.focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('tab', { name: 'Upload image' })).toBeFocused();
  await expect(page.getByRole('tab', { name: 'Upload image' })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await page.keyboard.press('End');
  await expect(page.getByRole('tab', { name: 'Upload PDF' })).toBeFocused();
  await page.keyboard.press('Home');
  await expect(textTab).toBeFocused();
});

test('format receipts distinguish generation from quota and exclude the source/key/unknown diagnostic fields', async ({
  page,
}) => {
  const key = 'format_receipt_fixture_not_a_real_key_123456';
  const privateSource =
    'Private synthetic problem text: find the positive root of x squared equals four.';
  await page.addInitScript((key) => localStorage.setItem('targetjee.byok.gemini.v1', key), key);
  let calls = 0;
  await page.route('**/api/engine/v1/extractions', async (route) => {
    calls++;
    await route.fulfill({
      status: 422,
      json: {
        detail: 'The generated structure was incomplete. No unverified question was released.',
        diagnostic: {
          code: 'item_contract',
          stage: 'format',
          request_id: '123456abcdef',
          revision: '1234abcd',
          extra: key + privateSource,
        },
      },
    });
  });
  await page.goto('/forge');
  await page.getByLabel('Paste a complete, self-contained problem').fill(privateSource);
  await page.getByLabel('Your Gemini model').selectOption('gemini-flash-lite-latest');
  await page.getByRole('button', { name: 'Forge my drill' }).click();
  await expect(
    page.getByRole('heading', { name: 'The generated format was rejected' }),
  ).toBeVisible();
  await expect(
    page.getByRole('alert').filter({ hasText: 'The generated format was rejected' }),
  ).toContainText('Spare quota does not prevent this kind of failure.');
  await page.getByText('Technical details (no source or key)', { exact: true }).click();
  const receipt = await page.locator('.diagnostic-details pre').innerText();
  expect(receipt).toContain('item_contract');
  expect(receipt).toContain('Stage: format');
  expect(receipt).toContain('Model: gemini-flash-lite-latest');
  expect(receipt).not.toContain(key);
  expect(receipt).not.toContain(privateSource);
  expect(receipt).not.toContain('extra');
  await expect(page.getByLabel('Paste a complete, self-contained problem')).toHaveValue(
    privateSource,
  );
  expect(await page.evaluate(() => sessionStorage.getItem('targetjee.forged.v1'))).toBeNull();
  expect(calls).toBe(1);
});

test('mobile navigation keeps keyboard focus visible and returns it on Escape', async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 900 });
  await page.goto('/');
  const open = page.getByRole('button', { name: 'Open navigation', exact: true });
  await expect(page.locator('#workspace-navigation')).not.toBeVisible();
  await open.click();
  const menu = page.getByRole('dialog', { name: 'Workspace navigation' });
  await expect(menu).toBeVisible();
  await expect(menu.getByRole('link', { name: 'TargetJEE home' })).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(menu.getByRole('button', { name: 'Add Gemini key', exact: false })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(menu.getByRole('link', { name: 'TargetJEE home' })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(menu).not.toBeVisible();
  await expect(open).toBeFocused();
});

test('real runtime imports under production CSP; an intercepted config download fails without provider fallback', async ({
  page,
  context,
}) => {
  await openLocal(page);
  test.skip(
    !(await page.evaluate(() => !!navigator.gpu)),
    'This browser has no WebGPU interface; actual runtime import is not exercised.',
  );
  const origin = new URL(page.url()).origin;
  const blocked: string[] = [];
  const cloud: string[] = [];
  await context.route('**/*', (route) => {
    const url = route.request().url();
    if (url.includes('/api/engine/')) {
      cloud.push(url);
      return route.abort();
    }
    if (new URL(url).origin !== origin) {
      blocked.push(url);
      return route.abort(); // No request leaves the test browser, no real weights or config fetched.
    }
    return route.continue();
  });
  await page.getByRole('button', { name: 'Load local assistant', exact: false }).click();
  await expect(
    page.getByRole('alert').filter({ hasText: 'The local assistant could not run.' }),
  ).toBeVisible();
  expect(blocked).toEqual([
    `https://huggingface.co/mlc-ai/${MODEL}/resolve/main/mlc-chat-config.json`,
  ]);
  expect(cloud).toEqual([]);
});
