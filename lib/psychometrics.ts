export interface IrtResponse {
  a: number;
  b: number;
  c: number;
  correct: boolean;
}
const finite = (...xs: number[]) => {
  if (xs.some((x) => !Number.isFinite(x))) throw new Error('Expected finite parameters');
};
const clamp = (x: number, a: number, b: number) => Math.max(a, Math.min(b, x));

export function threePL(theta: number, a: number, b: number, c = 0.25): number {
  finite(theta, a, b, c);
  if (a <= 0 || c < 0 || c >= 1) throw new Error('Invalid IRT parameters');
  return c + (1 - c) / (1 + Math.exp(-clamp(1.702 * a * (theta - b), -700, 700)));
}
export function abilityMLE(responses: IrtResponse[]) {
  if (!responses.length) return { theta: 0, se: null, information: 0, stability: 'Early estimate' };
  const ll = (t: number) =>
    responses.reduce((s, r) => {
      const p = clamp(threePL(t, r.a, r.b, r.c), 1e-12, 1 - 1e-12);
      return s + Math.log(r.correct ? p : 1 - p);
    }, 0);
  let theta = -3,
    best = -Infinity;
  for (let i = 0; i <= 240; i++) {
    const t = -3 + i * 0.025,
      value = ll(t);
    if (value > best) {
      theta = t;
      best = value;
    }
  }
  const h = 1e-4;
  for (let i = 0; i < 60; i++) {
    const f = ll(theta),
      grad = (ll(theta + h) - ll(theta - h)) / (2 * h),
      curv = (ll(theta + h) - 2 * f + ll(theta - h)) / (h * h);
    if (curv >= -1e-10) break;
    const step = clamp(grad / curv, -0.5, 0.5);
    let candidate = clamp(theta - step, -3, 3);
    for (let j = 0; j < 16 && ll(candidate) < f - 1e-12; j++) candidate = (candidate + theta) / 2;
    if (Math.abs(candidate - theta) < 1e-7) {
      theta = candidate;
      break;
    }
    theta = candidate;
  }
  const information = responses.reduce((s, r) => {
    const p = threePL(theta, r.a, r.b, r.c),
      dp = (threePL(theta + h, r.a, r.b, r.c) - threePL(theta - h, r.a, r.b, r.c)) / (2 * h);
    return s + (dp * dp) / Math.max(1e-12, p * (1 - p));
  }, 0);
  return {
    theta,
    se: information ? 1 / Math.sqrt(information) : null,
    information,
    stability: responses.length >= 10 && information >= 4 ? 'Provisional' : 'Early estimate',
  };
}
export function nominalResponse(theta: number, slopes: number[], intercepts: number[]) {
  if (slopes.length !== 4 || intercepts.length !== 4)
    throw new Error('Exactly four options required');
  finite(theta, ...slopes, ...intercepts);
  const logits = slopes.map((a, k) => a * theta + intercepts[k]),
    top = Math.max(...logits);
  const weights = logits.map((v) => Math.exp(v - top)),
    total = weights.reduce((a, b) => a + b, 0);
  return weights.map((w) => w / total);
}
export function logTimeSpeed(times: number[], betaLogs: number[], alphas: number[]) {
  if (!times.length || times.length !== betaLogs.length || times.length !== alphas.length)
    throw new Error('Matching observations required');
  finite(...times, ...betaLogs, ...alphas);
  if (times.some((t) => t <= 0) || alphas.some((a) => a <= 0))
    throw new Error('Positive times and precisions required');
  const precision = alphas.reduce((s, a) => s + a * a, 0);
  return {
    tau: alphas.reduce((s, a, i) => s + a * a * (betaLogs[i] - Math.log(times[i])), 0) / precision,
    se: 1 / Math.sqrt(precision),
  };
}
export function pressureAdjusted(
  theta: number,
  t: number,
  betaSeconds: number,
  grace = 0,
  lambda = 0.15,
  delta = 0.22,
) {
  finite(theta, t, betaSeconds, grace, lambda, delta);
  if (t <= 0 || betaSeconds <= 0 || Math.min(grace, lambda, delta) < 0)
    throw new Error('Invalid timing parameters');
  return (
    theta - lambda * Math.max(0, betaSeconds / t - 1) - delta * Math.log1p(grace / betaSeconds)
  );
}
export function calibration(confidences: number[], outcomes: number[]) {
  if (!confidences.length || confidences.length !== outcomes.length)
    throw new Error('Matching observations required');
  finite(...confidences, ...outcomes);
  if (confidences.some((f) => f < 0 || f > 1) || outcomes.some((o) => o !== 0 && o !== 1))
    throw new Error('Invalid probabilities');
  const bins: { f: number; o: number }[][] = Array.from({ length: 5 }, () => []);
  confidences.forEach((f, i) => bins[Math.min(4, Math.floor(f * 5))].push({ f, o: outcomes[i] }));
  return {
    brier: confidences.reduce((s, f, i) => s + (f - outcomes[i]) ** 2, 0) / outcomes.length,
    ece: bins.reduce(
      (s, b) =>
        !b.length
          ? s
          : s +
            (b.length / outcomes.length) *
              Math.abs(
                b.reduce((v, x) => v + x.o, 0) / b.length -
                  b.reduce((v, x) => v + x.f, 0) / b.length,
              ),
      0,
    ),
  };
}

export const PACING = [
  { name: 'First exposure', factor: 1.6, description: 'Space to understand the problem.' },
  { name: 'Guided practice', factor: 1.3, description: 'Build a steady solving rhythm.' },
  { name: 'Exam pace', factor: 1.0, description: 'Meet the calibrated benchmark.' },
  { name: 'Pressure practice', factor: 0.8, description: 'Precision, with a little less time.' },
] as const;
export type ChangeLabel =
  'Evidence-led change' | 'Reconsidered selection' | 'Late response-window switch';
export function classifyChange(
  atSeconds: number,
  dwellSeconds: number,
  windowSeconds: number,
): ChangeLabel {
  if (atSeconds >= windowSeconds * 0.85) return 'Late response-window switch';
  if (dwellSeconds >= 20) return 'Evidence-led change';
  return 'Reconsidered selection';
}
export function nextPacingTier(current: number, timelyStreak: number) {
  return Math.min(3, Math.max(0, current) + (timelyStreak >= 3 ? 1 : 0));
}
