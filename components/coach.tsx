'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { Sparkles, ArrowUp, KeyRound, LoaderCircle, ShieldCheck, ArrowUpRight } from 'lucide-react';
import { type Session } from '@/lib/types';
import { apiRequest } from '@/lib/api';
import { useApp } from './providers';
import { MathText } from './math';
import Link from 'next/link';
export function Coach({ session, sample = false }: { session?: Session; sample?: boolean }) {
  const { hasKey, setKeyModal, exam, model } = useApp(),
    [messages, setMessages] = useState<{ role: 'user' | 'coach'; text: string }[]>([]),
    [input, setInput] = useState(''),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const auto = useRef(new Set<string>()),
    busyRef = useRef(false);
  const context = session
    ? JSON.stringify({
        notice: sample
          ? 'Explicit sample, not learner data'
          : 'Provisional short-drill observational summary',
        exam: session.exam,
        items: session.items.map((i) => {
          const a = session.attempts.find((t) => t.itemId === i.id)!;
          return {
            topic: i.topic,
            correct: a.selected === i.correct_id,
            trap: i.options.find((o) => o.id === a.selected)?.trap?.label || null,
            elapsed: Math.round(a.elapsed),
            benchmark: i.beta_seconds,
            grace: a.grace,
          };
        }),
      })
    : 'No completed drill yet. Offer a gentle starting plan, not a diagnosis.';
  const send = useCallback(
    async (message: string, automatic = false) => {
      if (!hasKey) {
        setKeyModal(true);
        return;
      }
      if (busyRef.current) return;
      busyRef.current = true;
      setBusy(true);
      setError('');
      if (!automatic) setMessages((m) => [...m, { role: 'user', text: message }]);
      try {
        const previous = messages
          .slice(-6)
          .map((m) => `${m.role}: ${m.text}`)
          .join('\n')
          .slice(-4000);
        const result = await apiRequest('v1/coach', {
          message,
          context: `${context}\nRecent conversation:\n${previous}`.slice(0, 8000),
          exam: session?.exam || exam,
          model,
        });
        if (typeof result.reply !== 'string')
          throw new Error('The coach returned an unreadable answer. Please retry.');
        setMessages((m) => [...m, { role: 'coach', text: result.reply }]);
      } catch (e) {
        setError(
          e instanceof Error
            ? e.message
            : 'The coach is unavailable. Your saved drill and repair checks are unaffected.',
        );
      } finally {
        busyRef.current = false;
        setBusy(false);
      }
    },
    [hasKey, setKeyModal, messages, context, session, exam, model],
  );
  useEffect(() => {
    if (!session || !hasKey || sample || auto.current.has(session.id)) return;
    let cancelled = false;
    void Promise.resolve().then(() => {
      if (cancelled || auto.current.has(session.id)) return;
      auto.current.add(session.id);
      void send(
        'Based on this drill, suggest one specific improvement and one short targeted practice question with worked answer.',
        true,
      );
    });
    return () => {
      cancelled = true;
    };
  }, [session, hasKey, sample, send]);
  return (
    <section className="coach-panel glass card" aria-labelledby="coach-title">
      <div className="coach-heading">
        <span className="coach-symbol">
          <Sparkles size={19} />
        </span>
        <div>
          <h2 id="coach-title">Your thinking partner.</h2>
          <p>AI study coach & suggested drills</p>
        </div>
        <span className="pill accent push-right">BYOK</span>
      </div>
      <p>
        {hasKey
          ? 'A small next step, tailored to the evidence. This panel sends your drill summary to Gemini when it opens; follow-ups use the same key.'
          : 'A specific guardrail. A targeted question. A nudge in the right direction—powered by your optional Gemini key.'}
      </p>
      {!hasKey ? (
        <>
          <button className="button secondary coach-connect" onClick={() => setKeyModal(true)}>
            <KeyRound size={15} />
            Add key for coaching (optional) <ArrowUpRight size={14} />
          </button>
          <div className="privacy-note">
            <ShieldCheck size={16} />
            <span>
              All drills, scoring, and analysis work locally on this device without requiring an API
              key. Bringing your own Gemini key is optional for personalized post-drill study
              coaching and cloud image extraction.
            </span>
          </div>
        </>
      ) : (
        <>
          <div className="suggestion-chips">
            {['What should I work on next?', 'Give me a targeted practice question'].map((q) => (
              <button key={q} disabled={busy} onClick={() => void send(q)}>
                {q} <ArrowUpRight size={11} />
              </button>
            ))}
          </div>
          <div className="coach-messages" aria-live="polite">
            {messages.map((m, i) => (
              <div className={`chat-message ${m.role === 'user' ? 'user' : ''}`} key={i}>
                <strong>{m.role === 'user' ? 'You' : 'Coach'}</strong>
                <MathText text={m.text} />
              </div>
            ))}
            {busy && (
              <div className="chat-message">
                <LoaderCircle size={14} className="spinner" /> A considered answer is on its way…
              </div>
            )}
          </div>
          <form
            className="coach-form"
            onSubmit={(e) => {
              e.preventDefault();
              const v = input.trim();
              if (v) {
                setInput('');
                void send(v);
              }
            }}
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              aria-label="Ask your AI study coach"
              placeholder="What’s on your mind?"
              maxLength={2000}
              disabled={busy}
            />
            <button
              className="button primary"
              aria-label="Send message to coach"
              disabled={busy || !input.trim()}
            >
              <ArrowUp size={17} />
            </button>
          </form>
          <p className="error-text" role="alert">
            {error}
          </p>
        </>
      )}
      <div className="model-label">
        {model === 'gemini-flash-latest' ? 'Gemini Flash' : 'Gemini Flash Lite'}
        <span aria-hidden="true">/</span>
        <button onClick={() => setKeyModal(true)}>Manage key & model</button>
      </div>
      <Link className="text-link" href="/forge#local-assistant">
        Try on-device text help
      </Link>
      <p className="tiny-text" style={{ marginTop: 10 }}>
        AI suggestions can be wrong and are not SymPy-verified drill items. Use the forge to
        validate a full new drill.
      </p>
    </section>
  );
}
