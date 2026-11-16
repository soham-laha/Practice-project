import { describe, expect, it } from 'vitest';
import {
  parseLinearSystem,
  solveLinearSystem,
  generateCoordinateOptions,
  generateScalarOptions,
  regenerateRuntimeDistractors,
  generateLocalDrill,
  createLineIntersectionItem,
} from '@/lib/local-generator';
import { itemSchema } from '@/lib/types';

describe('Local In-Browser Drill & Option Generator', () => {
  it('parses linear system from problem text (e.g. 2x - 3y = 1 and 5y - x = 3)', () => {
    const text =
      'Find the coordinates of the point of intersection of the straight lines 2x - 3y = 1 and 5y - x = 3.';
    const sys = parseLinearSystem(text);
    expect(sys).not.toBeNull();
    expect(sys!.a1).toBe(2);
    expect(sys!.b1).toBe(-3);
    expect(sys!.c1).toBe(1);

    const sol = solveLinearSystem(sys!);
    expect(sol).toEqual({ x: 2, y: 1 });
  });

  it('generates 4 valid coordinate options where all are coordinate pairs', () => {
    const options = generateCoordinateOptions(2, 1, 'A');
    expect(options).toHaveLength(4);

    // Option A is correct
    expect(options[0].id).toBe('A');
    expect(options[0].latex).toBe('(2, 1)');
    expect(options[0].trap).toBeNull();

    // All options must be formatted as coordinate pairs (x, y)
    for (const opt of options) {
      expect(opt.latex).toMatch(/^\([+-]?\d+.*,\s*[+-]?\d+.*\)$/);
      expect(opt.expression).toMatch(/^\([+-]?\d+.*,\s*[+-]?\d+.*\)$/);
    }

    // Distractors must have full trap schemas
    for (let i = 1; i < 4; i++) {
      expect(options[i].trap).not.toBeNull();
      expect(options[i].trap!.label).toBeTruthy();
      expect(options[i].trap!.avoidance_rule).toBeTruthy();
    }

    // All 4 options must be distinct
    const latexSet = new Set(options.map((o) => o.latex));
    expect(latexSet.size).toBe(4);
  });

  it('creates a fully validated JEE Item for coordinate intersection', () => {
    const item = createLineIntersectionItem(
      { a1: 2, b1: -3, c1: 1, a2: -1, b2: 5, c2: 3 },
      { x: 2, y: 1 },
      'main',
      1,
    );
    expect(() => itemSchema.parse(item)).not.toThrow();
    expect(item.correct_id).toBe('A');
    expect(item.options.find((o) => o.id === 'A')?.latex).toBe('(2, 1)');
    expect(item.options.filter((o) => o.trap === null)).toHaveLength(1);
    expect(item.options.filter((o) => o.trap !== null)).toHaveLength(3);
  });

  it('generates 4 distinct scalar options with plausible distractors', () => {
    const options = generateScalarOptions(10, 'm/s^2', [0, 1, -2], 'B');
    expect(options).toHaveLength(4);
    expect(options[1].id).toBe('B');
    expect(options[1].trap).toBeNull();
    expect(options[1].latex).toBe('10\\text{ m/s^2}');

    const distinct = new Set(options.map((o) => o.latex));
    expect(distinct.size).toBe(4);
  });

  it('regenerates options at runtime while preserving the correct answer', () => {
    const original = createLineIntersectionItem(
      { a1: 2, b1: -3, c1: 1, a2: -1, b2: 5, c2: 3 },
      { x: 2, y: 1 },
      'main',
      1,
    );
    const regenerated = regenerateRuntimeDistractors(original);
    expect(regenerated.correct_id).toBe(original.correct_id);
    const correctOpt = regenerated.options.find((o) => o.id === regenerated.correct_id);
    expect(correctOpt?.latex).toBe('(2, 1)');
    expect(regenerated.options).toHaveLength(4);
    expect(() => itemSchema.parse(regenerated)).not.toThrow();
  });

  it('generates a multi-item drill completely in-browser without API key', () => {
    const drill = generateLocalDrill({ exam: 'main', requestedCount: 4 });
    expect(drill).toHaveLength(4);
    for (const item of drill) {
      expect(() => itemSchema.parse(item)).not.toThrow();
      expect(item.options).toHaveLength(4);
      expect(item.options.filter((o) => o.trap === null)).toHaveLength(1);
    }
  });

  it('extracts from multi-question text locally', () => {
    const multiText = `
      1. Find the coordinates of the point of intersection of the straight lines 2x - 3y = 1 and 5y - x = 3.
      2. Find the point of intersection of straight lines 3x + 4y = 11 and 2x - y = 0.
    `;
    const drill = generateLocalDrill({ text: multiText, exam: 'main' });
    expect(drill.length).toBeGreaterThanOrEqual(1);
    expect(drill[0].answer_expression).toBe('(2, 1)');
  });
});
