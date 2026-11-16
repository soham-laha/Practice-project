'use client';
import { useState, useEffect, useRef } from 'react';
import { ArrowRight, RotateCcw, Timer, Check, Lightbulb } from 'lucide-react';
import { MathExpr } from './math';
export function TrapPreview() {
  const [phase, setPhase] = useState<'idle' | 'running' | 'done'>('idle'),
    [seconds, setSeconds] = useState(5),
    [choice, setChoice] = useState<number | null>(null);
  const deadline = useRef(0);
  useEffect(() => {
    if (phase !== 'running') return;
    const id = setInterval(() => {
      const left = Math.max(0, Math.ceil((deadline.current - Date.now()) / 1000));
      setSeconds(left);
      if (!left) setPhase('done');
    }, 100);
    return () => clearInterval(id);
  }, [phase]);
  function reset() {
    setPhase('idle');
    setChoice(null);
    setSeconds(5);
  }
  return (
    <section
      className={`trap-preview card ${phase === 'done' ? 'trap-complete' : ''}`}
      aria-labelledby="trap-title"
    >
      <div className="card-topline">
        <span className="eyebrow">
          <span className="plum-dot" />A QUICK MIND CHECK
        </span>
        <span className="time-chip">
          <Timer size={13} />
          {seconds}s
        </span>
      </div>
      <h3 id="trap-title">
        Looks familiar.
        <br />
        <em>Look a little closer.</em>
      </h3>
      <p className="trap-question">
        If <MathExpr value="x=-3" />, then <MathExpr value="\sqrt{x^2} = \;?" />
      </p>
      <div className="trap-options">
        {['-3', '3', '9', '0'].map((value, i) => (
          <button
            key={value}
            onClick={() => {
              setChoice(i);
              setPhase('done');
            }}
            disabled={phase === 'done'}
            className={`${choice === i ? 'chosen' : ''} ${phase === 'done' && i === 1 ? 'right-answer' : ''}`}
            aria-label={`Preview option ${'ABCD'[i]}: ${value}`}
          >
            <span>{'ABCD'[i]}</span>
            <MathExpr value={value} />
            {phase === 'done' && i === 1 && <Check size={15} />}
          </button>
        ))}
      </div>
      {phase === 'done' ? (
        <div className="trap-reveal" role="status">
          <div>
            <Lightbulb size={17} />
            <strong>
              {choice === 1 ? 'You caught the sign trap.' : 'The square root keeps no minus sign.'}
            </strong>
          </div>
          <p>
            <MathExpr value="\sqrt{x^2}=|x|=3" />. Check the domain before cancelling.
          </p>
          <button className="text-link" onClick={reset}>
            Try again <RotateCcw size={13} />
          </button>
        </div>
      ) : (
        <>
          <p className="tiny-text">Not a knowledge gap. A split-second shortcut.</p>
          <button
            className="button preview-start"
            disabled={phase === 'running'}
            onClick={() => {
              deadline.current = Date.now() + 5000;
              setPhase('running');
            }}
          >
            {' '}
            {phase === 'running' ? 'Trust your reasoning, not the clock' : 'Try the 5-second trap'}
            <ArrowRight size={16} />
          </button>
        </>
      )}
    </section>
  );
}
