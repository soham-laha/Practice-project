'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowRight,
  ArrowLeft,
  Flag,
  RotateCcw,
  Timer,
  ShieldCheck,
  Check,
  ScanLine,
  Brain,
  Hourglass,
  Send,
  BookOpen,
  Plus,
  Info,
  X,
  LoaderCircle,
} from 'lucide-react';
import { useApp } from './providers';
import { ExamSelect } from './exam-select';
import { MathText, MathExpr } from './math';
import { PACING } from '@/lib/psychometrics';
import { referenceItems, lockOptionOrder } from '@/lib/seeds';
import { regenerateRuntimeDistractors } from '@/lib/local-generator';
import { KEYS } from '@/lib/storage';
import { itemSchema, sessionSchema, type Item, type Session, type Attempt } from '@/lib/types';

type Active = { session: Session; index: number; tickAt: number };
function settle(active: Active): Active {
  const now = Date.now(),
    delta = Math.max(0, (now - active.tickAt) / 1000);
  return {
    ...active,
    tickAt: now,
    session: {
      ...active.session,
      attempts: active.session.attempts.map((a, i) =>
        i === active.index ? { ...a, elapsed: Math.min(86400, a.elapsed + delta) } : a,
      ),
    },
  };
}
function makeActive(
  items: Item[],
  diagnostic: boolean,
  tier: number,
  source: 'reference' | 'forged',
): Active {
  const locked = lockOptionOrder(items),
    now = Date.now();
  return {
    index: 0,
    tickAt: now,
    session: {
      id: crypto.randomUUID(),
      completedAt: new Date(now).toISOString(),
      exam: items[0].exam,
      source,
      diagnostic,
      tier,
      items: locked,
      attempts: locked.map((i) => ({
        itemId: i.id,
        selected: null,
        elapsed: 0,
        grace: 0,
        marked: false,
        confidence: null,
        switches: [],
        flags: [],
      })),
      timeDeficits: [],
    },
  };
}
function clock(seconds: number) {
  const n = Math.max(0, Math.ceil(seconds));
  return `${Math.floor(n / 60)
    .toString()
    .padStart(2, '0')}:${(n % 60).toString().padStart(2, '0')}`;
}
export function Simulator() {
  const { learner, ready, exam, addSession, setKeyModal, notify } = useApp(),
    router = useRouter();
  const [active, setActive] = useState<Active | null>(null),
    [hydrated, setHydrated] = useState(false),
    [diagnostic, setDiagnostic] = useState(false),
    [submitting, setSubmitting] = useState(false),
    [error, setError] = useState(''),
    [confirm, setConfirm] = useState(false);
  const confirmDialog = useRef<HTMLDialogElement>(null),
    loaded = useRef(false),
    completing = useRef(false);
  useEffect(() => {
    if (!ready || loaded.current) return;
    let cancelled = false;
    void Promise.resolve().then(() => {
      if (cancelled || loaded.current) return;
      loaded.current = true;
      const start = new URLSearchParams(window.location.search).get('start');
      try {
        if (start === 'reference')
          setActive(makeActive(referenceItems(exam), false, learner.tier, 'reference'));
        else if (start === 'forged') {
          const raw = JSON.parse(sessionStorage.getItem(KEYS.forged) || '[]');
          const items: Item[] = raw.map((i: unknown) => itemSchema.parse(i));
          if (items.length && items.length <= 50 && items.every((i) => i.exam === items[0].exam))
            setActive(makeActive(items, false, learner.tier, 'forged'));
          else setError('No forged drill is waiting. Build a drill or try the reference set.');
        } else {
          const raw = localStorage.getItem(KEYS.active);
          if (raw) {
            const parsed = JSON.parse(raw),
              session = sessionSchema.parse(parsed.session);
            if (
              Number.isInteger(parsed.index) &&
              parsed.index >= 0 &&
              parsed.index < session.items.length &&
              Number.isFinite(parsed.tickAt)
            )
              setActive(settle({ session, index: parsed.index, tickAt: parsed.tickAt }));
          }
        }
      } catch {
        setError('The unfinished drill could not be restored. Start a fresh reference drill.');
      }
      if (start === 'reference' || start === 'forged')
        window.history.replaceState(window.history.state, '', '/simulator');
      setHydrated(true);
    });
    return () => {
      cancelled = true;
    };
  }, [ready, exam, learner.tier]);
  const activeId = active?.session.id;
  useEffect(() => {
    if (!activeId) return;
    const id = setInterval(() => {
      if (!completing.current) setActive((old) => (old ? settle(old) : old));
    }, 1000);
    return () => clearInterval(id);
  }, [activeId]);
  useEffect(() => {
    if (!active) return;
    try {
      localStorage.setItem(KEYS.active, JSON.stringify(active));
    } catch {
      /* Submission reports a storage failure; timer remains usable in memory. */
    }
  }, [active]);
  useEffect(() => {
    if (confirm) confirmDialog.current?.showModal();
    else confirmDialog.current?.close();
  }, [confirm]);
  function start() {
    setError('');
    setActive(makeActive(referenceItems(exam), diagnostic, learner.tier, 'reference'));
  }
  function updateAttempt(action: (a: Attempt, base: Active) => Attempt) {
    setActive((old) => {
      if (!old) return old;
      const base = settle(old);
      return {
        ...base,
        session: {
          ...base.session,
          attempts: base.session.attempts.map((a, i) => (i === base.index ? action(a, base) : a)),
        },
      };
    });
  }
  function choose(id: Attempt['selected']) {
    updateAttempt((a) =>
      a.selected === id
        ? a
        : {
            ...a,
            selected: id as Attempt['selected'],
            confidence: null,
            switches: [
              ...a.switches,
              {
                from: a.selected,
                to: id,
                atSeconds: a.elapsed,
                dwellSeconds: a.elapsed - (a.switches.at(-1)?.atSeconds || 0),
              },
            ].slice(-500),
          },
    );
  }
  function mark() {
    updateAttempt((a) => ({
      ...a,
      marked: !a.marked,
      flags: [...a.flags, { atSeconds: a.elapsed, marked: !a.marked }].slice(-500),
    }));
  }
  function navigate(index: number) {
    setActive((old) => (old ? { ...settle(old), index, tickAt: Date.now() } : old));
  }
  function grace(seconds: 60 | 120) {
    setActive((old) => {
      if (!old) return old;
      const base = settle(old),
        a = base.session.attempts[base.index];
      if (a.grace + seconds > 3600 || base.session.timeDeficits.length >= 100) return base;
      const event = Object.freeze({
        id: crypto.randomUUID(),
        itemId: a.itemId,
        at: new Date().toISOString(),
        seconds,
      });
      return {
        ...base,
        session: {
          ...base.session,
          timeDeficits: [...base.session.timeDeficits, event],
          attempts: base.session.attempts.map((v, i) =>
            i === base.index ? { ...v, grace: v.grace + seconds } : v,
          ),
        },
      };
    });
  }
  async function finish() {
    if (!active || submitting) return;
    completing.current = true;
    setSubmitting(true);
    setError('');
    try {
      const final = settle(active).session;
      final.completedAt = new Date().toISOString();
      await addSession(sessionSchema.parse(final));
      localStorage.removeItem(KEYS.active);
      setConfirm(false);
      notify('Drill saved. Let’s turn the evidence into your next breakthrough.');
      router.push(`/dashboard?session=${final.id}`);
    } catch {
      setError(
        'This browser could not save your drill. Free some local storage and try submitting again. Your answers are still here.',
      );
      completing.current = false;
      setSubmitting(false);
    }
  }
  function regenerateOptions() {
    if (!active) return;
    const currentItem = active.session.items[active.index];
    const refreshed = regenerateRuntimeDistractors(currentItem);
    setActive({
      ...active,
      session: {
        ...active.session,
        items: active.session.items.map((it, i) => (i === active.index ? refreshed : it)),
      },
    });
    notify('Distractors refreshed with certified alternatives.');
  }
  if (!hydrated)
    return (
      <div className="loading-state">
        <LoaderCircle size={18} className="spinner" />
        Preparing your private practice space…
      </div>
    );
  if (!active)
    return (
      <>
        <div className="page-title split-heading">
          <div>
            <h1>Practice room.</h1>
            <p>
              A focused, six-question reference drill. Same familiar CBT flow, with room to find
              your feet.
            </p>
          </div>
          <ExamSelect />
        </div>
        <div className="setup-grid">
          <section className="setup-card card">
            <h2>Reference drill</h2>
            <p>
              {exam === 'main'
                ? 'Single-concept traps that sharpen precision, from domains and signs to reference frames.'
                : 'Multi-concept challenges at the intersection of domains, frames, conservation and boundary conditions.'}{' '}
              No API key, no account, no noise.
            </p>
            <div className="mode-detail">
              <span className="pill accent">JEE {exam === 'main' ? 'Main' : 'Advanced'}</span>
              <span className="pill">6 questions, all subjects</span>
              <span className="pill">+4 / −{exam === 'main' ? '1' : '2'} marking</span>
            </div>
            <span className="field-label">Choose your practice style</span>
            <div className="mode-choices">
              <button
                className={`mode-choice ${!diagnostic ? 'selected' : ''}`}
                aria-pressed={!diagnostic}
                onClick={() => setDiagnostic(false)}
              >
                <ScanLine size={22} />
                {!diagnostic && <Check size={17} className="selection-check" />}
                <strong>NTA simulation</strong>
                <p>Just the problem and the clock. Insights wait until you finish.</p>
              </button>
              <button
                className={`mode-choice ${diagnostic ? 'selected' : ''}`}
                aria-pressed={diagnostic}
                onClick={() => setDiagnostic(true)}
              >
                <Brain size={22} />
                {diagnostic && <Check size={17} className="selection-check" />}
                <strong>Diagnostic practice</strong>
                <p>Optional certainty tags help you compare confidence with accuracy.</p>
              </button>
            </div>
            <div className="setup-actions">
              <button className="button primary" onClick={start}>
                Begin reference drill <ArrowRight size={16} />
              </button>
              <Link href="/forge" className="button secondary">
                Use your own problem <Plus size={14} />
              </Link>
            </div>
            <p className="error-text" role="alert">
              {error}
            </p>
          </section>
          <aside className="pacing-panel">
            <h3>Confidence before the clock.</h3>
            <p>
              Three steady, timely drills with at least 70% of available marks open the next stage.
              No grace extensions required.
            </p>
            <ol className="pacing-list">
              {PACING.map((stage, i) => (
                <li key={stage.name} className={learner.tier === i ? 'current' : ''}>
                  <span className="stage-number">
                    {i < learner.tier ? <Check size={13} /> : i + 1}
                  </span>
                  <div>
                    <strong>{stage.name}</strong>
                    <small>{stage.description}</small>
                  </div>
                  <span className="stage-factor">{stage.factor.toFixed(2)}×</span>
                </li>
              ))}
            </ol>
          </aside>
        </div>
        <div className="note-box">
          <ShieldCheck size={17} />
          <span>
            Answers and history stay on this device. Option order locks when you start; the clock
            keeps running if you leave the tab. Timers invite pacing, not abrupt cutoffs. Want
            AI-generated drills?{' '}
            <button className="text-link" onClick={() => setKeyModal(true)}>
              Connect your own Gemini key.
            </button>
          </span>
        </div>
      </>
    );
  const { session, index } = active,
    item = session.items[index],
    attempt = session.attempts[index],
    stage = PACING[session.tier],
    baseSeconds = item.beta_seconds * stage.factor,
    remaining = baseSeconds + attempt.grace - attempt.elapsed;
  const answered = session.attempts.filter((a) => a.selected !== null).length,
    marked = session.attempts.filter((a) => a.marked).length;
  return (
    <>
      <div className="sim-header">
        <div className="sim-title">
          <h1>Your focus, uninterrupted.</h1>
          <span className="pill accent">JEE {session.exam === 'main' ? 'Main' : 'Advanced'}</span>
        </div>
        <div className="sim-header-actions">
          <span className="pill">
            {stage.name}, {stage.factor.toFixed(2)}×
          </span>
          <div
            className={`sim-timer ${remaining <= 0 ? 'is-over' : ''}`}
            role="timer"
            aria-label={`Question time remaining ${clock(remaining)}`}
          >
            <Timer size={16} />
            {clock(remaining)}
          </div>
          <button className="button primary small-button" onClick={() => setConfirm(true)}>
            Finish drill <Send size={13} />
          </button>
        </div>
      </div>
      {remaining <= 0 && (
        <section className="grace-banner" aria-label="Optional grace time">
          <Hourglass size={21} />
          <div>
            <h2>Need another moment? That’s part of learning.</h2>
            <p>Keep your working. Take a little grace, or move on when you’re ready.</p>
          </div>
          <div className="grace-actions">
            <button
              className="button secondary small-button"
              onClick={() => grace(60)}
              disabled={attempt.grace >= 3600 || session.timeDeficits.length >= 100}
            >
              +1 min
            </button>
            <button
              className="button secondary small-button"
              onClick={() => grace(120)}
              disabled={attempt.grace > 3480 || session.timeDeficits.length >= 100}
            >
              +2 min
            </button>
          </div>
        </section>
      )}
      <div className="simulation-grid">
        <section className="question-card card">
          <div className="question-meta">
            <span className="section-label">
              Question {String(index + 1).padStart(2, '0')} /{' '}
              {String(session.items.length).padStart(2, '0')} <span>,</span> {item.subject}
            </span>
            <span className="marking">
              <strong>+4</strong> / −{item.negative_marks}
            </span>
          </div>
          <div className="question-text">
            <MathText text={item.prompt} />
          </div>
          {item.diagram_anchors.length > 0 && (
            <details className="diagram-anchors">
              <summary>Source diagram descriptions</summary>
              <ul>
                {item.diagram_anchors.map((d, i) => (
                  <li key={i}>
                    <strong>{d.label}</strong> ({d.x.toFixed(2)}, {d.y.toFixed(2)}): {d.description}
                  </li>
                ))}
              </ul>
            </details>
          )}
          <div className="answer-options" role="group" aria-label="Answer options">
            {item.options.map((o, i) => (
              <button
                className={`answer-option ${attempt.selected === o.id ? 'selected' : ''}`}
                key={o.id}
                aria-pressed={attempt.selected === o.id}
                aria-label={`Option ${'ABCD'[i]}: ${o.latex}`}
                onClick={() => choose(o.id)}
              >
                <span className="option-letter">{'ABCD'[i]}</span>
                <MathExpr value={o.latex} />
                {attempt.selected === o.id && <Check size={17} />}
              </button>
            ))}
          </div>
          <div
            className="options-toolbar"
            style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px' }}
          >
            <button
              className="text-link"
              type="button"
              style={{ fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
              onClick={regenerateOptions}
            >
              <RotateCcw size={13} />
              Regenerate distractors
            </button>
          </div>
          {session.diagnostic && (
            <div className="diagnostic-tags">
              <span>
                How sure do you feel? <span className="muted">(optional)</span>
              </span>
              <div className="tag-group">
                {[
                  { label: 'Guess', value: 0.25 },
                  { label: 'Think so', value: 0.65 },
                  { label: 'Certain', value: 0.95 },
                ].map((v) => (
                  <button
                    key={v.label}
                    aria-pressed={attempt.confidence === v.value}
                    onClick={() =>
                      updateAttempt((a) => ({
                        ...a,
                        confidence: a.confidence === v.value ? null : v.value,
                      }))
                    }
                  >
                    {v.label}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="question-controls">
            <button
              className={`button ${attempt.marked ? 'subtle' : 'secondary'}`}
              aria-pressed={attempt.marked}
              onClick={mark}
            >
              <Flag size={14} />
              {attempt.marked ? 'Marked for review' : 'Mark for Review'}
            </button>
            <button
              className="button secondary"
              onClick={() => choose(null)}
              disabled={attempt.selected === null}
            >
              <RotateCcw size={14} />
              Clear Response
            </button>
            {index > 0 && (
              <button
                className="icon-button"
                aria-label="Previous question"
                onClick={() => navigate(index - 1)}
              >
                <ArrowLeft size={17} />
              </button>
            )}
            <button
              className="button primary"
              onClick={() =>
                index < session.items.length - 1 ? navigate(index + 1) : setConfirm(true)
              }
            >
              {index === session.items.length - 1 ? 'Finish drill' : 'Save & Next'}
              <ArrowRight size={14} />
            </button>
          </div>
        </section>
        <aside className="palette-card card">
          <h2>Your question palette</h2>
          <p>Move freely. Your answers stay saved.</p>
          <div className="question-palette">
            {session.items.map((q, i) => (
              <button
                key={q.id}
                className={`${i === index ? 'current' : ''} ${session.attempts[i].selected !== null ? 'answered' : ''} ${session.attempts[i].marked ? 'marked' : ''}`}
                aria-label={`Question ${i + 1}${session.attempts[i].selected !== null ? ', answered' : ''}${session.attempts[i].marked ? ', marked for review' : ''}`}
                aria-current={i === index ? 'step' : undefined}
                onClick={() => navigate(i)}
              >
                {i + 1}
              </button>
            ))}
          </div>
          <div className="palette-legend">
            <span>
              <i className="legend-square answered" />
              Answered
            </span>
            <span>
              <i className="legend-square" />
              Not answered
            </span>
            <span>
              <i className="legend-square marked" />
              Marked for review
            </span>
          </div>
          <button className="button secondary full" onClick={() => setConfirm(true)}>
            Finish & review <BookOpen size={14} />
          </button>
        </aside>
      </div>
      <div className="exam-calm-note">
        <ShieldCheck size={14} />
        <p>
          {session.diagnostic
            ? 'Diagnostic practice: certainty tags are optional.'
            : 'NTA simulation: no live scores, no interruptions.'}{' '}
          Your progress is saved on this device.{' '}
          {attempt.grace > 0 && `${attempt.grace / 60} min grace used on this question.`}
        </p>
      </div>
      <dialog
        className="modal submit-modal"
        ref={confirmDialog}
        onClose={() => {
          if (!submitting) setConfirm(false);
        }}
        aria-labelledby="submit-title"
      >
        <button
          className="icon-button modal-close"
          onClick={() => setConfirm(false)}
          disabled={submitting}
          aria-label="Close submission dialog"
        >
          <X size={19} />
        </button>
        <div className="modal-symbol">
          <BookOpen size={25} />
        </div>
        <h2 id="submit-title">Ready to see the bigger picture?</h2>
        <p className="muted">
          Your answers become a personal repair plan. Unanswered questions receive zero marks, not a
          penalty.
        </p>
        <div className="submit-stats">
          <div>
            <strong>{answered}</strong>answered
          </div>
          <div>
            <strong>{session.items.length - answered}</strong>unanswered
          </div>
          <div>
            <strong>{marked}</strong>marked for review
          </div>
        </div>
        <div className="note-box">
          <Info size={15} />
          <span>
            Marked answers are scored normally. Starting another drill later replaces this
            unfinished drill.
          </span>
        </div>
        <p className="error-text" role="alert">
          {error}
        </p>
        <div className="setup-actions">
          <button
            className="button secondary"
            disabled={submitting}
            onClick={() => setConfirm(false)}
          >
            Keep working
          </button>
          <button className="button primary" disabled={submitting} onClick={() => void finish()}>
            {submitting ? <LoaderCircle size={16} className="spinner" /> : <Check size={16} />}
            Submit & review
          </button>
        </div>
      </dialog>
    </>
  );
}
