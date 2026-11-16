export const LOCAL_MODEL = 'SmolLM2-360M-Instruct-q4f32_1-MLC';
export const LOCAL_LIMIT = 800;
export type LocalCommand = { kind: 'load' } | { kind: 'ask'; text: string } | { kind: 'remove' };
export type LocalEvent =
  | { kind: 'progress'; progress: number }
  | { kind: 'ready' }
  | { kind: 'answer'; text: string }
  | { kind: 'removed' }
  | { kind: 'error'; message: string };

// Single-turn, bounded context. Never reads localStorage, BYOK or learner history.
export function localMessages(text: string) {
  const input = text.trim();
  if (!input || input.length > LOCAL_LIMIT) throw new Error('Use 1–800 characters.');
  return [
    {
      role: 'system' as const,
      content:
        'You are a small, experimental study-notes assistant. Give one brief, practical text hint. ' +
        'Do not claim to verify mathematics, read images, create certified drills or predict exam scores. ' +
        'If uncertain, say so. Never ask for API keys or private data. Keep the answer under 100 words.',
    },
    { role: 'user' as const, content: input },
  ];
}
