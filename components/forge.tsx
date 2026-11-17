'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  FileText,
  Image as ImageIcon,
  Upload,
  Check,
  ShieldCheck,
  ArrowRight,
  KeyRound,
  LoaderCircle,
  Copy,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import { useApp } from './providers';
import { ExamSelect } from './exam-select';
import { MathText } from './math';
import { LocalAssistant } from './local-assistant';
import { apiRequest, ApiError, checkEngine, diagnosticReceipt } from '@/lib/api';
import { generateLocalDrill } from '@/lib/local-generator';
import { itemSchema, type Item } from '@/lib/types';
import { KEYS } from '@/lib/storage';

export function Forge() {
  const { exam, model, setModel, hasKey, setKeyModal } = useApp(),
    router = useRouter();
  const [userEngineMode, setUserEngineMode] = useState<'local' | 'cloud' | null>(null),
    [tab, setTab] = useState<'text' | 'image' | 'pdf'>('text'),
    [text, setText] = useState(''),
    [file, setFile] = useState<File | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [failure, setFailure] = useState<ApiError | null>(null),
    [usedModel, setUsedModel] = useState(model),
    [copied, setCopied] = useState(''),
    [engine, setEngine] = useState(''),
    [checking, setChecking] = useState(false),
    [items, setItems] = useState<Item[]>([]);

  const generatorMode = userEngineMode ?? (hasKey ? 'cloud' : 'local');
  function chooseFile(f: File | undefined) {
    setError('');
    setFailure(null);
    setItems([]);
    setFile(null);
    if (!f) return;
    if (f.size > 20 * 1024 * 1024) {
      setError('Choose a file at most 20 MB.');
      return;
    }
    if (!f.size) {
      setError('This file is empty.');
      return;
    }
    const valid =
      tab === 'pdf' ? f.type === 'application/pdf' : ['image/png', 'image/jpeg'].includes(f.type);
    if (!valid) {
      setError(`Choose a ${tab === 'pdf' ? 'PDF' : 'PNG or JPEG image'}.`);
      return;
    }
    setFile(f);
  }
  async function generate() {
    if (generatorMode === 'cloud' && !hasKey) {
      setKeyModal(true);
      return;
    }
    if (busy) return;
    setError('');
    setFailure(null);
    setCopied('');
    setItems([]);
    setUsedModel(model);

    if (generatorMode === 'local') {
      if (tab === 'text' && text.trim().length > 0 && text.trim().length < 10) {
        setError('Paste a complete problem, at least 10 characters.');
        return;
      }
      setBusy(true);
      try {
        const localDrill = generateLocalDrill({ text, exam, requestedCount: 4 });
        if (!localDrill.length) {
          throw new Error('Could not parse drill items locally. Please check your problem text.');
        }
        setItems(localDrill);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Local generation failed.');
      } finally {
        setBusy(false);
      }
      return;
    }

    if (tab === 'text' && text.trim().length < 10) {
      setError('Paste a complete problem, at least 10 characters.');
      return;
    }
    if (tab !== 'text' && !file) {
      setError('Select a problem file first.');
      return;
    }
    setBusy(true);
    try {
      let body: object | FormData;
      if (tab === 'text') body = { text, exam, model };
      else {
        const form = new FormData();
        form.set('file', file!);
        form.set('exam', exam);
        form.set('model', model);
        body = form;
      }
      const result = await apiRequest(
        tab === 'text' ? 'v1/extractions' : 'v1/extractions/upload',
        body,
      );
      if (!Array.isArray(result.items) || !result.items.length || result.items.length > 25)
        throw new Error();
      const parsed: Item[] = result.items.map((i: unknown) => itemSchema.parse(i));
      if (
        parsed.some((i) => i.exam !== exam) ||
        new Set(parsed.map((i) => i.id)).size !== parsed.length
      )
        throw new Error();
      setItems(parsed);
    } catch (e) {
      if (e instanceof ApiError) {
        setError(e.message);
        setFailure(e);
      } else
        setError(
          e instanceof Error && !e.message.startsWith('[') && e.message.length < 600
            ? e.message ||
                'The returned drill did not pass the client contract. No drill was created.'
            : 'The returned drill did not pass the client contract. No drill was created.',
        );
    } finally {
      setBusy(false);
    }
  }
  function begin() {
    if (!items.length || items.some((item) => item.exam !== exam)) return;
    try {
      sessionStorage.setItem(KEYS.forged, JSON.stringify(items));
      router.push('/simulator?start=forged');
    } catch {
      setError(
        'Browser session storage is unavailable. Allow it to carry your drill into the simulator.',
      );
    }
  }
  const stage = failure?.diagnostic?.stage;
  const quotaLimited = failure?.diagnostic?.code === 'provider_quota';
  const resultMatchesExam = items.length > 0 && items.every((item) => item.exam === exam);
  return (
    <>
      <header className="page-title split-heading forge-heading">
        <div>
          <h1>Build a practice drill.</h1>
          <p>Bring one complete problem. Review what was extracted before you begin.</p>
        </div>
        <ExamSelect disabled={busy} />
      </header>
      <div className="forge-grid">
        <section className="forge-form" aria-labelledby="source-title">
          <div className="panel-heading">
            <h2 id="source-title">The source problem</h2>
            <span className="tiny-text">Text, image or PDF</span>
          </div>
          <div className="input-tabs" role="tablist" aria-label="Problem source">
            {[
              { id: 'text', label: 'Paste text', short: 'Text', Icon: FileText },
              { id: 'image', label: 'Upload image', short: 'Image', Icon: ImageIcon },
              { id: 'pdf', label: 'Upload PDF', short: 'PDF', Icon: Upload },
            ].map((v) => (
              <button
                key={v.id}
                role="tab"
                aria-label={v.label}
                aria-selected={tab === v.id}
                aria-controls="source-panel"
                id={`tab-${v.id}`}
                disabled={busy}
                tabIndex={tab === v.id ? 0 : -1}
                onKeyDown={(event) => {
                  const keys = ['ArrowLeft', 'ArrowRight', 'Home', 'End'];
                  if (!keys.includes(event.key)) return;
                  event.preventDefault();
                  const order = ['text', 'image', 'pdf'] as const;
                  const current = order.indexOf(tab);
                  const next =
                    event.key === 'Home'
                      ? 0
                      : event.key === 'End'
                        ? 2
                        : (current + (event.key === 'ArrowRight' ? 1 : 2)) % 3;
                  const target = document.getElementById(`tab-${order[next]}`);
                  target?.click();
                  target?.focus();
                }}
                onClick={() => {
                  setTab(v.id as typeof tab);
                  setFile(null);
                  setError('');
                  setFailure(null);
                  setItems([]);
                }}
              >
                <v.Icon size={16} />
                {v.short}
              </button>
            ))}
          </div>
          <div id="source-panel" role="tabpanel" aria-labelledby={`tab-${tab}`}>
            {tab === 'text' ? (
              <>
                <label htmlFor="problem-text" className="field-label">
                  Paste a complete, self-contained problem
                </label>
                <textarea
                  id="problem-text"
                  value={text}
                  onChange={(e) => {
                    setText(e.target.value);
                    setItems([]);
                  }}
                  placeholder="A block of mass 2 kg rests in a lift accelerating upward at 3 m/s². Take g = 10 m/s². Find the normal force…"
                  maxLength={30000}
                  disabled={busy}
                />
                <p className="tiny-text source-helper">
                  Include values, units and necessary diagram descriptions.{' '}
                  <span>{text.length.toLocaleString()} / 30,000</span>
                </p>
              </>
            ) : (
              <label className={`upload-zone ${file ? 'has-file' : ''}`}>
                <Upload size={28} />
                <strong>
                  {file ? file.name : `Choose a ${tab === 'pdf' ? 'PDF' : 'problem photo'}`}
                </strong>
                <small>
                  {file
                    ? `${(file.size / 1024 / 1024).toFixed(2)} MB, ready to forge`
                    : tab === 'pdf'
                      ? 'Unencrypted PDF, up to 30 pages, max 20 MB'
                      : 'PNG or JPEG, up to 25 megapixels, max 20 MB'}
                </small>
                <span className="button secondary small-button">
                  {file ? 'Choose another file' : 'Browse files'}
                </span>
                <input
                  type="file"
                  aria-label={tab === 'pdf' ? 'Upload PDF problem' : 'Upload PNG or JPEG problem'}
                  accept={tab === 'pdf' ? 'application/pdf' : 'image/png,image/jpeg'}
                  onChange={(e) => chooseFile(e.target.files?.[0])}
                  disabled={busy}
                />
              </label>
            )}
          </div>
          <div className="forge-settings">
            <div>
              <label className="field-label" htmlFor="generator-engine">
                Generation engine
              </label>
              <select
                id="generator-engine"
                value={generatorMode}
                onChange={(e) => {
                  setUserEngineMode(e.target.value as 'local' | 'cloud');
                  setItems([]);
                }}
                disabled={busy}
              >
                <option value="local">In-Browser Engine (Instant, no API key needed)</option>
                <option value="cloud">Gemini Cloud Model (Requires API key)</option>
              </select>
            </div>
            {generatorMode === 'cloud' && (
              <div>
                <label className="field-label" htmlFor="forge-model">
                  Your Gemini model
                </label>
                <select
                  id="forge-model"
                  value={model}
                  onChange={(e) => {
                    setModel(e.target.value as typeof model);
                    setItems([]);
                  }}
                  disabled={busy}
                >
                  <option value="gemini-flash-latest">Gemini Flash (balanced)</option>
                  <option value="gemini-flash-lite-latest">Gemini Flash Lite (lightweight)</option>
                </select>
              </div>
            )}
            <p className="tiny-text">
              JEE {exam === 'main' ? 'Main' : 'Advanced'}
              <br />
              +4 / −{exam === 'main' ? '1' : '1 or 2'} marks,{' '}
              {exam === 'main' ? '90–180' : '180–300'}s benchmark
            </p>
          </div>
          <div className="form-bottom">
            <p className="tiny-text">
              {generatorMode === 'local'
                ? 'In-browser generation runs locally on your device with 0 external API key required and no timeout. Gemini API key is optional for post-drill coaching.'
                : 'Only upload material you’re allowed to share with your AI provider. Nothing is stored on our server.'}
            </p>
            <button className="button primary" disabled={busy} onClick={() => void generate()}>
              {busy ? (
                <LoaderCircle size={16} className="spinner" />
              ) : generatorMode === 'local' ? (
                <Sparkles size={16} />
              ) : (
                <KeyRound size={16} />
              )}
              {busy
                ? 'Forging & checking…'
                : hasKey || generatorMode === 'local'
                  ? 'Forge my drill'
                  : 'Add key to forge'}
              <ArrowRight size={16} />
            </button>
          </div>
          {busy && (
            <p className="forge-working" role="status">
              {generatorMode === 'local'
                ? 'Generating verified options and distractors directly in your browser…'
                : 'Waiting for Gemini and the algebra check. Allow up to two minutes. No automatic retry or model switch.'}
            </p>
          )}
          {error && (
            <div className="forge-error" role="alert">
              <div className="forge-error-title">
                <AlertCircle size={18} />
                <h3>
                  {stage === 'format'
                    ? 'The generated format was rejected'
                    : stage === 'verification'
                      ? 'The algebra check did not pass'
                      : quotaLimited
                        ? 'Gemini reported a quota limit'
                        : failure?.status === 429
                          ? 'The API is busy'
                          : 'The request was not completed'}
                </h3>
              </div>
              <p>{error}</p>
              {failure && (
                <>
                  <p className="tiny-text">
                    {stage === 'format' || stage === 'verification'
                      ? 'Gemini answered, but no usable drill passed the checks. Spare quota does not prevent this kind of failure.'
                      : quotaLimited
                        ? 'Gemini returned a quota response for this request. There is no automatic retry.'
                        : failure.status === 429
                          ? 'The API may have reached its worker capacity. This does not establish that Gemini quota was exhausted.'
                          : 'This message does not establish that your quota was exhausted or that your key is invalid.'}
                  </p>
                  <details className="diagnostic-details">
                    <summary>Technical details (no source or key)</summary>
                    <pre>{diagnosticReceipt(failure, usedModel)}</pre>
                    <button
                      className="text-link"
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(
                            diagnosticReceipt(failure, usedModel),
                          );
                          setCopied('Diagnostics copied.');
                        } catch {
                          setCopied('Copy unavailable. Select the technical details above.');
                        }
                      }}
                    >
                      <Copy size={14} />
                      Copy safe diagnostics
                    </button>
                    <span className="tiny-text" role="status">
                      {copied}
                    </span>
                  </details>
                </>
              )}
              <Link className="text-link" href="/simulator?start=reference">
                Continue with a reference drill <ArrowRight size={15} />
              </Link>
            </div>
          )}
        </section>
        <aside className="forge-aside">
          <section className="forge-method" aria-labelledby="method-title">
            <ShieldCheck size={22} />
            <h2 id="method-title">What makes it a drill?</h2>
            <ol>
              <li>
                <strong>Four distinct options</strong>
                <p>
                  One keyed answer and three plausible wrong turns, each with an explicit mistaken
                  step.
                </p>
              </li>
              <li>
                <strong>A checked certificate</strong>
                <p>
                  SymPy checks algebraic consistency, domains, unit vectors and answer distinctness.
                </p>
              </li>
              <li>
                <strong>A way to repair it</strong>
                <p>
                  A guardrail, a counterfactual and a 45-second recovery question for each trap.
                </p>
              </li>
            </ol>
            <p className="tiny-text">
              Symbolic consistency is not proof of source interpretation. Check the extracted
              prompt, units and diagram descriptions before starting.
            </p>
          </section>
          <section className="service-check">
            <h3>Having trouble generating?</h3>
            <p className="tiny-text">
              Check the API without sending a key or contacting Gemini. This does not test model
              access or quota.
            </p>
            <button
              className="text-link"
              disabled={checking}
              onClick={async () => {
                setChecking(true);
                try {
                  const revision = await checkEngine();
                  setEngine(
                    `API available. API revision: ${revision}. Gemini access has not been tested.`,
                  );
                } catch {
                  setEngine(
                    'API did not respond: it may be warming up, unavailable or not configured. Gemini was not contacted.',
                  );
                } finally {
                  setChecking(false);
                }
              }}
            >
              {checking ? 'Checking the API…' : 'Check API connection (no key)'}
            </button>
            <p className="tiny-text" role="status">
              {engine}
            </p>
            <p className="build-revision">
              Interface {process.env.NEXT_PUBLIC_APP_REVISION || 'workspace'}
            </p>
          </section>
          <LocalAssistant />
          <div className="forge-help-links">
            <Link href="/simulator?start=reference" className="text-link">
              Try a free reference drill <ArrowRight size={15} />
            </Link>
            <button className="text-link" onClick={() => setKeyModal(true)}>
              <KeyRound size={15} />
              {hasKey ? 'Manage your browser key' : 'How bring-your-own-key works'}
            </button>
          </div>
        </aside>
      </div>
      {resultMatchesExam && (
        <section className="forge-result" role="status">
          <p className="result-status">
            <Check size={17} />
            Algebraic certificates passed
          </p>
          <h2>
            Review {items.length === 1 ? 'the extracted problem' : `these ${items.length} problems`}
            .
          </h2>
          <p className="muted tiny-text">
            Please verify that these extracted prompts faithfully match your source. Parameters are
            model-proposed, not empirically calibrated.
          </p>
          {items.map((i, n) => (
            <div key={i.id} className="review-question">
              <strong>{n + 1}. </strong>
              <MathText text={i.prompt} />
              {i.diagram_anchors.length > 0 && (
                <div className="note-box">
                  {i.diagram_anchors.map((a) => `${a.label}: ${a.description}`).join('; ')}
                </div>
              )}
            </div>
          ))}
          <button className="button primary" onClick={begin}>
            Looks right. Start this drill <ArrowRight size={16} />
          </button>
        </section>
      )}
    </>
  );
}
