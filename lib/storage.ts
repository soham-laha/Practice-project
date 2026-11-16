import { openDB } from 'idb';
import { EMPTY_LEARNER, learnerSchema, type Learner, type Session, scoreSession } from './types';
import { nextPacingTier } from './psychometrics';
export const KEYS = {
  key: 'targetjee.byok.gemini.v1',
  model: 'targetjee.model.v1',
  theme: 'targetjee.theme.v1',
  exam: 'targetjee.exam.v1',
  summary: 'targetjee.progress.v1',
  fallback: 'targetjee.local.fallback.v1',
  active: 'targetjee.active.v1',
  forged: 'targetjee.forged.v1',
} as const;
const database = () =>
  openDB('targetjee.local.v1', 1, {
    upgrade(db) {
      db.createObjectStore('state');
    },
  });
export async function loadLearner(): Promise<Learner> {
  // A fallback means the latest canonical IndexedDB write failed. Prefer it to
  // an older DB snapshot until a successful save migrates it back.
  let fallback: string | null = null;
  try {
    fallback = localStorage.getItem(KEYS.fallback);
  } catch {
    // IndexedDB can remain usable when localStorage is restricted.
  }
  if (fallback) return learnerSchema.parse(JSON.parse(fallback));
  const db = await database();
  try {
    const raw: unknown = await db.get('state', 'learner');
    return raw ? learnerSchema.parse(raw) : structuredClone(EMPTY_LEARNER);
  } finally {
    db.close();
  }
}
export async function persistLearner(value: Learner) {
  const validated = learnerSchema.parse(value);
  let storedInDb = false;
  try {
    const db = await database();
    try {
      await db.put('state', validated, 'learner');
      storedInDb = true;
    } finally {
      db.close();
    }
  } catch {
    localStorage.setItem(KEYS.fallback, JSON.stringify(validated));
  }
  if (storedInDb) {
    try {
      localStorage.removeItem(KEYS.fallback);
    } catch {
      // The canonical write succeeded even if the fallback namespace is blocked.
    }
  }
  try {
    localStorage.setItem(
      KEYS.summary,
      JSON.stringify({ tier: value.tier, sessions: value.sessions.length }),
    );
  } catch {
    /* Nonessential index; canonical data has already been saved. */
  }
}
export function withSession(learner: Learner, session: Session): Learner {
  if (learner.sessions.some((s) => s.id === session.id)) return learner;
  const timely =
    session.timeDeficits.length === 0 &&
    session.attempts.every(
      (a) =>
        a.selected !== null &&
        a.elapsed <=
          session.items.find((i) => i.id === a.itemId)!.beta_seconds *
            [1.6, 1.3, 1, 0.8][session.tier],
    );
  const accurate = scoreSession(session) >= session.items.length * 4 * 0.7;
  const streak = timely && accurate ? Math.min(3, learner.timelyStreak + 1) : 0;
  const tier = nextPacingTier(learner.tier, streak);
  return {
    ...learner,
    sessions: [session, ...learner.sessions].slice(0, 200),
    tier,
    timelyStreak: tier !== learner.tier ? 0 : streak,
  };
}
export function exportLearner(learner: Learner) {
  const blob = new Blob([JSON.stringify(learner, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob),
    a = document.createElement('a');
  a.href = url;
  a.download = `targetjee-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
export async function importLearner(file: File): Promise<Learner> {
  if (file.size > 10 * 1024 * 1024) throw new Error('Backup must be at most 10 MB.');
  let value: unknown;
  try {
    value = JSON.parse(await file.text());
  } catch {
    throw new Error('This is not a valid JSON backup.');
  }
  const parsed = learnerSchema.safeParse(value);
  if (!parsed.success)
    throw new Error(
      'This backup does not match the TargetJEE local-data contract. Your data was not changed.',
    );
  await persistLearner(parsed.data);
  return parsed.data;
}
export async function resetLocalData() {
  // Never report a complete reset while canonical history can reappear on
  // reload. If IndexedDB is blocked/fails, the caller keeps the error visible
  // and the learner can export or clear site storage through the browser.
  const db = await database();
  try {
    await db.clear('state');
  } finally {
    db.close();
  }
  Object.values(KEYS).forEach((k) => localStorage.removeItem(k));
  sessionStorage.removeItem(KEYS.active);
  sessionStorage.removeItem(KEYS.forged);
}
