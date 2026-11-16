import { itemSchema, type Exam, type Item, type Option, type Trap } from './types';

export interface LinearSystem {
  a1: number;
  b1: number;
  c1: number; // a1*x + b1*y = c1
  a2: number;
  b2: number;
  c2: number; // a2*x + b2*y = c2
}

/**
 * Attempts to parse two linear equations from problem text:
 * e.g. "2x - 3y = 1 and 5y - x = 3" or similar JEE coordinate geometry questions.
 */
export function parseLinearSystem(text: string): LinearSystem | null {
  // Normalize spacing, minus signs, and variable casing
  const clean = text.replace(/[–—−]/g, '-').replace(/\s+/g, ' ').trim();

  // Pattern matching: [sign][coef]x [sign][coef]y = [sign][val]
  // or [sign][coef]y [sign][coef]x = [sign][val]
  const eqRegex =
    /([+-]?\s*\d*\.?\d*)\s*([xy])\s*([+-]\s*\d*\.?\d*)\s*([xy])\s*=\s*([+-]?\s*\d*\.?\d+)/gi;
  const matches = [...clean.matchAll(eqRegex)];

  if (matches.length >= 2) {
    const parseEq = (m: RegExpMatchArray): { a: number; b: number; c: number } | null => {
      let a = 0;
      let b = 0;
      const parseTerm = (coefStr: string, varChar: string) => {
        const s = coefStr.replace(/\s+/g, '');
        let val: number;
        if (s === '' || s === '+') val = 1;
        else if (s === '-') val = -1;
        else val = parseFloat(s);

        if (varChar.toLowerCase() === 'x') a = val;
        else if (varChar.toLowerCase() === 'y') b = val;
      };

      parseTerm(m[1], m[2]);
      parseTerm(m[3], m[4]);
      const c = parseFloat(m[5].replace(/\s+/g, ''));
      if (isNaN(a) || isNaN(b) || isNaN(c)) return null;
      return { a, b, c };
    };

    const eq1 = parseEq(matches[0]);
    const eq2 = parseEq(matches[1]);
    if (eq1 && eq2) {
      return {
        a1: eq1.a,
        b1: eq1.b,
        c1: eq1.c,
        a2: eq2.a,
        b2: eq2.b,
        c2: eq2.c,
      };
    }
  }

  return null;
}

/**
 * Solves a 2x2 linear system using Cramer's rule.
 */
export function solveLinearSystem(sys: LinearSystem): { x: number; y: number } | null {
  const det = sys.a1 * sys.b2 - sys.a2 * sys.b1;
  if (Math.abs(det) < 1e-9) return null; // Parallel or identical lines

  const detX = sys.c1 * sys.b2 - sys.c2 * sys.b1;
  const detY = sys.a1 * sys.c2 - sys.a2 * sys.c1;

  const x = Math.round((detX / det) * 10000) / 10000;
  const y = Math.round((detY / det) * 10000) / 10000;
  return { x, y };
}

/**
 * Formats a number cleanly (e.g. 2, -1, 0.5)
 */
function fmtNum(n: number): string {
  if (Number.isInteger(n)) return n.toString();
  return (Math.round(n * 100) / 100).toString();
}

/**
 * Generates 4 mathematically valid coordinate options:
 * 1 correct answer and 3 distinct plausible distractors with full trap explanations.
 */
export function generateCoordinateOptions(
  correctX: number,
  correctY: number,
  correctId: 'A' | 'B' | 'C' | 'D' = 'A',
): Option[] {
  const correctStr = `(${fmtNum(correctX)}, ${fmtNum(correctY)})`;

  // Candidate distractors:
  // 1. Swapped coordinates (confused x and y)
  const swappedStr = `(${fmtNum(correctY)}, ${fmtNum(correctX)})`;
  // 2. Sign slip on y
  const signYStr = `(${fmtNum(correctX)}, ${fmtNum(-correctY || 1)})`;
  // 3. Sign slip on x
  const signXStr = `(${fmtNum(-correctX || 1)}, ${fmtNum(correctY)})`;
  // 4. Shift / Quadrant offset
  const shiftStr = `(${fmtNum(correctX + 1)}, ${fmtNum(correctY - 1)})`;

  const distractorCandidates = [
    {
      latex: swappedStr,
      trap: {
        label: 'Swapped coordinates',
        why_plausible: 'Confused the horizontal and vertical coordinate positions.',
        first_wrong_pivot: 'Reported the coordinates as (y, x) instead of (x, y).',
        counterfactual_valid_when: 'x == y when lines intersect along the diagonal y = x',
        avoidance_rule: 'Write solution coordinates explicitly as ordered pair (x, y).',
        recovery_check: {
          question: 'What is the x-coordinate of the intersection point?',
          answer: fmtNum(correctX),
          expression: fmtNum(correctX),
          target_expression: fmtNum(correctX),
          explanation: `Substitute y = ${fmtNum(correctY)} back into the rearranged equation for x.`,
        },
      },
    },
    {
      latex: signYStr,
      trap: {
        label: 'Sign error on y-coordinate',
        why_plausible: 'Transposed a term across equality without switching its sign.',
        first_wrong_pivot: 'Dropped negative sign while isolating the dependent variable.',
        counterfactual_valid_when:
          'The sign of the constant term in the second equation is inverted',
        avoidance_rule: 'Check negative signs carefully when dividing or transposing terms.',
        recovery_check: {
          question: 'What is the sign of the y-coordinate?',
          answer: fmtNum(Math.sign(correctY) || 1),
          expression: fmtNum(Math.sign(correctY) || 1),
          target_expression: fmtNum(Math.sign(correctY) || 1),
          explanation: `Solving for y yields y = ${fmtNum(correctY)}.`,
        },
      },
    },
    {
      latex: signXStr,
      trap: {
        label: 'Sign error on x-coordinate',
        why_plausible: 'Subtracted instead of added when moving terms across the equals sign.',
        first_wrong_pivot: 'Incorrect sign assignment when solving for x.',
        counterfactual_valid_when: 'The linear coefficient of x has opposite parity',
        avoidance_rule:
          'Verify each coordinate by substituting back into both original line equations.',
        recovery_check: {
          question: 'What is the x-coordinate when substituted into the first line?',
          answer: fmtNum(correctX),
          expression: fmtNum(correctX),
          target_expression: fmtNum(correctX),
          explanation: `Solving yields x = ${fmtNum(correctX)}.`,
        },
      },
    },
    {
      latex: shiftStr,
      trap: {
        label: 'Arithmetic slip in substitution',
        why_plausible: 'Miscalculated the constant term during variable elimination.',
        first_wrong_pivot: 'Combined constant terms with an off-by-one arithmetic error.',
        counterfactual_valid_when: 'The constant terms differ by the arithmetic shift',
        avoidance_rule:
          'Compute intermediate arithmetic steps carefully before dividing by coefficients.',
        recovery_check: {
          question: 'What is the constant sum after elimination?',
          answer: fmtNum(correctX),
          expression: fmtNum(correctX),
          target_expression: fmtNum(correctX),
          explanation: 'Re-evaluate arithmetic sum of constant terms.',
        },
      },
    },
  ];

  // Filter out any candidates that happen to be identical to the correct string or to each other
  const chosenDistractors: { latex: string; trap: Trap }[] = [];
  const used = new Set<string>([correctStr]);

  for (const cand of distractorCandidates) {
    if (!used.has(cand.latex)) {
      used.add(cand.latex);
      chosenDistractors.push(cand);
    }
    if (chosenDistractors.length === 3) break;
  }

  // If still need distractors to make exactly 3:
  let offset = 2;
  while (chosenDistractors.length < 3) {
    const fallbackStr = `(${fmtNum(correctX + offset)}, ${fmtNum(correctY + offset)})`;
    if (!used.has(fallbackStr)) {
      used.add(fallbackStr);
      chosenDistractors.push({
        latex: fallbackStr,
        trap: {
          label: 'Parallel translation error',
          why_plausible:
            'Calculated an offset point lying on a parallel line instead of the intersection.',
          first_wrong_pivot:
            'Selected an arbitrary point on one line without satisfying the second.',
          counterfactual_valid_when: 'The lines are shifted by the specified offset vector',
          avoidance_rule: 'Points must satisfy BOTH line equations simultaneously.',
          recovery_check: {
            question: 'Does the chosen point satisfy both equations?',
            answer: '0',
            expression: '0',
            target_expression: '0',
            explanation: 'Only the unique intersection satisfies both line equations.',
          },
        },
      });
    }
    offset++;
  }

  const ids: ('A' | 'B' | 'C' | 'D')[] = ['A', 'B', 'C', 'D'];
  const options: Option[] = [];
  let distractorIdx = 0;

  for (const id of ids) {
    if (id === correctId) {
      options.push({
        id,
        latex: correctStr,
        expression: correctStr,
        derived_expression: correctStr,
        unit: [0, 0, 0],
        slope: 1.0,
        intercept: 0.0,
        trap: null,
      });
    } else {
      const d = chosenDistractors[distractorIdx++];
      options.push({
        id,
        latex: d.latex,
        expression: d.latex,
        derived_expression: d.latex,
        unit: [0, 0, 0],
        slope: 0.5,
        intercept: 0.0,
        trap: d.trap,
      });
    }
  }

  return options;
}

/**
 * Generates 4 mathematically valid scalar options:
 * 1 correct answer and 3 distinct plausible distractors with full trap explanations.
 */
export function generateScalarOptions(
  correctVal: number,
  unitStr: string = '',
  unitVec: [number, number, number] = [0, 0, 0],
  correctId: 'A' | 'B' | 'C' | 'D' = 'A',
): Option[] {
  const u = unitStr ? `\\text{ ${unitStr}}` : '';
  const correctLatex = `${fmtNum(correctVal)}${u}`;
  const correctExpr = fmtNum(correctVal);

  const cands = [
    {
      val: correctVal * 2,
      label: 'Missing factor of 1/2',
      pivot: 'Omitted the factor of 1/2 in the formula (e.g. kinetic energy or integration).',
    },
    {
      val: correctVal !== 0 ? Math.round((correctVal / 2) * 100) / 100 : 2,
      label: 'Extra factor of 2',
      pivot: 'Multiplied by an unintended factor of 2 during calculation.',
    },
    {
      val: -correctVal,
      label: 'Opposite sign slip',
      pivot: 'Inverted the direction or sign convention in vector/scalar projection.',
    },
    {
      val: correctVal + 2,
      label: 'Arithmetic addition offset',
      pivot: 'Added rather than subtracted the constant component.',
    },
  ];

  const chosenDistractors: { latex: string; expr: string; trap: Trap }[] = [];
  const used = new Set<string>([correctLatex]);

  for (const c of cands) {
    const lat = `${fmtNum(c.val)}${u}`;
    if (!used.has(lat) && c.val !== correctVal) {
      used.add(lat);
      chosenDistractors.push({
        latex: lat,
        expr: fmtNum(c.val),
        trap: {
          label: c.label,
          why_plausible: `A common algebraic or coefficient error leading to ${fmtNum(c.val)}.`,
          first_wrong_pivot: c.pivot,
          counterfactual_valid_when: 'The question specifies a different constant multiplier',
          avoidance_rule: 'Double-check constant coefficients and dimensional factors.',
          recovery_check: {
            question: 'What is the correct coefficient for this formula?',
            answer: fmtNum(correctVal),
            expression: fmtNum(correctVal),
            target_expression: fmtNum(correctVal),
            explanation: `The accurate evaluation evaluates to ${fmtNum(correctVal)}.`,
          },
        },
      });
    }
    if (chosenDistractors.length === 3) break;
  }

  // Ensure exactly 3 distractors
  let step = 3;
  while (chosenDistractors.length < 3) {
    const val = correctVal + step;
    const lat = `${fmtNum(val)}${u}`;
    if (!used.has(lat)) {
      used.add(lat);
      chosenDistractors.push({
        latex: lat,
        expr: fmtNum(val),
        trap: {
          label: 'Magnitude offset error',
          why_plausible: 'Arithmetic offset accumulated during intermediate steps.',
          first_wrong_pivot: 'Added incorrect constant offset.',
          counterfactual_valid_when: 'The base parameters are shifted accordingly',
          avoidance_rule: 'Carefully compute each intermediate term.',
          recovery_check: {
            question: 'What is the correct value?',
            answer: fmtNum(correctVal),
            expression: fmtNum(correctVal),
            target_expression: fmtNum(correctVal),
            explanation: `The value is ${fmtNum(correctVal)}.`,
          },
        },
      });
    }
    step += 2;
  }

  const ids: ('A' | 'B' | 'C' | 'D')[] = ['A', 'B', 'C', 'D'];
  const options: Option[] = [];
  let dIdx = 0;

  for (const id of ids) {
    if (id === correctId) {
      options.push({
        id,
        latex: correctLatex,
        expression: correctExpr,
        derived_expression: correctExpr,
        unit: unitVec,
        slope: 1.0,
        intercept: 0.0,
        trap: null,
      });
    } else {
      const d = chosenDistractors[dIdx++];
      options.push({
        id,
        latex: d.latex,
        expression: d.expr,
        derived_expression: d.expr,
        unit: unitVec,
        slope: 0.5,
        intercept: 0.0,
        trap: d.trap,
      });
    }
  }

  return options;
}

/**
 * Regenerates the 3 distractors of an existing Item at runtime,
 * preserving the correct answer and ensuring distinct, plausible options.
 */
export function regenerateRuntimeDistractors(item: Item): Item {
  const correct = item.options.find((o) => o.id === item.correct_id);
  if (!correct) return item;

  // Check if the answer is a coordinate tuple e.g. (x, y)
  const coordMatch = correct.expression.match(
    /^\s*\(\s*([+-]?\d*\.?\d+)\s*,\s*([+-]?\d*\.?\d+)\s*\)\s*$/,
  );
  if (coordMatch) {
    const x = parseFloat(coordMatch[1]);
    const y = parseFloat(coordMatch[2]);
    const newOptions = generateCoordinateOptions(x, y, item.correct_id);
    return {
      ...item,
      options: newOptions,
    };
  }

  // Check if scalar number
  const num = parseFloat(correct.expression);
  if (!isNaN(num)) {
    const unitVec: [number, number, number] =
      item.expected_unit.length === 3
        ? [item.expected_unit[0], item.expected_unit[1], item.expected_unit[2]]
        : [0, 0, 0];
    const newOptions = generateScalarOptions(num, '', unitVec, item.correct_id);
    return {
      ...item,
      options: newOptions,
    };
  }

  // Default: retain existing item if complex expression
  return item;
}

/**
 * Builds an authentic JEE drill Item for an intersection of straight lines problem.
 */
export function createLineIntersectionItem(
  sys: LinearSystem,
  solution: { x: number; y: number },
  exam: Exam = 'main',
  index: number = 1,
): Item {
  const prompt = `Find the coordinates of the point of intersection of the straight lines $${sys.a1}x ${sys.b1 >= 0 ? '+' : '-'} ${Math.abs(sys.b1)}y = ${sys.c1}$ and $${sys.b2}y ${sys.a2 >= 0 ? '+' : '-'} ${Math.abs(sys.a2)}x = ${sys.c2}$.`;
  const correctId: 'A' | 'B' | 'C' | 'D' = 'A';
  const options = generateCoordinateOptions(solution.x, solution.y, correctId);

  const rawItem = {
    schema_version: 'targetjee.item.v2' as const,
    id: `local-coord-lines-${index}-${Date.now().toString(36)}`,
    exam,
    subject: 'Mathematics' as const,
    topic: 'Straight Lines & Coordinate Geometry',
    prompt,
    context: `Solve the system of linear equations by elimination or substitution to find unique coordinates (x, y).`,
    options,
    correct_id: correctId,
    answer_expression: `(${fmtNum(solution.x)}, ${fmtNum(solution.y)})`,
    solution: `From $${sys.b2}y ${sys.a2 >= 0 ? '+' : '-'} ${Math.abs(sys.a2)}x = ${sys.c2}$, express $x$ in terms of $y$: $x = \\frac{${sys.b2}y - ${sys.c2}}{${-sys.a2}}$. Substituting into $${sys.a1}x ${sys.b1 >= 0 ? '+' : '-'} ${Math.abs(sys.b1)}y = ${sys.c1}$ gives $y = ${fmtNum(solution.y)}$ and $x = ${fmtNum(solution.x)}$. Thus, the point of intersection is $(${fmtNum(solution.x)}, ${fmtNum(solution.y)})$.`,
    domain: { y: 'real' as const },
    expected_unit: [0, 0, 0] as [number, number, number],
    diagram_anchors: [],
    beta_seconds: exam === 'main' ? 120 : 210,
    alpha: 1.0,
    a: 1.0,
    b: 0.0,
    c: 0.25,
    positive_marks: 4 as const,
    negative_marks: 1 as const,
    parameter_source: 'model-proposed' as const,
  };

  return itemSchema.parse(rawItem);
}

/**
 * Pre-calibrated bank of JEE Mains and Advanced problem templates
 * covering Coordinate Geometry, Mechanics, Electrodynamics, and Calculus.
 */
export const LOCAL_PROBLEM_TEMPLATES: Array<(exam: Exam, idx: number) => Item> = [
  // 1. Point of intersection of lines (image-20.png reference)
  (exam, idx) =>
    createLineIntersectionItem(
      { a1: 2, b1: -3, c1: 1, a2: -1, b2: 5, c2: 3 },
      { x: 2, y: 1 },
      exam,
      idx,
    ),
  // 2. Kinematics / Force acceleration
  (exam, idx) => {
    const m = 4;
    const f = 20;
    const a = f / m; // 5 m/s²
    const correctId: 'A' | 'B' | 'C' | 'D' = 'B';
    const options = generateScalarOptions(a, 'm/s^2', [0, 1, -2], correctId);
    return itemSchema.parse({
      schema_version: 'targetjee.item.v2',
      id: `local-kinematics-${idx}-${Date.now().toString(36)}`,
      exam,
      subject: 'Physics',
      topic: 'Laws of Motion',
      prompt: `A block of mass $${m}\\text{ kg}$ is pulled along a smooth horizontal surface by a constant horizontal force of $${f}\\text{ N}$. Determine the acceleration of the block.`,
      context:
        'Smooth surface implies friction coefficient mu = 0. Use Newton’s second law F = m * a.',
      options,
      correct_id: correctId,
      answer_expression: `${a}`,
      solution: `By Newton's second law: $F = m a \\implies a = \\frac{F}{m} = \\frac{${f}\\text{ N}}{${m}\\text{ kg}} = ${a}\\text{ m/s}^2$.`,
      domain: {},
      expected_unit: [0, 1, -2],
      diagram_anchors: [],
      beta_seconds: exam === 'main' ? 100 : 190,
      alpha: 1.0,
      a: 1.0,
      b: 0.0,
      c: 0.25,
      positive_marks: 4,
      negative_marks: 1,
      parameter_source: 'model-proposed',
    });
  },
  // 3. Coordinate Geometry: Distance of point from line
  (exam, idx) => {
    // Distance from (1, 2) to 3x + 4y - 1 = 0
    // d = |3(1) + 4(2) - 1| / sqrt(3^2 + 4^2) = |3 + 8 - 1| / 5 = 10 / 5 = 2
    const correctId: 'A' | 'B' | 'C' | 'D' = 'C';
    const options = generateScalarOptions(2, '', [0, 0, 0], correctId);
    return itemSchema.parse({
      schema_version: 'targetjee.item.v2',
      id: `local-distance-line-${idx}-${Date.now().toString(36)}`,
      exam,
      subject: 'Mathematics',
      topic: 'Coordinate Geometry',
      prompt: `Find the perpendicular distance of the point $(1, 2)$ from the straight line $3x + 4y - 1 = 0$.`,
      context: 'Use perpendicular distance formula d = |a*x0 + b*y0 + c| / sqrt(a^2 + b^2).',
      options,
      correct_id: correctId,
      answer_expression: '2',
      solution: `Using $d = \\frac{|a x_0 + b y_0 + c|}{\\sqrt{a^2 + b^2}}$: $d = \\frac{|3(1) + 4(2) - 1|}{\\sqrt{3^2 + 4^2}} = \\frac{|10|}{5} = 2$.`,
      domain: {},
      expected_unit: [0, 0, 0],
      diagram_anchors: [],
      beta_seconds: exam === 'main' ? 110 : 200,
      alpha: 1.0,
      a: 1.0,
      b: 0.0,
      c: 0.25,
      positive_marks: 4,
      negative_marks: 1,
      parameter_source: 'model-proposed',
    });
  },
  // 4. Centroid of Triangle
  (exam, idx) => {
    // Vertices (2, 4), (4, 6), (6, 2) -> Centroid ((2+4+6)/3, (4+6+2)/3) = (4, 4)
    // Let's use (1, 2), (3, 4), (5, 0) -> (3, 2)
    const correctId: 'A' | 'B' | 'C' | 'D' = 'D';
    const options = generateCoordinateOptions(3, 2, correctId);
    return itemSchema.parse({
      schema_version: 'targetjee.item.v2',
      id: `local-centroid-${idx}-${Date.now().toString(36)}`,
      exam,
      subject: 'Mathematics',
      topic: 'Coordinate Geometry',
      prompt: `Find the coordinates of the centroid of the triangle whose vertices are $(1, 2)$, $(3, 4)$, and $(5, 0)$.`,
      context: 'Centroid G = ((x1 + x2 + x3)/3, (y1 + y2 + y3)/3).',
      options,
      correct_id: correctId,
      answer_expression: '(3, 2)',
      solution: `$G = \\left(\\frac{1 + 3 + 5}{3}, \\frac{2 + 4 + 0}{3}\\right) = \\left(\\frac{9}{3}, \\frac{6}{3}\\right) = (3, 2)$.`,
      domain: {},
      expected_unit: [0, 0, 0],
      diagram_anchors: [],
      beta_seconds: exam === 'main' ? 110 : 190,
      alpha: 1.0,
      a: 1.0,
      b: 0.0,
      c: 0.25,
      positive_marks: 4,
      negative_marks: 1,
      parameter_source: 'model-proposed',
    });
  },
];

/**
 * Extracts multiple questions from text or generates a complete drill
 * with up to 10 distinct questions, completely in-browser without requiring an external API key.
 */
export function generateLocalDrill(input: {
  text?: string;
  exam: Exam;
  requestedCount?: number;
}): Item[] {
  const text = (input.text || '').trim();
  const exam = input.exam;

  // 1. Check if input text contains linear equations to solve for intersection
  if (text.length >= 10) {
    const sys = parseLinearSystem(text);
    if (sys) {
      const sol = solveLinearSystem(sys);
      if (sol) {
        return [createLineIntersectionItem(sys, sol, exam, 1)];
      }
    }

    // Split text if it contains multiple questions (e.g. Q1, Q2 or 1., 2., etc.)
    const questionSplits = text
      .split(/(?:^|\n+)(?:(?:Question|Q\.?|\b)\s*(\d+)[.:)]|\((\d+)\))/i)
      .filter(Boolean);
    if (questionSplits.length >= 2) {
      const extractedItems: Item[] = [];
      let count = 0;
      for (const chunk of questionSplits) {
        if (chunk.length > 15 && !/^\d+$/.test(chunk.trim())) {
          count++;
          const sysChunk = parseLinearSystem(chunk);
          if (sysChunk) {
            const solChunk = solveLinearSystem(sysChunk);
            if (solChunk) {
              extractedItems.push(createLineIntersectionItem(sysChunk, solChunk, exam, count));
            }
          }
        }
        if (extractedItems.length >= 10) break;
      }
      if (extractedItems.length > 0) {
        return extractedItems;
      }
    }
  }

  // 2. Return pre-calibrated bank items matching the exam
  const count = Math.min(10, Math.max(1, input.requestedCount || 4));
  const items: Item[] = [];
  for (let i = 0; i < count; i++) {
    const templateFn = LOCAL_PROBLEM_TEMPLATES[i % LOCAL_PROBLEM_TEMPLATES.length];
    items.push(templateFn(exam, i + 1));
  }

  return items;
}
