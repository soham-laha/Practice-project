// Runtime/model code starts only after explicit consent.
export * from './local-assistant-protocol';

export function localSupport(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    !!navigator.gpu &&
    typeof navigator.gpu.requestAdapter === 'function' &&
    typeof Worker !== 'undefined'
  );
}

export function createLocalWorker(): Worker {
  return new Worker(new URL('./local-assistant.worker.ts', import.meta.url), { type: 'module' });
}
