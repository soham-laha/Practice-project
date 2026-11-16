import { Flashcards } from '@/components/flashcards';
import type { Metadata } from 'next';
export const metadata: Metadata = { title: 'Revision cards' };
export default function FlashcardsPage() {
  return <Flashcards />;
}
