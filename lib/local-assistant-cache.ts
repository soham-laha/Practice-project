import { LOCAL_MODEL } from './local-assistant-protocol';

const scopes = new Set(['webllm/model', 'webllm/config', 'webllm/wasm']);
export async function removeLocalModelCache() {
  if (typeof caches === 'undefined') return;
  // Delete this model's complete AND partial entries without importing the
  // inference runtime, fetching a manifest or deleting another app's caches.
  for (const scope of await caches.keys()) {
    if (!scopes.has(scope)) continue;
    const store = await caches.open(scope);
    for (const entry of await store.keys()) {
      const url = new URL(entry.url);
      const modelFile =
        url.origin === 'https://huggingface.co' &&
        url.pathname.startsWith(`/mlc-ai/${LOCAL_MODEL}/`);
      const wasmFile =
        url.origin === 'https://raw.githubusercontent.com' &&
        url.pathname.startsWith('/mlc-ai/binary-mlc-llm-libs/') &&
        url.pathname.endsWith('/SmolLM2-360M-Instruct-q4f32_1_cs1k-webgpu.wasm');
      if (modelFile || wasmFile) await store.delete(entry);
    }
  }
}
