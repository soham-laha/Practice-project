import { afterEach, describe, expect, it, vi } from 'vitest';
import { LOCAL_MODEL, localMessages } from '@/lib/local-assistant-protocol';
import { localSupport } from '@/lib/local-assistant';
import { removeLocalModelCache } from '@/lib/local-assistant-cache';

afterEach(() => vi.unstubAllGlobals());
describe('bounded single-turn on-device assistant', () => {
  it('never reads keys or learner history, and labels its limits in the system instruction', () => {
    const read = vi.fn(() => {
      throw new Error('must not read');
    });
    vi.stubGlobal('localStorage', { getItem: read });
    const messages = localMessages('  Help me remember to check signs.  ');
    expect(messages).toHaveLength(2);
    expect(messages[0].content).toContain('Do not claim to verify');
    expect(messages[1].content).toBe('Help me remember to check signs.');
    expect(read).not.toHaveBeenCalled();
  });
  it.each(['', ' '.repeat(4), 'a'.repeat(801)])('rejects an empty/oversize prompt', (text) => {
    expect(() => localMessages(text)).toThrow('1–800');
  });
  it('requires an actual WebGPU interface and a worker', () => {
    vi.stubGlobal('navigator', { gpu: undefined });
    vi.stubGlobal('Worker', class {});
    expect(localSupport()).toBe(false);
    vi.stubGlobal('navigator', { gpu: { requestAdapter: () => null } });
    expect(localSupport()).toBe(true);
  });
});
describe('local model file deletion', () => {
  it('deletes only this model’s cached files, including partial shards, without a network fetch', async () => {
    const own = `https://huggingface.co/mlc-ai/${LOCAL_MODEL}/resolve/main/params_shard_0.bin`;
    const wasm =
      'https://raw.githubusercontent.com/mlc-ai/binary-mlc-llm-libs/main/web-llm-models/v0_2_87/base/SmolLM2-360M-Instruct-q4f32_1_cs1k-webgpu.wasm';
    const other = 'https://huggingface.co/mlc-ai/another-model/resolve/main/params_shard_0.bin';
    const remove = vi.fn().mockResolvedValue(true);
    const open = vi.fn().mockResolvedValue({
      keys: async () => [own, wasm, other].map((url) => ({ url })),
      delete: remove,
    });
    const fetch = vi.fn();
    vi.stubGlobal('fetch', fetch);
    vi.stubGlobal('caches', { keys: async () => ['webllm/model', 'unrelated-cache'], open });
    await removeLocalModelCache();
    expect(open).toHaveBeenCalledExactlyOnceWith('webllm/model');
    expect(remove.mock.calls.map(([request]) => request.url)).toEqual([own, wasm]);
    expect(fetch).not.toHaveBeenCalled();
  });
  it('propagates storage failure instead of claiming model deletion', async () => {
    vi.stubGlobal('caches', {
      keys: async () => {
        throw new Error('blocked');
      },
    });
    await expect(removeLocalModelCache()).rejects.toThrow('blocked');
  });
});
