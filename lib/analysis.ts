import {
  abilityMLE,
  logTimeSpeed,
  pressureAdjusted,
  calibration,
  nominalResponse,
} from './psychometrics';
import { type Session, type Learner, scoreSession, missedItems } from './types';
export function analyseSession(s: Session) {
  const responses = s.items.map((item) => ({
    a: item.a,
    b: item.b,
    c: item.c,
    correct: s.attempts.find((a) => a.itemId === item.id)?.selected === item.correct_id,
  }));
  const ability = abilityMLE(responses);
  const answered = s.attempts.filter((a) => a.selected !== null && a.elapsed > 0);
  const speed = answered.length
    ? logTimeSpeed(
        answered.map((a) => a.elapsed),
        answered.map((a) => Math.log(s.items.find((i) => i.id === a.itemId)!.beta_seconds)),
        answered.map((a) => s.items.find((i) => i.id === a.itemId)!.alpha),
      )
    : null;
  const tagged = s.diagnostic
    ? s.attempts.filter((a) => a.confidence !== null && a.selected !== null)
    : [];
  const cal = tagged.length
    ? calibration(
        tagged.map((a) => a.confidence!),
        tagged.map((a) =>
          Number(s.items.find((i) => i.id === a.itemId)!.correct_id === a.selected),
        ),
      )
    : null;
  const adjusted = answered.map((a) => {
    const item = s.items.find((i) => i.id === a.itemId)!;
    return pressureAdjusted(ability.theta, a.elapsed, item.beta_seconds, a.grace);
  });
  return {
    score: scoreSession(s),
    maximum: s.items.length * 4,
    recoverable: s.items.length * 4 - scoreSession(s),
    correct: responses.filter((r) => r.correct).length,
    answered: answered.length,
    missed: missedItems(s),
    ability,
    speed,
    cal,
    tagged: tagged.length,
    adjusted: adjusted.length ? adjusted.reduce((a, b) => a + b, 0) / adjusted.length : null,
  };
}
export function optionProbabilities(session: Session, itemId: string) {
  const item = session.items.find((i) => i.id === itemId)!;
  return nominalResponse(
    analyseSession(session).ability.theta,
    item.options.map((o) => o.slope),
    item.options.map((o) => o.intercept),
  );
}
export function getFlashcards(learner: Learner) {
  return learner.sessions.flatMap((s) =>
    s.items.flatMap((item) => {
      const attempt = s.attempts.find((a) => a.itemId === item.id),
        trap = item.options.find((o) => o.id === attempt?.selected)?.trap;
      if (!trap) return [];
      const id = `${s.id}:${item.id}`;
      return [{ id, sessionId: s.id, item, trap, repair: learner.repairs[id] }];
    }),
  );
}
/** Basic numeric equivalence offline; symbolic certificates remain backend-verified. */
export function recoveryMatches(input: string, answer: string, expression: string) {
  const norm = (s: string) =>
    s.trim().replaceAll('−', '-').replaceAll(' ', '').replaceAll('\\,', '').toLowerCase();
  const numeric = (s: string): number | null => {
    const value = norm(s);
    if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:\/[+-]?(?:\d+(?:\.\d*)?|\.\d+))?$/.test(value))
      return null;
    const [n, d] = value.split('/').map(Number),
      out = d === undefined ? n : n / d;
    return Number.isFinite(out) ? out : null;
  };
  const n = numeric(input),
    a = numeric(expression);
  if (n !== null && a !== null) return Math.abs(n - a) <= 1e-9 * Math.max(1, Math.abs(a));
  return norm(input) === norm(answer) || norm(input) === norm(expression);
}
