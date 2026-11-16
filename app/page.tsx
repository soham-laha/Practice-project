'use client';
import Link from 'next/link';
import { ArrowUpRight, ArrowRight, Check, KeyRound } from 'lucide-react';
import { useApp } from '@/components/providers';
import { ExamSelect } from '@/components/exam-select';
import { TrapPreview } from '@/components/trap-preview';
import { Orbit } from '@/components/orbit';
import { PACING } from '@/lib/psychometrics';

export default function Home() {
  const { learner, exam, setKeyModal } = useApp();
  const completed = learner.sessions.length > 0,
    repairs = Object.values(learner.repairs).filter((r) => r.recoveryAt).length,
    retained = Object.values(learner.repairs).some((r) => r.box >= 2);
  return (
    <div className="home-page">
      <header className="page-heading">
        <div>
          <h1>Your practice notebook.</h1>
          <p>A focused drill, a careful review, one thing to carry into the next attempt.</p>
        </div>
        <div className="exam-control">
          <span className="field-caption">Practice for</span>
          <ExamSelect />
        </div>
      </header>
      <div className="notebook-opening">
        <section className="practice-intro">
          <h2>Find the step that needs a second look.</h2>
          <p>
            Start with a checked reference problem. When an answer goes wrong, replay the first
            mistaken step and test the repair.
          </p>
          <div className="notebook-actions">
            <Link href="/simulator?start=reference" className="button primary">
              Start a reference drill <ArrowUpRight size={17} />
            </Link>
            <Link href="/forge" className="text-link">
              Use your own problem <ArrowRight size={16} />
            </Link>
          </div>
          <p className="practice-note">
            No account or AI key needed for reference practice. Your work stays on this device.
          </p>
        </section>
        <TrapPreview />
      </div>
      <section className="practice-ledger" aria-labelledby="path-title">
        <div className="section-heading">
          <h2 id="path-title">Your next steps</h2>
          <span className="path-count">
            {Number(completed) + Number(repairs > 0) + Number(retained)} of 3 complete
          </span>
        </div>
        <ol className="notebook-path">
          {[
            {
              name: 'Complete a drill',
              detail: completed ? 'First drill completed' : 'Try a focused reference set',
              done: completed,
            },
            {
              name: 'Check a repair',
              detail: repairs
                ? `${repairs} recovery check${repairs > 1 ? 's' : ''} completed`
                : 'Replay the first wrong pivot',
              done: repairs > 0,
            },
            {
              name: 'Return to the lesson',
              detail: retained ? 'First recall cycle completed' : 'Revisit a saved revision card',
              done: retained,
            },
          ].map(({ name, detail, done }) => (
            <li key={name} className={done ? 'complete' : ''}>
              <div>
                <strong>{name}</strong>
                <p>{detail}</p>
              </div>
              {done && <Check size={17} aria-label="Complete" />}
            </li>
          ))}
        </ol>
      </section>
      <section className="workspace-index" aria-labelledby="practice-title">
        <div className="workspace-index-heading">
          <h2 id="practice-title">Work at your own pace.</h2>
          <p>
            JEE {exam === 'main' ? 'Main' : 'Advanced'}. {PACING[learner.tier].name} pacing,{' '}
            {PACING[learner.tier].factor.toFixed(2)}× the reference time.
          </p>
          <Link href="/science" className="text-link">
            Read how the engine works <ArrowUpRight size={15} />
          </Link>
        </div>
        <div className="workspace-index-rows">
          <Link href="/forge">
            <h3>Build from your books</h3>
            <p>
              A photo, PDF or pasted problem. Gemini proposes the drill; algebra checks its
              certificates.
            </p>
            <ArrowUpRight size={20} />
          </Link>
          <Link href="/simulator">
            <h3>Practice without the noise</h3>
            <p>
              A familiar CBT interface, adaptive timing and optional grace at the time boundary.
            </p>
            <ArrowUpRight size={20} />
          </Link>
          <Link href="/dashboard">
            <h3>Understand the attempt</h3>
            <p>See why an answer felt right, where it diverged and which guardrail to try next.</p>
            <ArrowUpRight size={20} />
          </Link>
        </div>
      </section>
      <section className="notebook-close">
        <div>
          <h2>AI is optional. Practice isn’t locked behind it.</h2>
          <p>
            Use your own Gemini key for scanned problems and coaching, or try the experimental
            on-device text assistant in the forge. Provider quotas and charges may apply.
          </p>
          <button className="text-link" onClick={() => setKeyModal(true)}>
            <KeyRound size={16} />
            Manage your Gemini key
          </button>
        </div>
        <figure className="notebook-orbit">
          <Orbit />
          <figcaption>Illustrative practice orbit, not learner data.</figcaption>
        </figure>
      </section>
    </div>
  );
}
