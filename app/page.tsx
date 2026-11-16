'use client';
import Link from 'next/link';
import {
  ArrowUpRight,
  ArrowRight,
  Sparkles,
  ShieldCheck,
  Check,
  ScanLine,
  Target,
  CornerDownRight,
  Leaf,
  BookOpen,
  Timer,
  ChevronRight,
  KeyRound,
  FlaskConical,
  Plus,
} from 'lucide-react';
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
      <div className="page-heading">
        <div>
          <div className="welcome-line">
            <span className="little-sun">✳</span> A fresh start, a sharper mind.
          </div>
          <h1>
            Make your knowledge <em>exam-ready.</em>
          </h1>
          <p>You know more than your score says. Let’s close that gap.</p>
        </div>
        <div className="exam-control">
          <span className="field-caption">YOUR NEXT CHALLENGE</span>
          <ExamSelect />
        </div>
      </div>
      <div className="hero-grid">
        <section className="hero-card">
          <div className="hero-tag">
            <span className="status-dot" />
            LESS GUESSWORK. MORE UNDERSTANDING.
          </div>
          <h2>
            Don’t just solve it.
            <br />
            <span>See through</span>
            <br />
            <em>the trap.</em>
          </h2>
          <p>
            Turn the problems you study into the practice
            <br className="desktop-break" /> you need. Find the slip. Fix the thinking.
            <br className="desktop-break" /> Walk into your next exam a little surer.
          </p>
          <div className="hero-actions">
            <Link href="/simulator?start=reference" className="button primary hero-cta">
              Start a reference drill <ArrowUpRight size={18} />
            </Link>
            <Link href="/forge" className="hero-secondary">
              Use your own problem <ArrowRight size={15} />
            </Link>
          </div>
          <div className="hero-meta">
            <span>
              <Check size={13} />
              No signup
            </span>
            <span>
              <Check size={13} />
              No key needed
            </span>
            <span>
              <Check size={13} />
              Made for {exam === 'main' ? 'Main' : 'Advanced'}
            </span>
          </div>
          <Orbit />
          <div className="hero-sticker">
            <span className="mini-check">
              <Check size={11} />
            </span>
            One less mistake.
            <br />
            <strong>One more breakthrough.</strong>
          </div>
          <div className="hero-number" aria-hidden="true">
            01 / ∞
          </div>
        </section>
        <TrapPreview />
      </div>
      <section className="path-section" aria-labelledby="path-title">
        <div className="section-heading">
          <div>
            <span className="eyebrow">SMALL STEPS. COMPOUNDING GAINS.</span>
            <h2 id="path-title">Your next breakthrough starts here.</h2>
          </div>
          <span className="path-count">
            {1 + Number(completed) + Number(repairs > 0) + Number(retained)} of 4 steps{' '}
            <span>in motion</span>
          </span>
        </div>
        <div className="mastery-path card">
          {[
            {
              name: 'Make room to grow',
              detail: 'Your private space is ready',
              done: true,
              Icon: Leaf,
            },
            {
              name: 'Meet your blind spots',
              detail: completed ? 'First drill completed' : 'Take a focused reference drill',
              done: completed,
              Icon: ScanLine,
            },
            {
              name: 'Repair the thinking',
              detail: repairs
                ? `${repairs} recovery check${repairs > 1 ? 's' : ''} completed`
                : 'Replay the first wrong pivot',
              done: repairs > 0,
              Icon: CornerDownRight,
            },
            {
              name: 'Make it second nature',
              detail: retained ? 'First recall cycle completed' : 'Revisit. Recall. Retain.',
              done: retained,
              Icon: Target,
            },
          ].map(({ name, detail, done, Icon }, i) => (
            <div className={`path-step ${done ? 'complete' : ''}`} key={name}>
              <div className="path-node">{done ? <Check size={18} /> : <Icon size={18} />}</div>
              <div>
                <span className="step-number">0{i + 1}</span>
                <strong>{name}</strong>
                <p>{detail}</p>
              </div>
              {i < 3 && <ChevronRight className="path-arrow" size={15} />}
            </div>
          ))}
        </div>
      </section>
      <section aria-labelledby="practice-title">
        <div className="section-heading">
          <div>
            <span className="eyebrow">PRACTICE WITH A PURPOSE</span>
            <h2 id="practice-title">A quieter space. A sharper edge.</h2>
          </div>
          <Link href="/science" className="text-link">
            Meet the engine <ArrowUpRight size={15} />
          </Link>
        </div>
        <div className="feature-grid">
          <Link href="/forge" className="feature-card feature-apricot">
            <div className="feature-icon">
              <ScanLine size={23} />
            </div>
            <span className="feature-label">THE ITEM FORGE</span>
            <h3>
              Your books.
              <br />A new perspective.
            </h3>
            <p>
              Photo, PDF or pasted problem. Turn what you’re learning into traps worth learning
              from.
            </p>
            <div className="feature-bottom">
              <span>Build a personal drill</span>
              <span className="round-arrow">
                <ArrowUpRight size={18} />
              </span>
            </div>
            <div className="forge-mini-art" aria-hidden="true">
              <span>∫</span>
              <span>→</span>
              <span>
                A B<br />C D
              </span>
            </div>
          </Link>
          <Link href="/simulator" className="feature-card feature-lilac">
            <div className="feature-icon">
              <Timer size={23} />
            </div>
            <span className="feature-label">THE PRACTICE ROOM</span>
            <h3>
              Find your rhythm.
              <br />
              Then find your pace.
            </h3>
            <p>
              A familiar CBT interface. Adaptive timing. A little grace when you need it, not a hard
              stop.
            </p>
            <div className="feature-bottom">
              <span>
                {PACING[learner.tier].name} · {PACING[learner.tier].factor.toFixed(2)}×
              </span>
              <span className="round-arrow">
                <ArrowUpRight size={18} />
              </span>
            </div>
            <div className="pace-mini-art" aria-hidden="true">
              <span />
              <span />
              <span />
              <span />
              <span />
              <span />
              <span />
            </div>
          </Link>
          <Link href="/dashboard" className="feature-card feature-leaf">
            <div className="feature-icon">
              <BookOpen size={23} />
            </div>
            <span className="feature-label">THE REVIEW STUDIO</span>
            <h3>
              A mistake isn’t
              <br />
              the end of the story.
            </h3>
            <p>
              See why it felt right, where it went wrong, and the one rule that makes it click next
              time.
            </p>
            <div className="feature-bottom">
              <span>Understand. Repair. Move forward.</span>
              <span className="round-arrow">
                <ArrowUpRight size={18} />
              </span>
            </div>
            <div className="repair-mini-art" aria-hidden="true">
              <span>×</span>
              <span>→</span>
              <span>✓</span>
            </div>
          </Link>
        </div>
      </section>
      <section className="bottom-banner card">
        <div className="banner-icon">
          <Sparkles size={25} />
        </div>
        <div>
          <h3>A thoughtful coach, not another subscription.</h3>
          <p>Bring a free Gemini key. Get drills and guidance that meet you where you are.</p>
        </div>
        <button className="button secondary" onClick={() => setKeyModal(true)}>
          <KeyRound size={16} />
          Connect your key <Plus size={15} />
        </button>
      </section>
      <div className="trust-row">
        <span>
          <ShieldCheck size={15} />
          Progress stays on your device
        </span>
        <span>
          <FlaskConical size={15} />
          Algebra-checked reference items
        </span>
        <span>
          <Target size={15} />
          Main + Advanced, your way
        </span>
      </div>
    </div>
  );
}
