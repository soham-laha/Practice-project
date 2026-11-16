'use client';
import { useEffect, useId, useRef, useState } from 'react';
import { Cpu, Download, Square, Trash2 } from 'lucide-react';
import {
  createLocalWorker,
  localSupport,
  LOCAL_LIMIT,
  type LocalEvent,
} from '@/lib/local-assistant';
import { MathText } from './math';

type Status = 'idle' | 'loading' | 'ready' | 'thinking' | 'removing' | 'error' | 'unsupported';
export function LocalAssistant() {
  const id = useId();
  const [status, setStatus] = useState<Status>('idle');
  const [progress, setProgress] = useState(0);
  const [input, setInput] = useState('');
  const [answer, setAnswer] = useState('');
  const [notice, setNotice] = useState('');
  const worker = useRef<Worker | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const working = status === 'loading' || status === 'thinking' || status === 'removing';

  function dispose() {
    clearTimeout(timer.current);
    if (worker.current) {
      worker.current.onmessage = null;
      worker.current.onerror = null;
      worker.current.terminate();
      worker.current = null;
    }
  }
  useEffect(() => () => dispose(), []);

  function startWorker() {
    dispose();
    const client = createLocalWorker();
    worker.current = client;
    client.onmessage = ({ data }: MessageEvent<LocalEvent>) => {
      if (data.kind === 'progress') {
        setProgress(Math.round(Math.max(0, Math.min(1, data.progress)) * 100));
        return;
      }
      clearTimeout(timer.current);
      if (data.kind === 'ready') {
        setStatus('ready');
        setNotice('Loaded on this device. Nothing has been sent to Gemini.');
      } else if (data.kind === 'answer') {
        setAnswer(data.text);
        setStatus('ready');
        setNotice('Experimental text suggestion. Check it against your source.');
      } else if (data.kind === 'removed') {
        dispose();
        setStatus('idle');
        setAnswer('');
        setInput('');
        setNotice('Downloaded model files removed.');
      } else if (data.kind === 'error') {
        dispose();
        setStatus('error');
        setNotice(data.message);
      }
    };
    client.onerror = (event) => {
      event.preventDefault();
      dispose();
      setStatus('error');
      setNotice(
        'The local worker stopped. Check browser support, memory and storage. No cloud fallback was used.',
      );
    };
    return client;
  }
  function deadline(milliseconds: number) {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      dispose();
      setStatus('error');
      setNotice(
        'The local operation took too long and was stopped. Partial downloads may remain; remove them below. No cloud request was made.',
      );
    }, milliseconds);
  }
  function load() {
    if (!localSupport()) {
      setStatus('unsupported');
      setNotice(
        'This browser does not expose WebGPU. Try an updated, WebGPU-enabled browser on a compatible device, or use the reference drills.',
      );
      return;
    }
    setNotice('Downloading and compiling the model. The first load may take several minutes.');
    setProgress(0);
    setStatus('loading');
    try {
      startWorker().postMessage({ kind: 'load' });
      deadline(10 * 60 * 1000);
    } catch {
      dispose();
      setStatus('error');
      setNotice('The local worker could not start. No model was loaded or cloud request made.');
    }
  }
  function stop() {
    dispose();
    setStatus('idle');
    setNotice(
      'Stopped and unloaded from memory. Partial or cached downloads may remain; remove them below.',
    );
  }
  function remove() {
    setStatus('removing');
    setNotice('Removing this model’s cached files…');
    try {
      startWorker().postMessage({ kind: 'remove' });
      deadline(30000);
    } catch {
      dispose();
      setStatus('error');
      setNotice('Files could not be removed. Clear this site’s browser data to remove them.');
    }
  }
  return (
    <details className="local-assistant" id="local-assistant">
      <summary>
        <Cpu size={18} />
        <span>
          On-device text assistant <small>Optional, experimental</small>
        </span>
      </summary>
      <div className="local-assistant-body">
        <p>
          SmolLM2 360M, 4-bit. Short text hints, not image/PDF reading or verified drill generation.
        </p>
        <p className="tiny-text" id={`${id}-consent`}>
          Loading downloads several hundred MB from Hugging Face and a runtime from GitHub, then
          caches files on this device. The runtime estimates roughly 600 MB GPU memory, plus browser
          overhead; actual needs vary. WebGPU is required. Inference stays here; these hosts see the
          download request, not your prompt. No key, automatic download or paid fallback.
        </p>
        <div className="local-assistant-actions">
          {!['ready', 'thinking', 'loading'].includes(status) && (
            <button
              className="button secondary"
              onClick={load}
              disabled={working || status === 'unsupported'}
              aria-describedby={`${id}-consent`}
            >
              <Download size={16} /> Load local assistant
            </button>
          )}
          {['loading', 'thinking', 'ready'].includes(status) && (
            <button className="button secondary" onClick={stop}>
              <Square size={14} />
              {status === 'ready' ? 'Unload from memory' : 'Stop local assistant'}
            </button>
          )}
          <button className="text-link" onClick={remove} disabled={working}>
            <Trash2 size={14} />
            Remove downloaded model
          </button>
        </div>
        {status === 'loading' && (
          <progress aria-label="Local model loading progress" value={progress} max={100} />
        )}
        <p
          className={status === 'error' ? 'error-text' : 'tiny-text'}
          role={status === 'error' ? 'alert' : 'status'}
        >
          {notice}
        </p>
        {(status === 'ready' || status === 'thinking') && (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              if (!input.trim() || !worker.current || working) return;
              setAnswer('');
              setStatus('thinking');
              setNotice('Generating a short text suggestion on this device…');
              worker.current.postMessage({ kind: 'ask', text: input.trim() });
              deadline(60000);
            }}
          >
            <label className="field-label" htmlFor={`${id}-prompt`}>
              Ask the local text assistant
            </label>
            <textarea
              id={`${id}-prompt`}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              maxLength={LOCAL_LIMIT}
              disabled={working}
              placeholder="Help me turn ‘check signs before squaring’ into a short study reminder."
            />
            <button className="button secondary" disabled={working || !input.trim()}>
              {status === 'thinking' ? 'Thinking on this device…' : 'Ask on this device'}
            </button>
          </form>
        )}
        {answer && (
          <div className="local-answer">
            <strong>Unverified local suggestion</strong>
            <MathText text={answer} />
          </div>
        )}
        <a
          className="text-link"
          href="https://huggingface.co/HuggingFaceTB/SmolLM2-360M-Instruct"
          target="_blank"
          rel="noreferrer"
        >
          Upstream model information and license
        </a>
      </div>
    </details>
  );
}
