import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LOCAL_MODEL, type LocalCommand } from '@/lib/local-assistant-protocol';

const runtime = vi.hoisted(() => ({
  imported: vi.fn(),
  reload: vi.fn(),
  unload: vi.fn(),
  resetChat: vi.fn(),
  complete: vi.fn(),
  construct: vi.fn(),
}));
vi.mock('@mlc-ai/web-llm', () => {
  runtime.imported();
  return {
    prebuiltAppConfig: { model_list: [{ model_id: 'SmolLM2-360M-Instruct-q4f32_1-MLC' }] },
    MLCEngine: class {
      reload = runtime.reload;
      unload = runtime.unload;
      resetChat = runtime.resetChat;
      chat = { completions: { create: runtime.complete } };
      constructor(options: unknown) {
        runtime.construct(options);
      }
    },
  };
});
const emit = vi.fn();
const network = vi.fn();
const send = (data: LocalCommand) =>
  (globalThis.onmessage as unknown as (event: { data: LocalCommand }) => Promise<void>)({ data });

beforeEach(async () => {
  vi.resetModules();
  vi.clearAllMocks();
  runtime.reload.mockResolvedValue(undefined);
  runtime.unload.mockResolvedValue(undefined);
  runtime.resetChat.mockResolvedValue(undefined);
  runtime.complete.mockResolvedValue({ choices: [{ message: { content: 'Check the sign.' } }] });
  vi.stubGlobal('onmessage', undefined);
  vi.stubGlobal('postMessage', emit);
  vi.stubGlobal('fetch', network);
  vi.stubGlobal('navigator', { gpu: {} });
  vi.stubGlobal('caches', { keys: async () => [] });
  await import('@/lib/local-assistant.worker');
});
afterEach(() => vi.unstubAllGlobals());

describe('dedicated local worker (runtime mocked; not a model-quality test)', () => {
  it('does no inference/download on import, and cache removal needs no runtime or WebGPU', async () => {
    expect(runtime.construct).not.toHaveBeenCalled();
    vi.stubGlobal('navigator', {});
    await send({ kind: 'remove' });
    expect(runtime.construct).not.toHaveBeenCalled();
    expect(network).not.toHaveBeenCalled();
    expect(emit).toHaveBeenCalledWith({ kind: 'removed' });
  });
  it('loads only the fixed model with a bounded context, then resets every single-turn exchange', async () => {
    await send({ kind: 'load' });
    expect(runtime.reload).toHaveBeenCalledExactlyOnceWith(LOCAL_MODEL, {
      context_window_size: 2048,
    });
    expect(runtime.construct).toHaveBeenCalledWith(
      expect.objectContaining({
        logLevel: 'SILENT',
        appConfig: { model_list: [{ model_id: LOCAL_MODEL }], cacheBackend: 'cache' },
      }),
    );
    await send({ kind: 'ask', text: 'A short study hint.' });
    const [options] = runtime.complete.mock.calls[0];
    expect(options).toMatchObject({ max_tokens: 180, temperature: 0.2, stream: false });
    expect(options.messages).toHaveLength(2);
    expect(options.messages[1].content).toBe('A short study hint.');
    expect(runtime.resetChat).toHaveBeenCalledOnce();
    expect(emit).toHaveBeenCalledWith({ kind: 'answer', text: 'Check the sign.' });
    expect(network).not.toHaveBeenCalled();
  });
  it('fails closed on runtime failure, with no raw prompt/exception and no cloud fallback', async () => {
    const privateText = 'private fixture material, not an API key';
    await send({ kind: 'load' });
    runtime.complete.mockRejectedValueOnce(new Error(privateText));
    await send({ kind: 'ask', text: privateText });
    expect(runtime.unload).toHaveBeenCalledOnce();
    expect(emit.mock.lastCall?.[0].kind).toBe('error');
    expect(JSON.stringify(emit.mock.calls)).not.toContain(privateText);
    expect(network).not.toHaveBeenCalled();
  });
  it('bounds output and rejects oversized input without running inference', async () => {
    await send({ kind: 'load' });
    runtime.complete.mockResolvedValueOnce({
      choices: [{ message: { content: 'x'.repeat(4000) } }],
    });
    await send({ kind: 'ask', text: 'One hint.' });
    expect(emit.mock.lastCall?.[0].text).toHaveLength(3000);
    runtime.complete.mockClear();
    await send({ kind: 'ask', text: 'x'.repeat(801) });
    expect(runtime.complete).not.toHaveBeenCalled();
    expect(emit.mock.lastCall?.[0].kind).toBe('error');
  });
});
