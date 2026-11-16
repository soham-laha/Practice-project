import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { openDB } from 'idb';
import { KEYS, loadLearner, persistLearner, resetLocalData } from '@/lib/storage';
import { EMPTY_LEARNER } from '@/lib/types';

vi.mock('idb', () => ({ openDB: vi.fn() }));
const mockOpen = vi.mocked(openDB);
const db = { get: vi.fn(), put: vi.fn(), clear: vi.fn(), close: vi.fn() };
let values: Map<string, string>;
beforeEach(() => {
  vi.clearAllMocks();
  values = new Map();
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  });
  mockOpen.mockResolvedValue(db as unknown as Awaited<ReturnType<typeof openDB>>);
  db.get.mockResolvedValue(undefined);
  db.put.mockResolvedValue(undefined);
  db.clear.mockResolvedValue(undefined);
  vi.stubGlobal('sessionStorage', { removeItem: vi.fn() });
});
afterEach(() => vi.unstubAllGlobals());

describe('local persistence failover', () => {
  it('returns an independent empty workspace without any credential', async () => {
    const learner = await loadLearner();
    expect(learner).toEqual(EMPTY_LEARNER);
    expect(learner).not.toBe(EMPTY_LEARNER);
    expect(db.close).toHaveBeenCalledOnce();
  });
  it('prefers a newer fallback over stale IndexedDB and migrates it on save', async () => {
    const fallback = { ...EMPTY_LEARNER, tier: 1 };
    values.set(KEYS.fallback, JSON.stringify(fallback));
    db.get.mockResolvedValue(EMPTY_LEARNER);
    const learner = await loadLearner();
    expect(learner.tier).toBe(1);
    expect(db.get).not.toHaveBeenCalled();
    await persistLearner(learner);
    expect(db.put).toHaveBeenCalledWith('state', learner, 'learner');
    expect(values.has(KEYS.fallback)).toBe(false);
  });
  it('saves a fallback after a failed DB write and closes the handle', async () => {
    db.put.mockRejectedValueOnce(new Error('quota'));
    await persistLearner({ ...EMPTY_LEARNER, tier: 2 });
    expect(JSON.parse(values.get(KEYS.fallback)!).tier).toBe(2);
    expect(db.close).toHaveBeenCalledOnce();
    expect((await loadLearner()).tier).toBe(2);
  });
  it('still reads IndexedDB if localStorage is restricted', async () => {
    vi.stubGlobal('localStorage', {
      getItem: () => {
        throw new Error('restricted');
      },
    });
    db.get.mockResolvedValue(EMPTY_LEARNER);
    expect(await loadLearner()).toEqual(EMPTY_LEARNER);
  });
  it('does not claim a successful reset when IndexedDB cannot be cleared', async () => {
    db.clear.mockRejectedValueOnce(new Error('storage blocked'));
    values.set(KEYS.fallback, JSON.stringify(EMPTY_LEARNER));
    await expect(resetLocalData()).rejects.toThrow('storage blocked');
    expect(db.close).toHaveBeenCalledOnce();
    expect(values.has(KEYS.fallback)).toBe(true);
  });
  it('clears canonical history and owned keys, without touching other apps', async () => {
    for (const key of Object.values(KEYS)) values.set(key, 'fixture');
    values.set('another-app', 'untouched');
    await resetLocalData();
    expect(db.clear).toHaveBeenCalledWith('state');
    expect(db.close).toHaveBeenCalledOnce();
    expect([...values]).toEqual([['another-app', 'untouched']]);
    expect(sessionStorage.removeItem).toHaveBeenCalledWith(KEYS.active);
    expect(sessionStorage.removeItem).toHaveBeenCalledWith(KEYS.forged);
  });
  it('rejects a corrupt fallback instead of silently losing the newest data', async () => {
    values.set(KEYS.fallback, JSON.stringify({ ...EMPTY_LEARNER, secret: 'not allowed' }));
    await expect(loadLearner()).rejects.toThrow();
  });
});
