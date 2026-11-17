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

async function splitPdfToImages(pdfFile: File): Promise<Blob[]> {
  const pdfjs = await import('pdfjs-dist');
  if (typeof window !== 'undefined') {
    pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
  }
  const arrayBuffer = await pdfFile.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
  const numPages = pdf.numPages;
  const images: Blob[] = [];

  for (let pageNum = 1; pageNum <= numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const viewport = page.getViewport({ scale: 1.5 });
    const canvas = document.createElement('canvas');
    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);
    const ctx = canvas.getContext('2d');
    if (!ctx) continue;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (page.render as any)({ canvasContext: ctx, viewport }).promise;
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', 0.85),
    );
    if (blob) {
      images.push(blob);
    }
  }
  return images;
}

async function apiRequestWithBackoff(
  path: string,
  body: object | FormData,
  maxRetries = 2,
): Promise<Record<string, unknown>> {
  let attempt = 0;
  while (true) {
    try {
      return (await apiRequest(path, body)) as Record<string, unknown>;
    } catch (err) {
      if (err instanceof ApiError && err.status === 429 && attempt < maxRetries) {
        attempt++;
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }
      throw err;
    }
  }
}

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
    [items, setItems] = useState<Item[]>([]),
    [pdfProgress, setPdfProgress] = useState<{ current: number; total: number } | null>(null),
    [needsOcrReview, setNeedsOcrReview] = useState<
      Array<{ item: Item; reason: string; error?: string }>
    >([]),
    [reverifyingId, setReverifyingId] = useState<string | null>(null),
    [reverifyError, setReverifyError] = useState<Record<string, string>>({});

  const generatorMode = userEngineMode ?? (hasKey ? 'cloud' : 'local');
  function chooseFile(f: File | undefined) {
    setError('');
    setFailure(null);
    setItems([]);
    setNeedsOcrReview([]);
    setPdfProgress(null);
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
      if (tab !== 'text') {
        setError(
          'The in-browser engine generates drills from text problems offline. For image photos or PDFs, switch Generation engine to "Gemini Cloud Model" or paste the question into the "Paste text" tab.',
        );
        return;
      }
      if (text.trim().length > 0 && text.trim().length < 10) {
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
      if (tab === 'pdf' && file && generatorMode === 'cloud') {
        try {
          const pageBlobs = await splitPdfToImages(file);
          if (pageBlobs.length > 1) {
            setPdfProgress({ current: 0, total: pageBlobs.length });
            const collectedItems: Item[] = [];
            const collectedOcr: Array<{ item: Item; reason: string; error?: string }> = [];

            for (let i = 0; i < pageBlobs.length; i++) {
              setPdfProgress({ current: i + 1, total: pageBlobs.length });
              const pageFile = new File([pageBlobs[i]], `page-${i + 1}.jpg`, {
                type: 'image/jpeg',
              });
              const form = new FormData();
              form.set('file', pageFile);
              form.set('exam', exam);
              form.set('model', model);

              try {
                const result = await apiRequestWithBackoff('v1/extractions/upload', form);
                const rawItems = Array.isArray(result.verified_items)
                  ? result.verified_items
                  : Array.isArray(result.items)
                    ? result.items
                    : [];
                for (const raw of rawItems) {
                  try {
                    const parsed = itemSchema.parse(raw);
                    if (parsed.exam === exam && !collectedItems.some((it) => it.id === parsed.id)) {
                      collectedItems.push(parsed);
                    }
                  } catch {
                    // ignore invalid
                  }
                }
                if (Array.isArray(result.needs_ocr_review)) {
                  for (const ocr of result.needs_ocr_review as Array<{
                    item: unknown;
                    reason: string;
                    error?: string;
                  }>) {
                    try {
                      const parsed = itemSchema.parse(ocr.item);
                      if (!collectedOcr.some((it) => it.item.id === parsed.id)) {
                        collectedOcr.push({ item: parsed, reason: ocr.reason, error: ocr.error });
                      }
                    } catch {
                      // ignore
                    }
                  }
                }
                setItems([...collectedItems]);
                setNeedsOcrReview([...collectedOcr]);
              } catch (pageErr) {
                console.warn(`Page ${i + 1} extraction failed:`, pageErr);
              }
            }

            if (!collectedItems.length && !collectedOcr.length) {
              throw new Error('No verified problems could be extracted from this PDF.');
            }
            return;
          }
        } catch (pdfErr) {
          console.warn('PDF splitting fallback to direct upload:', pdfErr);
        }
      }

      let body: object | FormData;
      if (tab === 'text') body = { text, exam, model };
      else {
        const form = new FormData();
        form.set('file', file!);
        form.set('exam', exam);
        form.set('model', model);
        body = form;
      }
      const result = await apiRequestWithBackoff(
        tab === 'text' ? 'v1/extractions' : 'v1/extractions/upload',
        body,
      );
      const rawItems = Array.isArray(result.verified_items)
        ? result.verified_items
        : Array.isArray(result.items)
          ? result.items
          : [];
      const ocrRaw = Array.isArray(result.needs_ocr_review)
        ? (result.needs_ocr_review as Array<{ item: unknown; reason: string; error?: string }>)
        : [];

      if (!rawItems.length && !ocrRaw.length) {
        throw new Error('No verified problems could be extracted. Please check your source.');
      }

      const parsed: Item[] = [];
      for (const raw of rawItems) {
        try {
          const item = itemSchema.parse(raw);
          if (item.exam === exam) {
            parsed.push(item);
          }
        } catch {
          // ignore
        }
      }
      setItems(parsed);

      const ocrItems: Array<{ item: Item; reason: string; error?: string }> = [];
      for (const ocr of ocrRaw) {
        try {
          const item = itemSchema.parse(ocr.item);
          ocrItems.push({ item, reason: ocr.reason, error: ocr.error });
        } catch {
          // ignore
        }
      }
      setNeedsOcrReview(ocrItems);
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
      setPdfProgress(null);
    }
  }

  async function reverifyItem(index: number) {
    const target = needsOcrReview[index];
    if (!target) return;
    setReverifyingId(target.item.id);
    setReverifyError((prev) => ({ ...prev, [target.item.id]: '' }));

    try {
      const res = (await apiRequest('v1/items/validate', { items: [target.item] })) as {
        results?: Array<{ valid: boolean; canonical_options?: Record<string, string> }>;
      };
      if (res.results && res.results[0]?.valid) {
        const validatedItem = { ...target.item };
        if (res.results[0].canonical_options) {
          validatedItem.options = validatedItem.options.map((opt) => ({
            ...opt,
            latex: res.results![0].canonical_options![opt.id] || opt.latex,
          }));
        }
        setItems((prev) => [...prev, validatedItem]);
        setNeedsOcrReview((prev) => prev.filter((_, i) => i !== index));
      } else {
        setReverifyError((prev) => ({
          ...prev,
          [target.item.id]: 'Validation failed. Check your KaTeX formula or option values.',
        }));
      }
    } catch (err) {
      setReverifyError((prev) => ({
        ...prev,
        [target.item.id]:
          err instanceof Error ? err.message : 'Validation failed. Check your KaTeX formula.',
      }));
    } finally {
      setReverifyingId(null);
    }
  }

  function updateOcrItemField(index: number, updater: (item: Item) => Item) {
    setNeedsOcrReview((prev) => {
      const copy = [...prev];
      if (copy[index]) {
        copy[index] = { ...copy[index], item: updater(copy[index].item) };
      }
      return copy;
    });
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
            {tab !== 'text' && generatorMode === 'local' && (
              <p className="tiny-text" style={{ marginTop: '0.5rem', color: '#f59e0b' }}>
                <strong>Note:</strong> The In-Browser Engine creates drills from text problems
                offline. To extract questions directly from image photos or PDFs, switch{' '}
                <em>Generation engine</em> below to <strong>Gemini Cloud Model</strong> (or paste
                problem text into the <em>Paste text</em> tab).
              </p>
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
                  <option value="gemini-flash-latest">
                    Gemini Flash (fast vision & balanced, recommended)
                  </option>
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
            <div className="forge-working" role="status">
              {pdfProgress ? (
                <>
                  <p>
                    Extracting page {pdfProgress.current} of {pdfProgress.total} (
                    {Math.round((pdfProgress.current / pdfProgress.total) * 100)}%)...
                  </p>
                  <progress
                    value={pdfProgress.current}
                    max={pdfProgress.total}
                    style={{ width: '100%', height: '8px', marginTop: '6px' }}
                  />
                </>
              ) : generatorMode === 'local' ? (
                <p>Generating verified options and distractors directly in your browser…</p>
              ) : (
                <p>
                  Waiting for Gemini and the algebra check. Allow up to two minutes. No automatic
                  retry or model switch.
                </p>
              )}
            </div>
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
              {usedModel === 'gemini-flash-lite-latest' &&
                (error.includes('time limit') || failure?.status === 504) && (
                  <div style={{ marginTop: '0.75rem', marginBottom: '0.75rem' }}>
                    <button
                      type="button"
                      className="button secondary small-button"
                      onClick={() => {
                        setModel('gemini-flash-latest');
                        setError('');
                        setFailure(null);
                      }}
                    >
                      Switch to Gemini Flash (balanced) & retry
                    </button>
                  </div>
                )}
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
      {needsOcrReview.length > 0 && (
        <section className="forge-result" role="region" aria-label="OCR Review">
          <p className="result-status">
            <AlertCircle size={17} />
            OCR formula review required ({needsOcrReview.length})
          </p>
          <h2>Review and repair extracted formulas</h2>
          <p className="muted tiny-text">
            These questions were extracted with a potential OCR formula or sign mismatch. Edit the
            options or key below and click &quot;Re-verify&quot; to include them in your drill.
          </p>
          {needsOcrReview.map((ocr, idx) => (
            <div key={ocr.item.id} className="review-question">
              <strong>Question {items.length + idx + 1}: </strong>
              <MathText text={ocr.item.prompt} />
              <p className="tiny-text" style={{ marginTop: '4px' }}>
                {ocr.reason}
              </p>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: '8px',
                  marginTop: '8px',
                }}
              >
                {ocr.item.options.map((opt, optIdx) => (
                  <div key={opt.id}>
                    <label className="field-label" htmlFor={`ocr-${ocr.item.id}-${opt.id}`}>
                      Option {opt.id} {opt.id === ocr.item.correct_id ? '(Key)' : ''}
                    </label>
                    <input
                      id={`ocr-${ocr.item.id}-${opt.id}`}
                      type="text"
                      value={opt.latex}
                      onChange={(e) => {
                        const val = e.target.value;
                        updateOcrItemField(idx, (prev) => {
                          const opts = [...prev.options];
                          opts[optIdx] = {
                            ...opts[optIdx],
                            latex: val,
                            expression: val,
                            derived_expression: val,
                          };
                          return { ...prev, options: opts };
                        });
                      }}
                    />
                  </div>
                ))}
              </div>
              <div
                style={{
                  marginTop: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  flexWrap: 'wrap',
                }}
              >
                <div>
                  <label className="field-label" htmlFor={`ocr-key-${ocr.item.id}`}>
                    Answer key
                  </label>
                  <select
                    id={`ocr-key-${ocr.item.id}`}
                    value={ocr.item.correct_id}
                    onChange={(e) => {
                      const newKey = e.target.value as 'A' | 'B' | 'C' | 'D';
                      updateOcrItemField(idx, (prev) => {
                        const opts = prev.options.map((opt) => ({
                          ...opt,
                          trap:
                            opt.id === newKey
                              ? null
                              : opt.trap || {
                                  label: 'Distractor trap',
                                  why_plausible: 'Common alternative calculation',
                                  first_wrong_pivot: 'Sign or index inversion',
                                  counterfactual_valid_when: 'Under inverted assumptions',
                                  avoidance_rule: 'Check derivation steps',
                                  recovery_check: {
                                    question: 'Check the formula step',
                                    answer: '1',
                                    expression: '1',
                                    target_expression: '1',
                                    explanation: 'Re-evaluate with checked signs',
                                  },
                                },
                        }));
                        return {
                          ...prev,
                          correct_id: newKey,
                          answer_expression:
                            opts.find((o) => o.id === newKey)?.expression || prev.answer_expression,
                          options: opts,
                        };
                      });
                    }}
                  >
                    <option value="A">Option A</option>
                    <option value="B">Option B</option>
                    <option value="C">Option C</option>
                    <option value="D">Option D</option>
                  </select>
                </div>
                <button
                  type="button"
                  className="button secondary small-button"
                  disabled={reverifyingId === ocr.item.id}
                  onClick={() => void reverifyItem(idx)}
                >
                  {reverifyingId === ocr.item.id ? (
                    <LoaderCircle size={14} className="spinner" />
                  ) : (
                    <Check size={14} />
                  )}
                  Re-verify question
                </button>
              </div>
              {reverifyError[ocr.item.id] && (
                <p className="tiny-text" style={{ marginTop: '6px' }} role="alert">
                  {reverifyError[ocr.item.id]}
                </p>
              )}
            </div>
          ))}
        </section>
      )}
    </>
  );
}
