import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
export default function NotFound() {
  return (
    <div className="not-found">
      <span className="eyebrow" style={{ justifyContent: 'center', marginBottom: 18 }}>
        A SMALL DETOUR.
      </span>
      <h1>
        Let’s find your <em>way back.</em>
      </h1>
      <p>This page isn’t part of the practice loop.</p>
      <Link href="/" className="button primary">
        Back to your workspace <ArrowRight size={16} />
      </Link>
    </div>
  );
}
