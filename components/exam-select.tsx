'use client';
import { useApp } from './providers';
export function ExamSelect() {
  const { exam, setExam } = useApp();
  return (
    <div className="exam-select" role="group" aria-label="Exam mode">
      <button type="button" aria-pressed={exam === 'main'} onClick={() => setExam('main')}>
        JEE Main
      </button>
      <button type="button" aria-pressed={exam === 'advanced'} onClick={() => setExam('advanced')}>
        JEE Advanced <span className="mini-spark">✧</span>
      </button>
    </div>
  );
}
