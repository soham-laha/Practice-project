import raw from '@/data/seed-items.json';
import { itemSchema, type Exam, type Item } from './types';
export const SEED_ITEMS: Item[] = raw.map((i) => itemSchema.parse(i));
export function referenceItems(exam: Exam): Item[] {
  return SEED_ITEMS.filter((i) => i.exam === exam).map((i) => ({ ...i, options: [...i.options] }));
}
/** Fisher–Yates once at session creation; locked and persisted thereafter. */
export function lockOptionOrder(items: Item[]): Item[] {
  return items.map((item) => {
    const options = [...item.options];
    for (let i = options.length - 1; i > 0; i--) {
      // Rejection sampling avoids modulo bias for completeness.
      const range = i + 1,
        limit = Math.floor(4294967296 / range) * range;
      let v: number;
      do {
        v = crypto.getRandomValues(new Uint32Array(1))[0];
      } while (v >= limit);
      const j = v % range;
      [options[i], options[j]] = [options[j], options[i]];
    }
    return { ...item, options };
  });
}
