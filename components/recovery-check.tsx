'use client';
import { useState, useEffect, useRef } from 'react';
import { Timer, ArrowRight, CheckCircle2, Lightbulb, RotateCcw } from 'lucide-react';
import { type Trap } from '@/lib/types';
import { recoveryMatches } from '@/lib/analysis';
import { MathText, MathExpr } from './math';
export function RecoveryCheck({
  trap,
  repaired,
  onRepair,
}: {
  trap: Trap;
  repaired: boolean;
  onRepair: () => Promise<void>;
}) {
  const [started, setStarted] = useState(false),
    [left, setLeft] = useState(45),
    [value, setValue] = useState(''),
    [result, setResult] = useState<'none' | 'wrong' | 'right'>('none'),
    [busy, setBusy] = useState(false),
    [revealed, setRevealed] = useState(false),
    [error, setError] = useState('');
  const deadline = useRef(0);
  useEffect(() => {
    if (!started || result === 'right') return;
    const id = setInterval(
      () => setLeft(Math.max(0, Math.ceil((deadline.current - Date.now()) / 1000))),
      250,
    );
    return () => clearInterval(id);
  }, [started, result]);
  async function submit() {
    if (!value.trim()) return;
    if (!recoveryMatches(value, trap.recovery_check.answer, trap.recovery_check.expression)) {
      setResult('wrong');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await onRepair();
      setResult('right');
    } catch {
      setError(
        'The check is correct, but could not be saved. Allow browser storage and try again.',
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <section
      className={`recovery-box ${repaired || result === 'right' ? 'redeemed' : ''}`}
      aria-label="45-second recovery check"
    >
      <div className="recovery-title">
        {repaired || result === 'right' ? <CheckCircle2 size={17} /> : <Timer size={17} />}04 ·{' '}
        {repaired || result === 'right'
          ? 'Thinking repaired. Keep the rule.'
          : 'Give the thinking a second chance.'}
        <span className="pill">{started ? `${left}s` : '45-second check'}</span>
      </div>
      {repaired && !started ? (
        <>
          <p>
            This recovery is saved. A revision card is waiting whenever you’re ready to revisit it.
          </p>
          <button
            className="text-link"
            onClick={() => {
              setStarted(true);
              deadline.current = Date.now() + 45000;
            }}
          >
            <RotateCcw size={13} />
            Try the check again
          </button>
        </>
      ) : (
        <>
          <p>
            <MathText text={trap.recovery_check.question} />
          </p>
          {!started ? (
            <button
              className="button secondary small-button"
              onClick={() => {
                deadline.current = Date.now() + 45000;
                setStarted(true);
              }}
            >
              Start recovery check <ArrowRight size={14} />
            </button>
          ) : (
            <>
              <form
                className="recovery-controls"
                onSubmit={(e) => {
                  e.preventDefault();
                  void submit();
                }}
              >
                <input
                  aria-label="Recovery answer"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  placeholder="Your answer (e.g. 3 or 1/2)"
                  maxLength={300}
                  disabled={result === 'right' || busy}
                />
                <button
                  className="button primary small-button"
                  disabled={busy || !value.trim() || result === 'right'}
                >
                  {result === 'right' ? 'Recovered ✓' : busy ? 'Saving…' : 'Check my thinking'}
                </button>
              </form>
              {left === 0 && result !== 'right' && (
                <p className="tiny-text">
                  The 45-second window has passed. Keep thinking—there’s no cutoff.
                </p>
              )}
              {result === 'wrong' && (
                <div className="error-text" role="status">
                  Not quite yet. Apply the guardrail, then try once more. Equivalent fractions and
                  decimals are accepted.
                  <button
                    className="text-link"
                    style={{ display: 'flex', marginTop: 8 }}
                    onClick={() => setRevealed(true)}
                  >
                    Show a worked explanation <Lightbulb size={13} />
                  </button>
                </div>
              )}
              {(result === 'right' || revealed) && (
                <div className="recovery-result" role="status">
                  <CheckCircle2 size={16} />
                  <span>
                    <MathExpr value={trap.recovery_check.expression} /> —{' '}
                    {trap.recovery_check.explanation}
                    {revealed && result !== 'right'
                      ? ' Try entering the answer after following the reasoning.'
                      : ' A small correction, a stronger next attempt.'}
                  </span>
                </div>
              )}
              <p role="alert" className="error-text">
                {error}
              </p>
            </>
          )}
        </>
      )}
    </section>
  );
}
