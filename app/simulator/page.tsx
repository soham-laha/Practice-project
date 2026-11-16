import { Simulator } from '@/components/simulator';
import type { Metadata } from 'next';
export const metadata: Metadata = { title: 'Practice room' };
export default function SimulatorPage() {
  return <Simulator />;
}
