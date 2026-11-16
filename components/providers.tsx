'use client';
import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import { KEYS, loadLearner, persistLearner, withSession } from '@/lib/storage';
import {
  EMPTY_LEARNER,
  type Learner,
  type Session,
  type Exam,
  type Theme,
  type GeminiModel,
} from '@/lib/types';

type AppState = {
  learner: Learner;
  ready: boolean;
  exam: Exam;
  setExam: (x: Exam) => void;
  theme: Theme;
  setTheme: (x: Theme) => void;
  model: GeminiModel;
  setModel: (x: GeminiModel) => void;
  hasKey: boolean;
  saveKey: (key: string) => void;
  removeKey: () => void;
  keyModal: boolean;
  setKeyModal: (x: boolean) => void;
  addSession: (s: Session) => Promise<void>;
  updateLearner: (l: Learner) => Promise<void>;
  notice: string;
  notify: (s: string) => void;
};
const Context = createContext<AppState | null>(null);
export function Providers({ children }: { children: ReactNode }) {
  const [learner, setLearner] = useState<Learner>(EMPTY_LEARNER),
    [ready, setReady] = useState(false);
  const [exam, examState] = useState<Exam>('main'),
    [theme, themeState] = useState<Theme>('light'),
    [model, modelState] = useState<GeminiModel>('gemini-flash-latest');
  const [hasKey, setHasKey] = useState(false),
    [keyModal, setKeyModal] = useState(false),
    [notice, notify] = useState('');
  useEffect(() => {
    let alive = true;
    async function init() {
      try {
        const data = await loadLearner();
        if (!alive) return;
        setLearner(data);
        const ex = localStorage.getItem(KEYS.exam);
        if (ex === 'main' || ex === 'advanced') examState(ex);
        const th = localStorage.getItem(KEYS.theme);
        if (th === 'light' || th === 'dark' || th === 'contrast') themeState(th);
        const m = localStorage.getItem(KEYS.model);
        if (m === 'gemini-flash-lite-latest') modelState(m);
        setHasKey(Boolean(localStorage.getItem(KEYS.key)));
      } catch {
        if (alive)
          notify(
            'Local data could not be read. Export any existing backup before resetting; this session is temporary.',
          );
      } finally {
        if (alive) setReady(true);
      }
    }
    void init();
    return () => {
      alive = false;
    };
  }, []);
  useEffect(() => {
    if (!notice) return;
    const id = setTimeout(() => notify(''), 6500);
    return () => clearTimeout(id);
  }, [notice]);
  const setExam = (x: Exam) => {
    try {
      localStorage.setItem(KEYS.exam, x);
      examState(x);
    } catch {
      notify('Browser storage is unavailable.');
    }
  };
  const setTheme = (x: Theme) => {
    document.documentElement.dataset.theme = x;
    themeState(x);
    try {
      localStorage.setItem(KEYS.theme, x);
    } catch {
      notify('Theme changed for this visit; browser storage is unavailable.');
    }
  };
  const setModel = (x: GeminiModel) => {
    try {
      localStorage.setItem(KEYS.model, x);
      modelState(x);
    } catch {
      notify('Browser storage is unavailable.');
    }
  };
  const saveKey = (key: string) => {
    localStorage.setItem(KEYS.key, key.trim());
    setHasKey(true);
    notify('Key saved on this device. Gemini access is checked when you use it.');
  };
  const removeKey = () => {
    localStorage.removeItem(KEYS.key);
    setHasKey(false);
    notify('Gemini key removed from this browser.');
  };
  const updateLearner = useCallback(async (l: Learner) => {
    await persistLearner(l);
    setLearner(l);
  }, []);
  const addSession = async (s: Session) => {
    const next = withSession(learner, s);
    await updateLearner(next);
  };
  return (
    <Context.Provider
      value={{
        learner,
        ready,
        exam,
        setExam,
        theme,
        setTheme,
        model,
        setModel,
        hasKey,
        saveKey,
        removeKey,
        keyModal,
        setKeyModal,
        addSession,
        updateLearner,
        notice,
        notify,
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function useApp() {
  const value = useContext(Context);
  if (!value) throw new Error('Missing app provider');
  return value;
}
