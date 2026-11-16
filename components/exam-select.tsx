'use client';
import { useApp } from './providers';
export function ExamSelect({ disabled = false }: { disabled?: boolean }) {
  const { exam, setExam } = useApp();
  return (
    <div className="exam-select" role="group" aria-label="Exam mode">
      <button
        disabled={disabled}
        type="button"
        aria-pressed={exam === 'main'}
        onClick={() => setExam('main')}
      >
        JEE Main
      </button>
      <button
        disabled={disabled}
        type="button"
        aria-pressed={exam === 'advanced'}
        onClick={() => setExam('advanced')}
      >
        JEE Advanced
      </button>
    </div>
  );
}
