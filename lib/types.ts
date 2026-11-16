import { z } from 'zod';
export type Exam = 'main' | 'advanced';
export type Theme = 'light' | 'dark' | 'contrast';
export type GeminiModel = 'gemini-flash-latest' | 'gemini-flash-lite-latest';
const text = (max = 8000) => z.string().min(1).max(max);
const finite = z.number().finite();
const timestamp = text(80).refine((s) => Number.isFinite(Date.parse(s)), 'Invalid timestamp');
export const recoverySchema = z
  .object({
    question: text(1000),
    answer: text(300),
    expression: text(300),
    target_expression: text(300),
    explanation: text(1000),
  })
  .strict();
const trapSchema = z
  .object({
    label: text(100),
    why_plausible: text(1200),
    first_wrong_pivot: text(1200),
    counterfactual_valid_when: text(1200),
    avoidance_rule: text(500),
    recovery_check: recoverySchema,
  })
  .strict();
const optionSchema = z
  .object({
    id: z.enum(['A', 'B', 'C', 'D']),
    latex: text(500),
    expression: text(300),
    derived_expression: text(300),
    unit: z.array(z.number().int()).length(3),
    slope: finite.min(-5).max(5),
    intercept: finite.min(-10).max(10),
    trap: trapSchema.nullable(),
  })
  .strict();
export const itemSchema = z
  .object({
    schema_version: z.literal('targetjee.item.v2'),
    id: z.string().regex(/^[a-zA-Z0-9_-]{1,80}$/),
    exam: z.enum(['main', 'advanced']),
    subject: z.enum(['Physics', 'Chemistry', 'Mathematics']),
    topic: text(100),
    prompt: text(),
    context: z.string().max(1000),
    options: z.array(optionSchema).length(4),
    correct_id: z.enum(['A', 'B', 'C', 'D']),
    answer_expression: text(300),
    solution: text(4000),
    domain: z.record(z.string(), z.enum(['real', 'positive', 'nonnegative', 'integer'])),
    expected_unit: z.array(z.number().int()).length(3),
    diagram_anchors: z
      .array(
        z
          .object({
            label: text(80),
            x: finite.min(0).max(1),
            y: finite.min(0).max(1),
            description: text(500),
          })
          .strict(),
      )
      .max(20),
    beta_seconds: finite.int().min(90).max(300),
    alpha: finite.positive().max(4),
    a: finite.positive().max(4),
    b: finite.min(-3).max(3),
    c: finite.min(0).lt(1),
    positive_marks: z.literal(4),
    negative_marks: z.union([z.literal(1), z.literal(2)]),
    parameter_source: z.enum(['illustrative', 'model-proposed']),
  })
  .strict()
  .superRefine((item, ctx) => {
    if (
      new Set(item.options.map((o) => o.id)).size !== 4 ||
      item.options.some((o) => (o.id === item.correct_id) !== (o.trap === null))
    )
      ctx.addIssue({ code: 'custom', message: 'Invalid keyed option contract' });
    const [min, max] = item.exam === 'main' ? [90, 180] : [180, 300];
    if (
      item.beta_seconds < min ||
      item.beta_seconds > max ||
      (item.exam === 'main' && item.negative_marks !== 1)
    )
      ctx.addIssue({ code: 'custom', message: 'Invalid exam calibration' });
  });
export type Item = z.infer<typeof itemSchema>;
export type Option = Item['options'][number];
export type Trap = NonNullable<Option['trap']>;
export const switchSchema = z
  .object({
    from: z.enum(['A', 'B', 'C', 'D']).nullable(),
    to: z.enum(['A', 'B', 'C', 'D']).nullable(),
    atSeconds: finite.nonnegative(),
    dwellSeconds: finite.nonnegative(),
  })
  .strict();
const attemptSchema = z
  .object({
    itemId: text(80),
    selected: z.enum(['A', 'B', 'C', 'D']).nullable(),
    elapsed: finite.nonnegative().max(86400),
    grace: finite.nonnegative().max(3600),
    marked: z.boolean(),
    confidence: finite.min(0).max(1).nullable(),
    switches: z.array(switchSchema).max(500),
    flags: z
      .array(z.object({ atSeconds: finite.nonnegative(), marked: z.boolean() }).strict())
      .max(500),
  })
  .strict();
export type Attempt = z.infer<typeof attemptSchema>;
const deficitSchema = z
  .object({
    id: text(100),
    itemId: text(80),
    at: timestamp,
    seconds: z.union([z.literal(60), z.literal(120)]),
  })
  .strict();
export type TimeDeficitEvent = Readonly<z.infer<typeof deficitSchema>>;
export const sessionSchema = z
  .object({
    id: text(100),
    completedAt: timestamp,
    exam: z.enum(['main', 'advanced']),
    source: z.enum(['reference', 'forged']),
    diagnostic: z.boolean(),
    tier: finite.int().min(0).max(3),
    items: z.array(itemSchema).min(1).max(20),
    attempts: z.array(attemptSchema).min(1).max(20),
    timeDeficits: z.array(deficitSchema).max(100),
  })
  .strict()
  .superRefine((s, ctx) => {
    const ids = s.items.map((i) => i.id);
    if (!s.diagnostic && s.attempts.some((a) => a.confidence !== null))
      ctx.addIssue({ code: 'custom', message: 'Confidence requires explicit diagnostic mode' });
    if (
      new Set(ids).size !== ids.length ||
      s.attempts.length !== ids.length ||
      new Set(s.attempts.map((a) => a.itemId)).size !== ids.length ||
      s.attempts.some((a) => !ids.includes(a.itemId)) ||
      s.items.some((i) => i.exam !== s.exam)
    )
      ctx.addIssue({ code: 'custom', message: 'Session items do not match attempts' });
    if (
      new Set(s.timeDeficits.map((e) => e.id)).size !== s.timeDeficits.length ||
      s.timeDeficits.some((e) => !ids.includes(e.itemId)) ||
      s.attempts.some(
        (a) =>
          a.grace !==
          s.timeDeficits.filter((e) => e.itemId === a.itemId).reduce((n, e) => n + e.seconds, 0),
      )
    )
      ctx.addIssue({ code: 'custom', message: 'Grace events do not match item totals' });
  });
export type Session = z.infer<typeof sessionSchema>;
const repairSchema = z
  .object({
    at: timestamp,
    dueAt: timestamp,
    recoveryAt: timestamp.nullable().default(null),
    attempts: finite.int().nonnegative(),
    box: finite.int().min(0).max(5),
  })
  .strict();
export const learnerSchema = z
  .object({
    schema: z.literal('targetjee.local.v1'),
    sessions: z.array(sessionSchema).max(200),
    tier: finite.int().min(0).max(3),
    timelyStreak: finite.int().min(0).max(3),
    repairs: z.record(z.string().max(200), repairSchema),
    confirmations: z.record(
      z.string().max(200),
      z.enum(['Evidence-led change', 'Reconsidered selection', 'Late response-window switch']),
    ),
  })
  .strict()
  .superRefine((l, ctx) => {
    if (new Set(l.sessions.map((s) => s.id)).size !== l.sessions.length)
      ctx.addIssue({ code: 'custom', message: 'Duplicate session IDs' });
  });
export type Learner = z.infer<typeof learnerSchema>;
export const EMPTY_LEARNER: Learner = {
  schema: 'targetjee.local.v1',
  sessions: [],
  tier: 0,
  timelyStreak: 0,
  repairs: {},
  confirmations: {},
};
export const scoreSession = (s: Session) =>
  s.attempts.reduce((score, att) => {
    const item = s.items.find((i) => i.id === att.itemId)!;
    return (
      score +
      (att.selected === null ? 0 : att.selected === item.correct_id ? 4 : -item.negative_marks)
    );
  }, 0);
export const missedItems = (s: Session) =>
  s.items.filter((i) => s.attempts.find((a) => a.itemId === i.id)?.selected !== i.correct_id);
