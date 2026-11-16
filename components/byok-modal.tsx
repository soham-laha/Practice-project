'use client';
import { useEffect, useRef, useState } from 'react';
import {
  KeyRound,
  X,
  ShieldCheck,
  ArrowUpRight,
  Eye,
  EyeOff,
  Trash2,
  Check,
  LockKeyhole,
} from 'lucide-react';
import { useApp } from './providers';
export function ByokModal() {
  const { keyModal, setKeyModal, hasKey, saveKey, removeKey, model, setModel } = useApp();
  const dialog = useRef<HTMLDialogElement>(null),
    [value, setValue] = useState(''),
    [visible, setVisible] = useState(false),
    [error, setError] = useState('');
  useEffect(() => {
    if (keyModal) dialog.current?.showModal();
    else dialog.current?.close();
  }, [keyModal]);
  return (
    <dialog
      className="modal"
      ref={dialog}
      onClose={() => {
        setKeyModal(false);
        setValue('');
        setVisible(false);
        setError('');
      }}
      aria-labelledby="byok-title"
      onClick={(e) => {
        if (e.target === dialog.current) {
          const r = dialog.current.getBoundingClientRect();
          if (
            e.clientX < r.left ||
            e.clientX > r.right ||
            e.clientY < r.top ||
            e.clientY > r.bottom
          )
            setKeyModal(false);
        }
      }}
    >
      <button
        className="icon-button modal-close"
        aria-label="Close API key settings"
        onClick={() => setKeyModal(false)}
      >
        <X size={20} />
      </button>
      <div className="modal-symbol">
        <KeyRound size={26} />
      </div>
      <span className="eyebrow">YOUR KEY. YOUR CONTROL.</span>
      <h2 id="byok-title">
        A little intelligence.
        <br />
        <em>Entirely on your terms.</em>
      </h2>
      <p className="muted">
        Save a Gemini key for the problem forge and your AI coach. Saving checks the format only;
        Google checks access and quota when you make a request. Reference drills need no key.
      </p>
      <a
        className="text-link"
        href="https://aistudio.google.com/apikey"
        target="_blank"
        rel="noreferrer"
      >
        Get a key in Google AI Studio <ArrowUpRight size={15} />
      </a>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setError('');
          if (!/^[A-Za-z0-9_-]{20,256}$/.test(value.trim())) {
            setError(
              'Use a valid Gemini API key (20–256 letters, numbers, underscores or hyphens).',
            );
            return;
          }
          try {
            saveKey(value);
            setValue('');
            setKeyModal(false);
          } catch {
            setError('Browser storage is blocked. Allow local storage to save your key.');
          }
        }}
      >
        <label className="field-label" htmlFor="gemini-key">
          Gemini API key{' '}
          {hasKey && (
            <span className="inline-status">
              <Check size={13} /> Key saved
            </span>
          )}
        </label>
        <div className="password-field">
          <input
            autoComplete="off"
            spellCheck={false}
            id="gemini-key"
            type={visible ? 'text' : 'password'}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={hasKey ? 'Enter a replacement key' : 'Paste your key here'}
            aria-describedby="key-privacy key-error"
          />
          <button
            type="button"
            aria-label={visible ? 'Hide key' : 'Show key'}
            className="icon-button"
            onClick={() => setVisible(!visible)}
          >
            {visible ? <EyeOff size={17} /> : <Eye size={17} />}
          </button>
        </div>
        <label className="field-label" htmlFor="modal-model">
          Model
        </label>
        <select
          id="modal-model"
          value={model}
          onChange={(e) => setModel(e.target.value as typeof model)}
        >
          <option value="gemini-flash-latest">Gemini Flash · balanced</option>
          <option value="gemini-flash-lite-latest">Gemini Flash Lite · lightweight</option>
        </select>
        <div className="privacy-note" id="key-privacy">
          <ShieldCheck size={19} />
          <span>
            Saved only in this browser. Sent over HTTPS for requests you initiate. Never included in
            backups. Anyone with access to this browser can use it; provider quotas and terms apply.
          </span>
        </div>
        <p role="alert" className="error-text" id="key-error">
          {error}
        </p>
        <button className="button primary full" type="submit">
          <LockKeyhole size={16} />
          {hasKey ? 'Replace key securely' : 'Save key on this device'}
        </button>
      </form>
      {hasKey && (
        <button
          className="button danger full remove-key"
          onClick={() => {
            try {
              removeKey();
              setValue('');
              setVisible(false);
              setError('');
            } catch {
              setError(
                'Browser storage is blocked. Clear this site’s storage to remove the saved key.',
              );
            }
          }}
        >
          <Trash2 size={16} />
          Remove / Clear Key
        </button>
      )}
    </dialog>
  );
}
