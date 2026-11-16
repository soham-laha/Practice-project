import type { MLCEngine } from '@mlc-ai/web-llm';
import { removeLocalModelCache } from './local-assistant-cache';
import {
  LOCAL_MODEL,
  localMessages,
  type LocalCommand,
  type LocalEvent,
} from './local-assistant-protocol';

let engine: MLCEngine | undefined;
let working = false;
const emit = (event: LocalEvent) => postMessage(event);

async function runtime() {
  const webllm = await import('@mlc-ai/web-llm');
  const record = webllm.prebuiltAppConfig.model_list.find((m) => m.model_id === LOCAL_MODEL);
  if (!record) throw new Error();
  // One fixed model, no remote scripts, accounts, arbitrary URLs or telemetry.
  return {
    webllm,
    appConfig: { model_list: [record], cacheBackend: 'cache' as const },
  };
}

onmessage = async ({ data }: MessageEvent<LocalCommand>) => {
  if (working) return;
  working = true;
  try {
    if (data.kind === 'load') {
      if (!navigator.gpu) throw new Error();
      const { webllm, appConfig } = await runtime();
      engine = new webllm.MLCEngine({
        appConfig,
        logLevel: 'SILENT',
        initProgressCallback: ({ progress }) =>
          emit({ kind: 'progress', progress: Math.max(0, Math.min(1, progress || 0)) }),
      });
      await engine.reload(LOCAL_MODEL, { context_window_size: 2048 });
      emit({ kind: 'ready' });
    } else if (data.kind === 'ask') {
      if (!engine) throw new Error();
      const result = await engine.chat.completions.create({
        messages: localMessages(data.text),
        max_tokens: 180,
        temperature: 0.2,
        stream: false,
      });
      const text = result.choices[0]?.message.content?.trim();
      await engine.resetChat(); // No transcript persistence or resumable sessions.
      if (!text) throw new Error();
      emit({ kind: 'answer', text: text.slice(0, 3000) });
    } else if (data.kind === 'remove') {
      await engine?.unload();
      engine = undefined;
      await removeLocalModelCache();
      emit({ kind: 'removed' });
    }
  } catch {
    // Runtime exceptions may contain source text, device details or remote URLs.
    // Do not echo them or fall back to a cloud/provider request.
    await engine?.unload().catch(() => undefined);
    engine = undefined;
    emit({
      kind: 'error',
      message:
        data.kind === 'remove'
          ? 'The downloaded files could not be fully removed. Clear this site’s browser data to remove them.'
          : 'The local assistant could not run. Check WebGPU, available memory and the download connection. No Gemini request was made. You can remove partial downloads below.',
    });
  } finally {
    working = false;
  }
};
