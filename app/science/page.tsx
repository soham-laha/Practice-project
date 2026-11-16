import Link from 'next/link';
import { MathExpr } from '@/components/math';
import { ArrowUpRight, FlaskConical, ShieldCheck } from 'lucide-react';
import type { Metadata } from 'next';
export const metadata: Metadata = { title: 'The science behind it' };
const models = [
  {
    title: '01 · Conceptual evidence, not just a raw score',
    formula: String.raw`P_i(\theta)=c_i+\frac{1-c_i}{1+\exp[-1.702\,a_i(\theta-b_i)]}`,
    text: 'Birnbaum’s three-parameter logistic model accounts for item difficulty b, discrimination a and a guessing floor c. A coarse global search followed by bounded finite-difference Newton–Raphson maximizes likelihood on −3 ≤ θ ≤ 3. Unanswered items count as incorrect in this estimate but remain zero marks in the actual score. Conditional uncertainty is estimated from expected item information.',
    caution:
      'A four-option guess floor is 0.25 in our reference items. We do not suppress it simply because a distractor looks clever. An uncalibrated short drill cannot establish “true mastery.”',
  },
  {
    title: '02 · Notice the wrong turn, not just the wrong answer',
    formula: String.raw`P_{ik}(\theta)=\frac{\exp(a_{ik}\theta+c_{ik})}{\sum_{h=1}^{4}\exp(a_{ih}\theta+c_{ih})}`,
    text: 'Bock’s nominal response model assigns an attractiveness slope and intercept to each option. A stable softmax (subtracting the largest logit) prevents overflow. Deep analysis exposes these illustrative probabilities; the authored trap trace supplies the practical guardrail.',
    caution:
      'A positive-slope distractor is not proof that you are an “elite student,” nor that we know your intentions. Parameters need real response data before individual diagnostic claims are valid.',
  },
  {
    title: '03 · Pace, weighted by how informative the item is',
    formula: String.raw`\ln T_i\sim\mathcal N(\beta_i-\tau,\alpha_i^{-2})`,
    second: String.raw`\hat\tau=\frac{\sum_i\alpha_i^2(\beta_i-\ln T_i)}{\sum_i\alpha_i^2},\quad \mathrm{SE}(\hat\tau)=\frac1{\sqrt{\sum_i\alpha_i^2}}`,
    text: 'Van der Linden’s log-normal response-time model uses βᵢ = ln(benchmark seconds). Alpha is time precision: its square is the weight. Positive τ means faster than this item set’s benchmark. Only positive-time answered items enter this calculation.',
    caution:
      'The conditional SE assumes known item parameters. It does not include uncertainty in our illustrative benchmark calibration, device conditions, reading time or breaks.',
  },
  {
    title: '04 · Keep grace visible, without taking marks away',
    formula: String.raw`\theta^*(t,g)=\theta-\lambda\max\!\left(0,\frac{\beta_{s}}t-1\right)-0.22\ln\!\left(1+\frac g{\beta_s}\right)`,
    text: 'A transparent speed–accuracy heuristic separates haste from additional time. Here βₛ is benchmark seconds, λ = 0.15, and g is granted grace seconds. Each extension is an append-only local TimeDeficitEvent. The exact formula is not clipped, so adjusted values may fall outside the base ability interval.',
    caution:
      'This pressure adjustment is a product heuristic supplied in the architecture brief, not a universally validated psychometric law. It never changes actual +4/−1 or +4/−2 exam marks.',
  },
  {
    title: '05 · Compare confidence with evidence, only when you report it',
    formula: String.raw`\mathrm{Brier}=\frac1N\sum_{n=1}^{N}(f_n-o_n)^2`,
    second: String.raw`\mathrm{ECE}=\sum_{m=1}^{5}\frac{|B_m|}{N}\,|\mathrm{acc}(B_m)-\mathrm{conf}(B_m)|`,
    text: 'Brier score and five equal-width confidence bins measure the difference between your explicit certainty tag and binary correctness. Guess = 0.25, Think so = 0.65, Certain = 0.95. Untagged and unanswered responses are omitted; a confidence of exactly 1 belongs to the final bin.',
    caution:
      'We never infer certainty from dwell time or option-switching. A few diagnostic self-reports are not enough to label a learner overconfident.',
  },
];
export default function Science() {
  return (
    <div className="science-content">
      <div className="page-title">
        <span className="eyebrow">
          <FlaskConical size={14} />
          TRANSPARENT BY DESIGN
        </span>
        <h1>
          Thoughtful engineering.
          <br />
          <em>Honest about the limits.</em>
        </h1>
        <p>
          Five mathematical tools help organize your evidence. They don’t read minds, predict ranks,
          or turn a six-question drill into a standardized examination.
        </p>
      </div>
      <section className="science-card card">
        <h2>A calmer loop, grounded in research.</h2>
        <p>
          Coherent visual hierarchy can improve perceived usability; bounded progress makes the next
          step understandable; explicit repair and a revisit plan close the loop without creating an
          endless streak to protect. Those are design rationales, not a claim that this app has been
          clinically or educationally validated.
        </p>
        <ul className="source-list">
          <li>
            <a
              href="https://doi.org/10.1016/S0953-5438(00)00031-X"
              target="_blank"
              rel="noreferrer"
            >
              Tractinsky, Katz & Ikar (2000) — aesthetics and perceived usability.
            </a>
          </li>
          <li>
            <a href="https://doi.org/10.1086/500480" target="_blank" rel="noreferrer">
              Nunes & Drèze (2006) — endowed progress and persistence.
            </a>{' '}
            Our first completed step means your practice space is genuinely ready, not that mastery
            has been awarded.
          </li>
          <li>
            <a href="https://doi.org/10.1037/a0024192" target="_blank" rel="noreferrer">
              Masicampo & Baumeister (2011) — plans for unfinished goals.
            </a>
          </li>
          <li>
            <a href="https://doi.org/10.1177/0018720813515509" target="_blank" rel="noreferrer">
              Piepenbrock, Mayr & Buchner (2014) — display polarity and small-character legibility.
            </a>{' '}
            Theme choice and measured contrast matter more than claims about a magical hue.
          </li>
          <li>
            <a href="https://doi.org/10.1037/0033-2909.125.6.627" target="_blank" rel="noreferrer">
              Deci, Koestner & Ryan (1999) — rewards and intrinsic motivation.
            </a>{' '}
            Feedback acknowledges reasoning, not points or random loot.
          </li>
        </ul>
        <p>
          Apple’s material and accessibility guidelines and Weiser & Brown’s calm-technology essays
          inform layering and attention management; they are not retention trials. Full
          evidence-to-interface mapping, colour tokens and assumptions are in{' '}
          <code>docs/DESIGN_RESEARCH.md</code>.
        </p>
      </section>
      {models.map((m) => (
        <section className="science-card card" key={m.title}>
          <h2>{m.title}</h2>
          <MathExpr value={m.formula} block />
          {m.second && <MathExpr value={m.second} block />}
          <p>{m.text}</p>
          <div className="note-box" style={{ marginTop: 19 }}>
            <FlaskConical size={16} />
            <span>{m.caution}</span>
          </div>
        </section>
      ))}
      <section className="science-card card">
        <h2>Algebraic guardrails, not an oracle.</h2>
        <p>
          The forge checks a strict targetjee.item.v2 contract: four distinct real expressions, one
          keyed answer, three evaluated trap certificates, declared symbol assumptions, matching
          mass/length/time unit vectors, and recovery-answer certificates. Parsing uses an AST
          allowlist, not eval. Symbolic work runs in a disposable, time-bounded subprocess.
        </p>
        <p style={{ marginTop: 13 }}>
          These checks establish algebraic consistency within the supplied certificate. They do not
          independently prove OCR fidelity, a physical diagram’s meaning, numerical benchmark
          calibration, or the validity of a premise written by AI. Unit vectors are checked for
          consistency, not derived from prose. Unreadable or unsupported problems must be rejected
          or corrected, not silently approximated.
        </p>
        <div className="privacy-note">
          <ShieldCheck size={17} />
          <span>
            No accounts, server-side learner database, key persistence, trackers or advertising.
            Your browser sends a request-scoped key over HTTPS only for the forge and coach. Your
            chosen AI provider receives that key and source; its terms and quotas apply. Local
            storage is not encryption: protect your device and export a backup.
          </span>
        </div>
      </section>
      <Link href="/simulator" className="button primary">
        Put the thinking into practice <ArrowUpRight size={16} />
      </Link>
    </div>
  );
}
