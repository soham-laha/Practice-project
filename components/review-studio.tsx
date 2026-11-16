'use client';
import { useState } from 'react';
import {
  Lightbulb,
  ArrowRight,
  Check,
  Clock3,
  ShieldCheck,
  Flag,
  CheckCircle2,
} from 'lucide-react';
import { type Session } from '@/lib/types';
import { PACING, classifyChange } from '@/lib/psychometrics';
import { analyseSession, optionProbabilities } from '@/lib/analysis';
import { useApp } from './providers';
import { MathText, MathExpr } from './math';
import { RecoveryCheck } from './recovery-check';
export function ReviewStudio({ session, sample = false }: { session: Session; sample?: boolean }) {
  const { learner, updateLearner, notify } = useApp(),
    [depth, setDepth] = useState<'quick' | 'coach' | 'deep'>('coach'),
    [localRepairs, setLocalRepairs] = useState<string[]>([]);
  const analysis = analyseSession(session),
    ordered = [...session.items].sort((a, b) => {
      const aw = session.attempts.find((t) => t.itemId === a.id)?.selected !== a.correct_id,
        bw = session.attempts.find((t) => t.itemId === b.id)?.selected !== b.correct_id;
      return Number(bw) - Number(aw) || (bw && aw ? b.negative_marks - a.negative_marks : 0);
    });
  async function repair(itemId: string) {
    const id = `${session.id}:${itemId}`;
    if (sample) {
      setLocalRepairs((v) => [...v, id]);
      notify('Sample recovery completed. This example is not saved to your history.');
      return;
    }
    const now = new Date(),
      next = {
        ...learner,
        repairs: {
          ...learner.repairs,
          [id]: {
            at: now.toISOString(),
            recoveryAt: now.toISOString(),
            dueAt: new Date(now.getTime() + 86400000).toISOString(),
            attempts: (learner.repairs[id]?.attempts || 0) + 1,
            box: 1,
          },
        },
      };
    await updateLearner(next);
    notify('Recovery saved. A revision card is ready for tomorrow.');
  }
  async function confirmChange(id: string, label: ReturnType<typeof classifyChange>) {
    if (sample) {
      notify('This is an example timing label, not an inference of intent.');
      return;
    }
    await updateLearner({ ...learner, confirmations: { ...learner.confirmations, [id]: label } });
    notify('Your confirmation was saved alongside the observable timing.');
  }
  return (
    <section className="review-section" id="review">
      <div className="review-header">
        <div>
          <h2>Let’s make the mistake useful.</h2>
          <p>
            {analysis.missed.length
              ? `${analysis.missed.length} question${analysis.missed.length > 1 ? 's' : ''} to revisit. Highest mark swing first.`
              : 'Every answer landed. Revisit the reasoning, not just the key.'}
          </p>
        </div>
        <div className="segmented" role="group" aria-label="Review depth">
          {[
            { id: 'quick', label: 'Quick scan' },
            { id: 'coach', label: 'Coach review' },
            { id: 'deep', label: 'Deep analysis' },
          ].map((v) => (
            <button
              key={v.id}
              aria-pressed={depth === v.id}
              onClick={() => setDepth(v.id as typeof depth)}
            >
              {v.label}
            </button>
          ))}
        </div>
      </div>
      {ordered.map((item) => {
        const a = session.attempts.find((t) => t.itemId === item.id)!,
          selected = item.options.find((o) => o.id === a.selected),
          key = item.options.find((o) => o.id === item.correct_id)!,
          correct = a.selected === item.correct_id,
          trap = selected?.trap,
          repairId = `${session.id}:${item.id}`,
          repaired = !!learner.repairs[repairId]?.recoveryAt || localRepairs.includes(repairId),
          switches = a.switches.filter((s) => s.from !== null && s.to !== null),
          probs = depth === 'deep' ? optionProbabilities(session, item.id) : [];
        return (
          <article className="review-item glass card" key={item.id}>
            <div className="review-item-head">
              <div>
                <h3>
                  {correct
                    ? 'The reasoning held.'
                    : !selected
                      ? 'A question left open.'
                      : trap?.label}
                </h3>
                <p className="context-label">
                  {item.subject}: {item.topic}
                </p>
              </div>
              <span className={`pill ${correct ? 'accent' : 'warning'}`}>
                {correct ? <Check size={12} /> : <ArrowRight size={12} />}{' '}
                {correct
                  ? '+4 secured'
                  : `${4 + (selected ? item.negative_marks : 0)} marks recoverable`}
              </span>
            </div>
            <div className="review-question">
              <MathText text={item.prompt} />
            </div>
            <div className="answer-summary">
              <div>
                <span>Your answer</span>
                {selected ? <MathExpr value={selected.latex} /> : <strong>Not answered</strong>}
              </div>
              <div className="correct">
                <span>Correct answer</span>
                <MathExpr value={key.latex} />
              </div>
              <div>
                <Clock3 size={12} />
                {Math.round(a.elapsed)}s {a.grace > 0 && `(including ${a.grace / 60} min grace)`}
                {a.marked && <Flag size={11} />}
              </div>
            </div>
            {trap ? (
              <>
                <div className="guardrail">
                  <Lightbulb size={17} />
                  <span>
                    <strong>Your next guardrail:</strong> {trap.avoidance_rule}
                  </span>
                </div>
                {depth !== 'quick' && (
                  <>
                    <div className="replay-grid">
                      <section className="replay-step">
                        <span>01</span>
                        <h4>Why it looked plausible</h4>
                        <p>{trap.why_plausible}</p>
                      </section>
                      <section className="replay-step">
                        <span>02</span>
                        <h4>The first wrong pivot</h4>
                        <p>{trap.first_wrong_pivot}</p>
                      </section>
                      <section className="replay-step">
                        <span>03</span>
                        <h4>When it would be valid</h4>
                        <p>{trap.counterfactual_valid_when}</p>
                      </section>
                    </div>
                    <RecoveryCheck
                      key={repairId}
                      trap={trap}
                      repaired={repaired}
                      onRepair={() => repair(item.id)}
                    />
                  </>
                )}
              </>
            ) : (
              <div className="guardrail">
                <CheckCircle2 size={16} />
                <span>
                  {correct
                    ? 'Keep the method: '
                    : 'No choice means no trap can be diagnosed from this attempt. '}
                  <MathText text={item.solution} />
                </span>
              </div>
            )}
            {depth === 'deep' && (
              <div className="deep-analysis">
                <h4>Worked reasoning</h4>
                <p>
                  <MathText text={item.solution} />
                </p>
                <h4>Observable answer changes</h4>
                {switches.length ? (
                  switches.map((s, i) => {
                    const label = classifyChange(
                        s.atSeconds,
                        s.dwellSeconds,
                        item.beta_seconds * PACING[session.tier].factor + a.grace,
                      ),
                      id = `${repairId}:${i}`,
                      from = item.options.findIndex((o) => o.id === s.from),
                      to = item.options.findIndex((o) => o.id === s.to);
                    return (
                      <div className="telemetry-entry" key={i}>
                        <span>
                          {'ABCD'[from]} → {'ABCD'[to]} at {Math.round(s.atSeconds)}s
                        </span>
                        <span>{Math.round(s.dwellSeconds)}s dwell</span>
                        <strong>{label}</strong>
                        <button
                          className="button secondary small-button"
                          onClick={() =>
                            void confirmChange(id, label).catch(() =>
                              notify('Could not save confirmation.'),
                            )
                          }
                        >
                          {learner.confirmations[id] ? (
                            <>
                              <Check size={11} />
                              Confirmed
                            </>
                          ) : (
                            'This fits my experience'
                          )}
                        </button>
                      </div>
                    );
                  })
                ) : (
                  <p>
                    No option-to-option switch was observed. Initial selections and cleared
                    responses are not labelled changes.
                  </p>
                )}
                <p className="estimate-note">
                  These are timing categories, not claims about intent. “Evidence-led” means a dwell
                  of at least 20 seconds before changing; it does not prove new evidence. Late means
                  the final 15% of the response window.
                </p>
                <h4>Option model, illustrative, not a diagnosis</h4>
                <div className="mode-detail">
                  {item.options.map((o, i) => (
                    <span className="pill" key={o.id}>
                      {'ABCD'[i]}: {(probs[i] * 100).toFixed(1)}%, slope {o.slope.toFixed(2)}
                    </span>
                  ))}
                </div>
                <p>
                  NRM attractiveness estimates describe this supplied parameter set, not a validated
                  probability about you. The selected trap trace, not a model label, drives the
                  repair.
                </p>
              </div>
            )}
          </article>
        );
      })}
      <div className="note-box">
        <ShieldCheck size={16} />
        <span>
          Recovery checks are learning opportunities, not a fresh ability test. Only original drill
          responses contribute to the session score and psychometric estimates. No repaired score is
          substituted for your actual score.
        </span>
      </div>
    </section>
  );
}
