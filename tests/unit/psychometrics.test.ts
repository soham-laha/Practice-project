import { describe, it, expect } from 'vitest';
import {
  threePL,
  abilityMLE,
  nominalResponse,
  logTimeSpeed,
  pressureAdjusted,
  calibration,
  classifyChange,
  nextPacingTier,
} from '@/lib/psychometrics';
import { SEED_ITEMS, referenceItems, lockOptionOrder } from '@/lib/seeds';
import { recoveryMatches, analyseSession } from '@/lib/analysis';
import {
  EMPTY_LEARNER,
  learnerSchema,
  scoreSession,
  sessionSchema,
  type Session,
} from '@/lib/types';
import { withSession, KEYS } from '@/lib/storage';
const session = (): Session => ({
  id: crypto.randomUUID(),
  completedAt: new Date().toISOString(),
  exam: 'main',
  source: 'reference',
  diagnostic: false,
  tier: 0,
  items: referenceItems('main'),
  attempts: referenceItems('main').map((i) => ({
    itemId: i.id,
    selected: i.correct_id,
    elapsed: 100,
    grace: 0,
    marked: false,
    confidence: null,
    switches: [],
    flags: [],
  })),
  timeDeficits: [],
});
describe('faithful psychometric equations', () => {
  it('3PL exact midpoint and valid bounds', () => {
    expect(threePL(0, 1, 0, 0.25)).toBe(0.625);
    expect(threePL(3, 1, 0)).toBeGreaterThan(threePL(-3, 1, 0));
    expect(() => threePL(0, 0, 0)).toThrow();
  });
  it('MLE recovers known theta, finite SE and bounds', () => {
    const result = abilityMLE(
      Array.from({ length: 80 }, (_, i) => ({ a: 1, b: 0, c: 0.25, correct: i < 50 })),
    );
    expect(result.theta).toBeCloseTo(0, 5);
    expect(result.se).toBeGreaterThan(0);
    expect(abilityMLE([{ a: 1, b: 0, c: 0.25, correct: true }]).theta).toBe(3);
    expect(abilityMLE([{ a: 1, b: 0, c: 0.25, correct: false }]).theta).toBe(-3);
    expect(abilityMLE([]).theta).toBe(0);
  });
  it('NRM is normalized and numerically stable', () => {
    const result = nominalResponse(3, [1000, 1001, -1000, 0], [0, 0, 0, 0]);
    expect(result.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 12);
    expect(nominalResponse(0, [1, 2, 3, 4], [0, 0, 0, 0])).toEqual([0.25, 0.25, 0.25, 0.25]);
    expect(() => nominalResponse(0, [1], [1])).toThrow();
  });
  it('Van der Linden uses log seconds and precision squared', () => {
    const r = logTimeSpeed([100, 200], [Math.log(200), Math.log(200)], [2, 1]);
    expect(r.tau).toBeCloseTo((4 * Math.log(2)) / 5, 12);
    expect(r.se).toBeCloseTo(1 / Math.sqrt(5), 12);
    expect(() => logTimeSpeed([0], [1], [1])).toThrow();
  });
  it('SATO includes grace exactly without silently clipping', () => {
    expect(pressureAdjusted(1, 90, 180, 60)).toBeCloseTo(
      1 - 0.15 - 0.22 * Math.log1p(60 / 180),
      12,
    );
    expect(pressureAdjusted(1, 200, 180)).toBe(1);
    expect(pressureAdjusted(-3, 1, 180)).toBeLessThan(-3);
    expect(() => pressureAdjusted(0, 0, 100)).toThrow();
  });
  it('Brier and five-bin ECE handle endpoints', () => {
    expect(calibration([1, 0], [1, 0])).toEqual({ brier: 0, ece: 0 });
    const r = calibration([0.9, 0.9, 0.1, 0.1], [1, 0, 1, 0]);
    expect(r.brier).toBeCloseTo(0.41);
    expect(r.ece).toBeCloseTo(0.4);
    expect(() => calibration([], [])).toThrow();
    expect(() => calibration([1.1], [1])).toThrow();
  });
});
describe('safe, local learning workflows', () => {
  it('contains twelve versioned, four-option reference contracts', () => {
    expect(SEED_ITEMS).toHaveLength(12);
    expect(referenceItems('main')).toHaveLength(6);
    expect(referenceItems('advanced')).toHaveLength(6);
    for (const i of SEED_ITEMS) {
      expect(i.schema_version).toBe('targetjee.item.v2');
      expect(i.options.filter((o) => o.trap)).toHaveLength(3);
    }
  });
  it('locks a permutation without changing the keyed mapping', () => {
    const original = referenceItems('main'),
      locked = lockOptionOrder(original);
    expect(locked[0].options.map((o) => o.id).sort()).toEqual(['A', 'B', 'C', 'D']);
    expect(locked[0].correct_id).toBe(original[0].correct_id);
    expect(original[0].options[0].id).toBe('A');
  });
  it('advances only after three steady accurate drills; grace breaks streak', () => {
    let l = structuredClone(EMPTY_LEARNER);
    for (let i = 0; i < 3; i++) l = withSession(l, session());
    expect(l.tier).toBe(1);
    expect(l.timelyStreak).toBe(0);
    const s = session();
    s.attempts[0].grace = 60;
    s.timeDeficits = [
      { id: 'event', itemId: s.items[0].id, at: new Date().toISOString(), seconds: 60 },
    ];
    expect(withSession(l, s).timelyStreak).toBe(0);
    expect(nextPacingTier(3, 3)).toBe(3);
  });
  it('is idempotent on submission and separates scores from adjusted estimates', () => {
    const s = session(),
      l = withSession(EMPTY_LEARNER, s);
    expect(withSession(l, s).sessions).toHaveLength(1);
    expect(scoreSession(s)).toBe(24);
    s.attempts[0].selected = 'A';
    s.attempts[1].selected = null;
    expect(scoreSession(s)).toBe(15);
    expect(analyseSession(s).recoverable).toBe(9);
    expect(analyseSession(s).cal).toBeNull();
  });
  it('distinguishes observable timing, not hidden intent', () => {
    expect(classifyChange(95, 30, 100)).toBe('Late response-window switch');
    expect(classifyChange(40, 25, 100)).toBe('Evidence-led change');
    expect(classifyChange(40, 5, 100)).toBe('Reconsidered selection');
  });
  it('rejects key-bearing imports and mismatched item attempts', () => {
    expect(learnerSchema.safeParse({ ...EMPTY_LEARNER, geminiKey: 'private' }).success).toBe(false);
    const s = session();
    s.attempts[0].itemId = 'wrong-id';
    expect(sessionSchema.safeParse(s).success).toBe(false);
    expect(KEYS.key).toBe('targetjee.byok.gemini.v1');
  });
  it('keeps self-rated revision separate from verified recovery checks', () => {
    const time = new Date().toISOString();
    const l = learnerSchema.parse({
      ...EMPTY_LEARNER,
      repairs: { card: { at: time, dueAt: time, box: 1, attempts: 1 } },
    });
    expect(l.repairs.card.recoveryAt).toBeNull();
    const s = session();
    s.attempts[0].grace = 60;
    expect(sessionSchema.safeParse(s).success).toBe(false);
    const valid = session();
    expect(learnerSchema.safeParse({ ...EMPTY_LEARNER, sessions: [valid, valid] }).success).toBe(
      false,
    );
    valid.attempts[0].confidence = 0.95;
    expect(sessionSchema.safeParse(valid).success).toBe(false);
    expect(analyseSession(valid).cal).toBeNull();
  });
  it('accepts numeric equivalent recoveries without eval', () => {
    expect(recoveryMatches('0.5', '1/2', '1/2')).toBe(true);
    expect(recoveryMatches('−30', '-30', '-30')).toBe(true);
    expect(recoveryMatches('1/0', '1', '1')).toBe(false);
    expect(recoveryMatches('alert(1)', '1', '1')).toBe(false);
  });
});
