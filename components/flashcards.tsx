'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Layers3, ArrowRight, RotateCcw, Check, Timer, LoaderCircle, BookOpen } from 'lucide-react';
import { useApp } from './providers';
import { getFlashcards } from '@/lib/analysis';
import { MathText, MathExpr } from './math';
export function Flashcards() {
  const { learner, ready, updateLearner, notify } = useApp(),
    [subject, setSubject] = useState('All'),
    [dueOnly, setDueOnly] = useState(false),
    [flipped, setFlipped] = useState<Set<string>>(new Set()),
    [busy, setBusy] = useState<string | null>(null),
    [now, setNow] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30000);
    void Promise.resolve().then(() => setNow(Date.now()));
    return () => clearInterval(id);
  }, []);
  if (!ready)
    return (
      <div className="loading-state">
        <LoaderCircle size={18} className="spinner" />
        Finding your revision cards…
      </div>
    );
  const all = getFlashcards(learner),
    cards = all.filter(
      (c) =>
        (subject === 'All' || c.item.subject === subject) &&
        (!dueOnly || !c.repair || new Date(c.repair.dueAt).getTime() <= now),
    );
  async function grade(id: string, again: boolean) {
    setBusy(id);
    const old = learner.repairs[id],
      box = again ? 0 : Math.min(5, (old?.box || 0) + 1),
      days = [0, 1, 3, 7, 14, 30][box],
      now = new Date();
    try {
      await updateLearner({
        ...learner,
        repairs: {
          ...learner.repairs,
          [id]: {
            at: now.toISOString(),
            recoveryAt: old?.recoveryAt || null,
            dueAt: new Date(now.getTime() + (again ? 600000 : days * 86400000)).toISOString(),
            box,
            attempts: (old?.attempts || 0) + 1,
          },
        },
      });
      setFlipped((v) => {
        const next = new Set(v);
        next.delete(id);
        return next;
      });
      notify(
        again
          ? 'Card scheduled again in 10 minutes. No progress lost.'
          : `Card scheduled in ${days} day${days > 1 ? 's' : ''}. Steady recall, not cramming.`,
      );
    } catch {
      notify('Could not save this revision. Check browser storage.');
    } finally {
      setBusy(null);
    }
  }
  return (
    <>
      <div className="page-title split-heading">
        <div>
          <h1>
            Keep the lesson.
            <br />
            Leave the mistake behind.
          </h1>
          <p>
            Flashcards are made automatically from the traps you selected. Reveal the guardrail,
            then choose when to revisit it. All scheduling stays local.
          </p>
        </div>
        <span className="pill accent">
          <Layers3 size={13} />
          {all.length} personal card{all.length === 1 ? '' : 's'}
        </span>
      </div>
      <div className="filter-row">
        <div className="subject-filter" role="group" aria-label="Filter cards by subject">
          {['All', 'Physics', 'Chemistry', 'Mathematics'].map((s) => (
            <button key={s} aria-pressed={subject === s} onClick={() => setSubject(s)}>
              {s}
            </button>
          ))}
        </div>
        <button
          className="button secondary small-button"
          aria-pressed={dueOnly}
          onClick={() => setDueOnly(!dueOnly)}
        >
          <Timer size={13} />
          {dueOnly ? 'Due now only' : 'Show due cards'}
        </button>
      </div>
      {cards.length ? (
        <div className="flashcard-grid">
          {cards.map((c) => (
            <article className="revision-card card" key={c.id}>
              <h2>{c.trap.label}</h2>
              <p className="context-label">
                {c.item.subject}: {c.item.topic}
              </p>
              <p>
                <MathText text={c.trap.recovery_check.question} />
              </p>
              {flipped.has(c.id) ? (
                <>
                  <div className="revision-answer">
                    <strong>
                      <MathExpr value={c.trap.recovery_check.expression} />
                    </strong>
                    <br />
                    {c.trap.recovery_check.explanation}
                    <br />
                    <strong>Keep this rule:</strong> {c.trap.avoidance_rule}
                  </div>
                  <div className="flashcard-controls">
                    <button
                      className="button secondary"
                      disabled={busy === c.id}
                      onClick={() => void grade(c.id, true)}
                    >
                      <RotateCcw size={12} />
                      See it again
                    </button>
                    <button
                      className="button primary"
                      disabled={busy === c.id}
                      onClick={() => void grade(c.id, false)}
                    >
                      <Check size={12} />I recalled it
                    </button>
                  </div>
                </>
              ) : (
                <button
                  className="button secondary"
                  onClick={() => setFlipped((v) => new Set([...v, c.id]))}
                >
                  Reveal the thinking <ArrowRight size={13} />
                </button>
              )}
              <span className="tiny-text" style={{ fontSize: 12, marginTop: 12 }}>
                {c.repair
                  ? `Box ${c.repair.box}/5. Next: ${new Date(c.repair.dueAt).toLocaleDateString('en', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`
                  : 'New card, ready to recall'}
              </span>
            </article>
          ))}
        </div>
      ) : (
        <section className="empty-panel card">
          <div className="empty-symbol">
            <BookOpen size={27} />
          </div>
          <h2>{all.length ? 'A little breathing room.' : 'Your useful mistakes belong here.'}</h2>
          <p>
            {all.length
              ? 'No cards match this filter right now. Your next review is already scheduled.'
              : 'Complete a drill and every selected misconception becomes a short, focused revision card. No manual note-taking required.'}
          </p>
          <Link href={all.length ? '/dashboard' : '/simulator'} className="button primary">
            {all.length ? 'Back to your progress' : 'Start a reference drill'}
            <ArrowRight size={15} />
          </Link>
        </section>
      )}
      <div className="note-box" style={{ marginTop: 23 }}>
        <Layers3 size={17} />
        <span>
          Recall intervals: 1, 3, 7, 14 and 30 days after a successful review; “See it again”
          schedules 10 minutes. This is a simple transparent study heuristic, not a calibrated
          forgetting-curve model. Self-rating a card does not change your drill score.
        </span>
      </div>
    </>
  );
}
