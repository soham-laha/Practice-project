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
  Sparkles,
  KeyRound,
  ScanLine,
  LoaderCircle,
  Target,
  Lightbulb,
  Braces,
  FlaskConical,
} from 'lucide-react';
import { useApp } from './providers';
import { ExamSelect } from './exam-select';
import { MathText } from './math';
import { apiRequest } from '@/lib/api';
import { itemSchema, type Item } from '@/lib/types';
import { KEYS } from '@/lib/storage';
export function Forge() {
  const { exam, model, setModel, hasKey, setKeyModal } = useApp(),
    router = useRouter();
  const [tab, setTab] = useState<'text' | 'image' | 'pdf'>('text'),
    [text, setText] = useState(''),
    [file, setFile] = useState<File | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [items, setItems] = useState<Item[]>([]);
  function chooseFile(f: File | undefined) {
    setError('');
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
    if (!hasKey) {
      setKeyModal(true);
      return;
    }
    setError('');
    setItems([]);
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
      if (!Array.isArray(result.items) || !result.items.length || result.items.length > 5)
        throw new Error('The forge returned an invalid item set. No drill was created.');
      const parsed: Item[] = result.items.map((i: unknown) => itemSchema.parse(i));
      if (
        parsed.some((i) => i.exam !== exam) ||
        new Set(parsed.map((i) => i.id)).size !== parsed.length
      )
        throw new Error(
          'Generated items do not match the requested exam or have duplicate IDs. Please try again.',
        );
      setItems(parsed);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : 'The forge could not complete this problem. Try again.',
      );
    } finally {
      setBusy(false);
    }
  }
  function begin() {
    try {
      sessionStorage.setItem(KEYS.forged, JSON.stringify(items));
      router.push('/simulator?start=forged');
    } catch {
      setError(
        'Browser session storage is unavailable. Allow it to carry your drill into the simulator.',
      );
    }
  }
  return (
    <>
      <div className="page-title split-heading">
        <div>
          <span className="eyebrow">YOUR TEXTBOOK. A NEW KIND OF PRACTICE.</span>
          <h1>
            Give a good problem <em>a sharper edge.</em>
          </h1>
          <p>
            Bring something you’re studying. The forge turns it into a four-option drill with three
            meaningful wrong turns, then checks the algebra.
          </p>
        </div>
        <ExamSelect />
      </div>
      <div className="forge-grid">
        <section className="forge-form card">
          <div className="panel-heading">
            <h2>Your problem goes here.</h2>
            <span className="pill accent">
              <ScanLine size={12} />
              Item forge
            </span>
          </div>
          <div className="input-tabs" role="tablist" aria-label="Problem source">
            {[
              { id: 'text', label: 'Paste text', Icon: FileText },
              { id: 'image', label: 'Upload image', Icon: ImageIcon },
              { id: 'pdf', label: 'Upload PDF', Icon: Upload },
            ].map((v) => (
              <button
                key={v.id}
                role="tab"
                aria-selected={tab === v.id}
                aria-controls="source-panel"
                id={`tab-${v.id}`}
                disabled={busy}
                onClick={() => {
                  setTab(v.id as typeof tab);
                  setFile(null);
                  setError('');
                }}
              >
                <v.Icon size={16} />
                {v.label}
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
                  onChange={(e) => setText(e.target.value)}
                  placeholder="A block of mass 2 kg rests in a lift accelerating upward at 3 m/s². Take g = 10 m/s². Find the normal force…"
                  maxLength={30000}
                  disabled={busy}
                />
                <p className="tiny-text">
                  Include all values, units and any necessary diagram descriptions.{' '}
                  {text.length.toLocaleString()} / 30,000
                </p>
              </>
            ) : (
              <label className="upload-zone">
                <Upload size={30} />
                <strong>
                  {file ? file.name : `Choose a ${tab === 'pdf' ? 'PDF' : 'problem photo'}`}
                </strong>
                <small>
                  {file
                    ? `${(file.size / 1024 / 1024).toFixed(2)} MB · ready to forge`
                    : tab === 'pdf'
                      ? 'Unencrypted PDF · up to 30 pages · max 20 MB'
                      : 'PNG or JPEG · up to 25 megapixels · max 20 MB'}
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
          <label className="field-label" htmlFor="forge-model">
            Your Gemini model
          </label>
          <select
            id="forge-model"
            value={model}
            onChange={(e) => setModel(e.target.value as typeof model)}
            disabled={busy}
          >
            <option value="gemini-flash-latest">Gemini Flash · balanced</option>
            <option value="gemini-flash-lite-latest">Gemini Flash Lite · lightweight</option>
          </select>
          <div className="mode-detail">
            <span className="pill">JEE {exam === 'main' ? 'Main' : 'Advanced'}</span>
            <span className="pill">+4 / −{exam === 'main' ? '1' : '1 or 2'}</span>
            <span className="pill">{exam === 'main' ? '90–180' : '180–300'}s benchmark</span>
          </div>
          <div className="form-bottom">
            <p className="tiny-text">
              Only upload material you’re allowed to share with your AI provider. Nothing is stored
              on our server.
            </p>
            <button className="button primary" disabled={busy} onClick={() => void generate()}>
              {busy ? (
                <LoaderCircle size={15} className="spinner" />
              ) : hasKey ? (
                <Sparkles size={15} />
              ) : (
                <KeyRound size={15} />
              )}{' '}
              {busy ? 'Forging & checking…' : hasKey ? 'Forge my drill' : 'Add key to forge'}
              <ArrowRight size={15} />
            </button>
          </div>
          <p className="error-text" role="alert">
            {error}
          </p>
          {busy && (
            <div className="note-box">
              <FlaskConical size={16} />
              <span>
                Extraction → misconception paths → bounded symbolic checks. This can take up to two
                minutes. Unverified items are never released.
              </span>
            </div>
          )}
        </section>
        <aside className="forge-aside card">
          <span className="card-kicker">
            <ShieldCheck size={16} />
            NOT JUST RANDOM WRONG ANSWERS
          </span>
          <h2>
            Every wrong turn
            <br />
            has a reason.
          </h2>
          <ul className="forge-checks">
            <li>
              <Target size={18} />
              <div>
                <strong>Three real misconception paths</strong>
                <p>Options are derived from plausible invalid steps—not made-up numbers.</p>
              </div>
            </li>
            <li>
              <Braces size={18} />
              <div>
                <strong>Algebra before delivery</strong>
                <p>
                  SymPy checks key and trap certificates, dimensional vectors, domains and
                  distinctness.
                </p>
              </div>
            </li>
            <li>
              <Lightbulb size={18} />
              <div>
                <strong>A way back, built in</strong>
                <p>Each trap includes a guardrail and a 45-second recovery check.</p>
              </div>
            </li>
          </ul>
          <div className="note-box">
            <ShieldCheck size={16} />
            <span>
              Symbolic consistency is not proof of source interpretation. Check the extracted
              prompt, units and diagram descriptions before starting.
            </span>
          </div>
          <Link href="/simulator?start=reference" className="text-link" style={{ marginTop: 20 }}>
            Just exploring? Try a reference drill <ArrowRight size={14} />
          </Link>
          <button
            className="text-link"
            style={{ marginTop: 15, display: 'flex' }}
            onClick={() => setKeyModal(true)}
          >
            <KeyRound size={14} />
            {hasKey ? 'Manage your browser key' : 'How bring-your-own-key works'}
          </button>
        </aside>
      </div>
      {items.length > 0 && (
        <section className="forge-result card" role="status">
          <span className="card-kicker">
            <Check size={16} />
            ALGEBRAIC CERTIFICATES PASSED
          </span>
          <h2>
            {items.length} question{items.length > 1 ? 's' : ''}, ready for a fresh perspective.
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
                  {i.diagram_anchors.map((a) => `${a.label}: ${a.description}`).join(' · ')}
                </div>
              )}
            </div>
          ))}
          <button className="button primary" onClick={begin}>
            Looks right. Start this drill <ArrowRight size={15} />
          </button>
        </section>
      )}
    </>
  );
}
