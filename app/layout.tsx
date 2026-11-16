import type { Metadata } from 'next';
import '@fontsource-variable/manrope';
import '@fontsource-variable/newsreader';
import '@fontsource-variable/newsreader/wght-italic.css';
import 'katex/dist/katex.min.css';
import './globals.css';
import { Providers } from '@/components/providers';
import { Shell } from '@/components/shell';
export const metadata: Metadata = {
  title: { default: 'TargetJEE — Make your knowledge exam-ready', template: '%s · TargetJEE' },
  description:
    'A calmer way to practice for JEE Main and Advanced. Turn textbook problems into focused drills and mistakes into lasting understanding. No account needed.',
  icons: { icon: '/icon.svg' },
};
const initTheme = `try{var t=localStorage.getItem('targetjee.theme.v1');if(t==='light'||t==='dark'||t==='contrast')document.documentElement.dataset.theme=t}catch(e){}`;
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="light" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: initTheme }} />
      </head>
      <body>
        <Providers>
          <Shell>{children}</Shell>
        </Providers>
      </body>
    </html>
  );
}
