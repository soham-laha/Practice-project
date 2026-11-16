'use client';
import { useState, useEffect, useRef, type CSSProperties } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Target,
  ArrowUpRight,
  ArrowRight,
  ChartNoAxesCombined,
  BookOpen,
  Clock3,
  ShieldCheck,
  Download,
  Upload,
  Trash2,
  FlaskConical,
  Atom,
  FunctionSquare,
  Leaf,
  Info,
  ScanLine,
  LoaderCircle,
  X,
  RotateCcw,
} from 'lucide-react';
import { useApp } from './providers';
import { ReviewStudio } from './review-studio';
import { Coach } from './coach';
import { PACING } from '@/lib/psychometrics';
import { analyseSession } from '@/lib/analysis';
import { referenceItems } from '@/lib/seeds';
import { type Session, scoreSession } from '@/lib/types';
import { exportLearner, importLearner, resetLocalData } from '@/lib/storage';
function sampleSession(): Session {
  const items = referenceItems('main'),
    chosen = ['A', 'C', 'A', 'B', 'B', null],
    elapsed = [61, 143, 89, 121, 94, 86];
  return {
    id: 'sample-report',
    exam: 'main',
    completedAt: new Date().toISOString(),
    source: 'reference',
    diagnostic: true,
    tier: 0,
    items,
    timeDeficits: [],
    attempts: items.map((item, i) => ({
      itemId: item.id,
      selected: chosen[i] as 'A' | 'B' | 'C' | null,
      elapsed: elapsed[i],
      grace: 0,
      marked: i === 2,
      confidence: i === 0 ? 0.95 : i === 1 ? 0.65 : null,
      switches:
        i === 0
          ? [
              { from: null, to: 'B', atSeconds: 8, dwellSeconds: 8 },
              { from: 'B', to: 'A', atSeconds: 49, dwellSeconds: 41 },
            ]
          : [],
      flags: i === 2 ? [{ atSeconds: 74, marked: true }] : [],
    })),
  };
}
const dateLabel = (iso: string) =>
  new Intl.DateTimeFormat('en', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
export function Dashboard() {
  const { learner, ready, updateLearner, notify } = useApp(),
    router = useRouter(),
    [selectedId, setSelectedId] = useState(''),
    [sample, setSample] = useState<Session | null>(null),
    [reset, setReset] = useState(false),
    [busy, setBusy] = useState(false),
    [dataError, setDataError] = useState('');
  const resetDialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    void Promise.resolve().then(() => {
      const id = new URLSearchParams(window.location.search).get('session');
      if (id) setSelectedId(id);
    });
  }, []);
  useEffect(() => {
    if (reset) resetDialog.current?.showModal();
    else resetDialog.current?.close();
  }, [reset]);
  if (!ready)
    return (
      <div className="loading-state">
        <LoaderCircle className="spinner" size={18} />
        Opening your local review studio…
      </div>
    );
  const session =
      sample || learner.sessions.find((s) => s.id === selectedId) || learner.sessions[0],
    analysis = session ? analyseSession(session) : null;
  const totalItems = learner.sessions.reduce((n, s) => n + s.items.length, 0),
    correctItems = learner.sessions.reduce(
      (n, s) =>
        n +
        s.items.filter((i) => s.attempts.find((a) => a.itemId === i.id)?.selected === i.correct_id)
          .length,
      0,
    );
  const days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - 6 + i);
    const label = date.toLocaleDateString('en', { weekday: 'short' }),
      count = learner.sessions.filter(
        (s) => new Date(s.completedAt).toDateString() === date.toDateString(),
      ).length;
    return { label, count };
  });
  const maximum = Math.max(3, ...days.map((d) => d.count)),
    weekCount = days.reduce((n, d) => n + d.count, 0),
    stage = PACING[learner.tier];
  const subjects = [
    { name: 'Physics', Icon: Atom },
    { name: 'Chemistry', Icon: FlaskConical },
    { name: 'Mathematics', Icon: FunctionSquare },
  ].map((sub) => {
    const all = learner.sessions.flatMap((s) =>
      s.items
        .filter((i) => i.subject === sub.name)
        .map((i) => s.attempts.find((a) => a.itemId === i.id)?.selected === i.correct_id),
    );
    return { ...sub, total: all.length, correct: all.filter(Boolean).length };
  });
  async function doImport(file: File) {
    setDataError('');
    setBusy(true);
    try {
      const imported = await importLearner(file);
      await updateLearner(imported);
      setSample(null);
      setSelectedId('');
      notify('Backup restored locally. Your Gemini key was not changed.');
    } catch (e) {
      setDataError(e instanceof Error ? e.message : 'Import failed.');
    } finally {
      setBusy(false);
    }
  }
  async function doReset() {
    setBusy(true);
    try {
      await resetLocalData();
      window.location.reload();
    } catch {
      setDataError('Could not reset this browser. Check storage permissions and try again.');
      setBusy(false);
    }
  }
  return (
    <>
      <div className="page-title split-heading">
        <div>
          <span className="eyebrow">NOT A JUDGMENT. A WAY FORWARD.</span>
          <h1>
            Your effort, <em>in perspective.</em>
          </h1>
          <p>Keep the progress. Understand the slips. Take one thoughtful next step.</p>
        </div>
        <Link href="/simulator" className="button primary">
          Your next drill <ArrowUpRight size={16} />
        </Link>
      </div>
      {sample && (
        <div className="report-banner">
          <Info size={22} />
          <div>
            <h2>Sample report · an illustration, not your performance</h2>
            <p>Explore the full repair flow. Nothing here is added to your history or mastery.</p>
          </div>
          <button className="button secondary small-button" onClick={() => setSample(null)}>
            Close sample <X size={13} />
          </button>
        </div>
      )}
      {session && !sample && (
        <div className="report-banner">
          <Leaf size={24} />
          <div>
            <h2>
              {analysis!.missed.length
                ? 'A few small pivots can change the whole picture.'
                : 'A clean drill. Keep trusting the process.'}
            </h2>
            <p>
              JEE {session.exam === 'main' ? 'Main' : 'Advanced'} · {session.items.length} questions
              · {dateLabel(session.completedAt)}
            </p>
          </div>
          <span className="pill accent">
            {analysis!.ability.stability} <Info size={12} />
          </span>
        </div>
      )}
      <div className="dashboard-stats">
        <section className="stat-card card">
          <div className="stat-top">
            {sample ? 'Sample session score' : 'Session score'}
            <Target size={16} />
          </div>
          <div className="stat-value">
            {analysis ? analysis.score : '—'}
            <small>/ {analysis ? analysis.maximum : '24'}</small>
          </div>
          <p className="stat-note">
            {analysis
              ? `${analysis.correct} of ${session!.items.length} answered correctly`
              : 'Your first drill begins the story.'}
          </p>
        </section>
        <section className="stat-card card highlight">
          <div className="stat-top">
            Recoverable marks
            <ArrowUpRight size={16} />
          </div>
          <div className="stat-value">
            {analysis ? `+${analysis.recoverable}` : '—'}
            <small>{analysis ? 'within this drill' : 'not a prediction'}</small>
          </div>
          <p className="stat-note">
            {analysis
              ? `Trap-free potential: ${analysis.maximum} · includes unattempted`
              : 'Find the marks hidden in your slips.'}
          </p>
        </section>
        <section className="stat-card card">
          <div className="stat-top">
            Your current pace
            <Clock3 size={16} />
          </div>
          <div className="stat-value">
            {stage.factor.toFixed(2)}
            <small>× benchmark</small>
          </div>
          <p className="stat-note">
            {stage.name} · {learner.timelyStreak}/3 steady drills
          </p>
        </section>
        <section className="stat-card card">
          <div className="stat-top">
            Thinking repaired
            <BookOpen size={16} />
          </div>
          <div className="stat-value">
            {Object.values(learner.repairs).filter((r) => r.recoveryAt).length}
            <small>recovery checks</small>
          </div>
          <p className="stat-note">A completed check, not a mastery certificate.</p>
        </section>
      </div>
      {!session && (
        <section className="empty-panel card" style={{ marginBottom: 22 }}>
          <div className="empty-symbol">
            <ScanLine size={27} />
          </div>
          <h2>
            Your first insight is <em>one drill away.</em>
          </h2>
          <p>
            No scores to compare, no streak to protect. Try a short reference drill, or explore an
            explicitly labelled sample report.
          </p>
          <div className="empty-actions">
            <Link className="button primary" href="/simulator?start=reference">
              Take your first drill <ArrowRight size={15} />
            </Link>
            <button className="button secondary" onClick={() => setSample(sampleSession())}>
              Explore a sample report <ArrowUpRight size={15} />
            </button>
          </div>
        </section>
      )}
      <div className="dashboard-grid" id="progress">
        <div>
          <section className="progress-panel card">
            <div className="panel-heading">
              <h2>A little consistency goes a long way.</h2>
              <span>Last 7 days · local time</span>
            </div>
            <div
              className="activity-chart"
              role="img"
              aria-label={`Completed drills over seven days: ${days.map((d) => `${d.label} ${d.count}`).join(', ')}`}
            >
              {days.map((d, i) => (
                <div className="activity-day" key={i}>
                  {d.count > 0 && <span className="bar-count">{d.count}</span>}
                  <div
                    className={`bar ${i === 6 ? 'today' : ''}`}
                    style={{ height: `${Math.max(3, (d.count / maximum) * 85)}px` }}
                  />
                  <span className="day-label">{d.label}</span>
                </div>
              ))}
            </div>
            <div className="progress-summary">
              <ChartNoAxesCombined size={17} />
              <span>
                <strong>
                  {weekCount} focused drill{weekCount === 1 ? '' : 's'}
                </strong>{' '}
                this week.{' '}
                {weekCount
                  ? 'One session is a step forward.'
                  : 'Start where you are. There’s no catching up to do.'}
              </span>
            </div>
          </section>
          <section className="sessions-panel card">
            <div className="panel-heading">
              <h2>Your practice, one session at a time.</h2>
              <span>{learner.sessions.length} saved locally</span>
            </div>
            {learner.sessions.length ? (
              learner.sessions.slice(0, 5).map((s) => (
                <button
                  className={`session-row ${session?.id === s.id ? 'active' : ''}`}
                  key={s.id}
                  onClick={() => {
                    setSample(null);
                    setSelectedId(s.id);
                    router.replace(`/dashboard?session=${s.id}`, { scroll: false });
                  }}
                >
                  <span className="session-icon">
                    <ScanLine size={16} />
                  </span>
                  <span className="session-info">
                    <strong>
                      JEE {s.exam === 'main' ? 'Main' : 'Advanced'} ·{' '}
                      {s.source === 'reference' ? 'Reference drill' : 'Personal drill'}
                    </strong>
                    <small>
                      {dateLabel(s.completedAt)} · {s.items.length} questions ·{' '}
                      {PACING[s.tier].name}
                    </small>
                  </span>
                  <span className="session-score">
                    {scoreSession(s)}
                    <span className="muted" style={{ fontSize: 9 }}>
                      /{s.items.length * 4}
                    </span>
                  </span>
                  <ArrowUpRight size={15} />
                </button>
              ))
            ) : (
              <p className="no-data">
                Your completed drills will appear here, not on someone else’s server.
              </p>
            )}
            {learner.sessions.length > 5 && (
              <label className="field-label">
                Earlier sessions
                <select
                  className="session-select"
                  value={selectedId}
                  onChange={(e) => {
                    setSample(null);
                    setSelectedId(e.target.value);
                  }}
                >
                  <option value="">Select a saved drill</option>
                  {learner.sessions.slice(5).map((s) => (
                    <option key={s.id} value={s.id}>
                      {dateLabel(s.completedAt)} · {scoreSession(s)}/{s.items.length * 4}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </section>
          <section className="pacing-panel dashboard-lower">
            <span className="card-kicker">
              <Leaf size={15} />
              PROGRESS WITHOUT PRESSURE
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
              <div
                className="ring"
                style={{ '--value': (learner.timelyStreak / 3) * 100 } as CSSProperties}
              >
                <div>
                  <strong>
                    {learner.timelyStreak}
                    <span style={{ fontSize: 11, fontWeight: 500 }}>/3</span>
                  </strong>
                  <small>STEADY DRILLS</small>
                </div>
              </div>
              <div>
                <h3 style={{ margin: '0 0 7px', fontSize: 17 }}>{stage.name}</h3>
                <p className="tiny-text">
                  {learner.tier === 3
                    ? 'You’ve reached the final practice stage. Keep the reasoning steady.'
                    : 'Complete three drills on time, without grace, and earn at least 70% of the available marks to move forward.'}
                </p>
              </div>
            </div>
            <Link className="text-link" href="/simulator" style={{ marginTop: 21 }}>
              Keep the momentum gentle <ArrowRight size={14} />
            </Link>
          </section>
        </div>
        <aside className="dashboard-aside">
          <section className="subject-panel card">
            <div className="panel-heading">
              <h2>The bigger picture.</h2>
              <span>All saved drills</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginBottom: 24 }}>
              <div
                className="ring"
                style={
                  { '--value': totalItems ? (correctItems / totalItems) * 100 : 0 } as CSSProperties
                }
              >
                <div>
                  <strong>
                    {totalItems ? `${Math.round((correctItems / totalItems) * 100)}%` : '—'}
                  </strong>
                  <small>ACCURACY</small>
                </div>
              </div>
              <div>
                <strong style={{ fontSize: 12 }}>
                  {totalItems ? `${correctItems} of ${totalItems} correct` : 'Your own baseline.'}
                </strong>
                <p className="tiny-text" style={{ marginTop: 5, fontSize: 9 }}>
                  Not a rank. A place to grow.
                </p>
              </div>
            </div>
            {subjects.map(({ name, Icon, total, correct }) => (
              <div className="subject-row" key={name}>
                <span className="subject-icon">
                  <Icon size={16} />
                </span>
                <div>
                  <strong>{name}</strong>
                  <div className="mini-track">
                    <span style={{ width: `${total ? (correct / total) * 100 : 0}%` }} />
                  </div>
                </div>
                <small>{total ? `${correct}/${total}` : 'No data yet'}</small>
              </div>
            ))}
          </section>
          <Coach key={session?.id || 'empty'} session={session} sample={!!sample} />
        </aside>
      </div>
      {session && (
        <>
          <ReviewStudio key={session.id} session={session} sample={!!sample} />
          <details className="audit-details card">
            <summary>Behind the estimate · transparent mathematical details</summary>
            <div className="model-metrics">
              <div className="metric-detail">
                3PL ability estimate<strong>{analysis!.ability.theta.toFixed(3)}</strong>
                <p>
                  SE {analysis!.ability.se?.toFixed(3) ?? 'unavailable'} · information{' '}
                  {analysis!.ability.information.toFixed(3)}. Bounds −3 to 3; finite-difference
                  Newton–Raphson.
                </p>
              </div>
              <div className="metric-detail">
                Precision-weighted log-time speed
                <strong>
                  {analysis!.speed ? analysis!.speed.tau.toFixed(3) : 'Not enough timed answers'}
                </strong>
                <p>
                  Conditional SE {analysis!.speed?.se.toFixed(3) ?? 'unavailable'}. Positive means
                  faster than this reference benchmark—not faster than other learners.
                </p>
              </div>
              <div className="metric-detail">
                Pressure-adjusted ability
                <strong>{analysis!.adjusted?.toFixed(3) ?? 'No timed answers'}</strong>
                <p>
                  Mean item-level SATO adjustment, λ=0.15, δ=0.22. Haste and grace terms are
                  included; the exact adjusted result is not clipped to the base bounds.
                </p>
              </div>
              <div className="metric-detail">
                Explicit confidence calibration
                <strong>
                  {analysis!.cal ? `Brier ${analysis!.cal.brier.toFixed(3)}` : 'No certainty tags'}
                </strong>
                <p>
                  {analysis!.cal
                    ? `5-bin ECE ${analysis!.cal.ece.toFixed(3)} across ${analysis!.tagged} self-reports. Lower is better.`
                    : 'Only diagnostic self-reports are measured. Click timing is never treated as certainty.'}
                </p>
              </div>
              <div className="metric-detail">
                Estimate stability<strong>{analysis!.ability.stability}</strong>
                <p>
                  All item parameters are{' '}
                  {session.items.some((i) => i.parameter_source === 'model-proposed')
                    ? 'model-proposed'
                    : 'illustrative'}
                  , not population calibrated. Short-drill uncertainty remains high.
                </p>
              </div>
              <div className="metric-detail">
                Time debt
                <strong>
                  {session.timeDeficits.reduce((n, e) => n + e.seconds, 0) / 60} min grace
                </strong>
                <p>
                  {session.timeDeficits.length} immutable extension event
                  {session.timeDeficits.length === 1 ? '' : 's'} retained with this completed drill.
                  Grace does not reduce the actual score.
                </p>
              </div>
            </div>
            <p className="estimate-note">
              These models are implemented faithfully but their parameters have not been calibrated
              against a representative JEE population. They are learning signals, not psychometric
              certification, a percentile or a rank predictor. View option-level NRM details in Deep
              analysis.{' '}
              <Link className="text-link" href="/science">
                Read the equations <ArrowUpRight size={12} />
              </Link>
            </p>
          </details>
        </>
      )}
      <section className="data-panel card" id="data">
        <div>
          <h2>
            <ShieldCheck size={17} />
            Your data has a home. Right here.
          </h2>
          <p>
            History, repair checks and revision cards live in this browser. Back them up before
            changing devices. Import replaces your current history; keys never travel in a backup.
          </p>
        </div>
        <div className="data-actions">
          <button
            className="button secondary"
            onClick={() => exportLearner(learner)}
            disabled={busy}
          >
            <Download size={14} />
            Export JSON
          </button>
          <label className="button secondary import-label">
            <Upload size={14} />
            Import JSON
            <input
              className="hidden"
              type="file"
              accept="application/json,.json"
              aria-label="Import local data backup"
              disabled={busy}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void doImport(file);
                e.target.value = '';
              }}
            />
          </label>
          <button className="button danger" disabled={busy} onClick={() => setReset(true)}>
            <Trash2 size={14} />
            Reset local data
          </button>
        </div>
        {dataError && (
          <p className="error-text" role="alert">
            {dataError}
          </p>
        )}
      </section>
      <dialog
        className="modal submit-modal"
        ref={resetDialog}
        onClose={() => {
          if (!busy) setReset(false);
        }}
        aria-labelledby="reset-title"
      >
        <button
          className="icon-button modal-close"
          aria-label="Cancel data reset"
          disabled={busy}
          onClick={() => setReset(false)}
        >
          <X size={19} />
        </button>
        <div className="modal-symbol">
          <RotateCcw size={26} />
        </div>
        <h2 id="reset-title">Make room for a fresh start?</h2>
        <p>
          This removes your drill history, recovery checks, cards, browser key and preferences on
          this device only. It cannot be undone. Export a backup first if you want to keep your
          progress.
        </p>
        <div className="setup-actions">
          <button className="button secondary" onClick={() => setReset(false)} disabled={busy}>
            Keep my data
          </button>
          <button className="button danger" onClick={() => void doReset()} disabled={busy}>
            {busy ? 'Resetting…' : 'Remove all local data'}
          </button>
        </div>
      </dialog>
    </>
  );
}
