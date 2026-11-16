import type { Metadata } from 'next';
import { Forge } from '@/components/forge';
export const metadata: Metadata = { title: 'Build a drill' };
export default function ForgePage() {
  return <Forge />;
}
