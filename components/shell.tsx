'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import {
  LayoutDashboard,
  ScanLine,
  BookOpen,
  Layers3,
  Plus,
  ArrowUpRight,
  ShieldCheck,
  KeyRound,
  Menu,
  X,
  GraduationCap,
  FlaskConical,
  ChevronRight,
  Check,
  Monitor,
} from 'lucide-react';
import { useApp } from './providers';
import { getFlashcards } from '@/lib/analysis';
import { ThemeSwitch } from './theme-switch';
import { ByokModal } from './byok-modal';
const nav = [
  { href: '/', label: 'Overview', icon: LayoutDashboard },
  { href: '/simulator', label: 'Practice room', icon: ScanLine },
  { href: '/dashboard', label: 'Review studio', icon: BookOpen },
  { href: '/flashcards', label: 'Revision cards', icon: Layers3 },
];
export function Brand() {
  return (
    <Link href="/" className="brand" aria-label="TargetJEE home">
      <span className="brand-mark">
        <span />
      </span>
      <span>
        target<span className="brand-heavy">jee</span>
        <small>The practice engine</small>
      </span>
    </Link>
  );
}
export function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname(),
    { hasKey, setKeyModal, notice, learner, notify } = useApp(),
    [menu, setMenu] = useState(false);
  const navigation = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!menu) return;
    const previous = document.activeElement as HTMLElement | null;
    const media = window.matchMedia('(max-width: 768px)');
    const closeOnDesktop = () => {
      if (!media.matches) setMenu(false);
    };
    const controls = () =>
      Array.from(
        navigation.current?.querySelectorAll<HTMLElement>('a[href], button:not(:disabled)') || [],
      ).filter((element) => element.getClientRects().length > 0);
    controls()[0]?.focus();
    const keyboard = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setMenu(false);
      }
      if (event.key !== 'Tab') return;
      const elements = controls(),
        first = elements[0],
        last = elements.at(-1);
      if (!first || !last) return;
      if (
        !navigation.current?.contains(document.activeElement) ||
        (event.shiftKey && document.activeElement === first) ||
        (!event.shiftKey && document.activeElement === last)
      ) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
      }
    };
    document.addEventListener('keydown', keyboard);
    media.addEventListener('change', closeOnDesktop);
    return () => {
      document.removeEventListener('keydown', keyboard);
      media.removeEventListener('change', closeOnDesktop);
      previous?.focus();
    };
  }, [menu]);
  const title =
    pathname === '/'
      ? 'Your learning workspace'
      : pathname === '/simulator'
        ? 'Practice room'
        : pathname === '/dashboard'
          ? 'Review studio'
          : pathname === '/forge'
            ? 'The item forge'
            : pathname === '/flashcards'
              ? 'Revision cards'
              : 'Behind the engine';
  return (
    <div className="app-shell">
      <a href="#main-content" className="skip-link">
        Skip to content
      </a>
      {menu && (
        <button
          aria-label="Close navigation overlay"
          className="nav-overlay"
          tabIndex={-1}
          onClick={() => setMenu(false)}
        />
      )}
      <aside
        ref={navigation}
        id="workspace-navigation"
        className={`sidebar ${menu ? 'is-open' : ''}`}
        role={menu ? 'dialog' : undefined}
        aria-modal={menu ? true : undefined}
        aria-label={menu ? 'Workspace navigation' : undefined}
        onClick={(event) => {
          if ((event.target as HTMLElement).closest('a')) setMenu(false);
        }}
      >
        <div className="sidebar-brand">
          <Brand />
          <button
            className="icon-button mobile-only"
            aria-label="Close navigation"
            onClick={() => setMenu(false)}
          >
            <X size={20} />
          </button>
        </div>
        <div className="workspace-badge">Personal workspace</div>
        <nav aria-label="Primary navigation">
          {nav.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={`nav-link ${pathname === href ? 'active' : ''}`}
              aria-current={pathname === href ? 'page' : undefined}
              onClick={() => setMenu(false)}
            >
              <Icon size={19} />
              {label}
              {href === '/flashcards' && getFlashcards(learner).length > 0 && (
                <span className="nav-count">{getFlashcards(learner).length}</span>
              )}
            </Link>
          ))}
        </nav>
        <span className="nav-label">Make it yours</span>
        <Link
          href="/forge"
          className={`nav-link ${pathname === '/forge' ? 'active' : ''}`}
          onClick={() => setMenu(false)}
        >
          <Plus size={19} />
          Build a drill
          <ArrowUpRight size={14} className="push-right" />
        </Link>
        <Link
          href="/science"
          className={`nav-link ${pathname === '/science' ? 'active' : ''}`}
          onClick={() => setMenu(false)}
        >
          <FlaskConical size={19} />
          How it works
        </Link>
        <div className="sidebar-bottom">
          <div className="local-card">
            <ShieldCheck size={21} />
            <strong>Your space. Your data.</strong>
            <p>
              No accounts. No leaderboards.
              <br />
              Your practice stays here.
            </p>
            <Link href="/dashboard#data">
              Stored on this device <ArrowUpRight size={12} />
            </Link>
          </div>
          <button
            className="key-nav"
            onClick={() => {
              setMenu(false);
              setKeyModal(true);
            }}
          >
            <KeyRound size={17} />
            <span>
              {hasKey ? 'Gemini key saved' : 'Add Gemini key'}
              <small>{hasKey ? 'Access checked when used' : 'Bring your own key'}</small>
            </span>
            <ChevronRight size={15} />
          </button>
          <div className="local-profile">
            <span className="avatar">
              <GraduationCap size={20} />
            </span>
            <span>
              Your personal space
              <small>Local learner</small>
            </span>
            <Monitor size={15} />
          </div>
        </div>
      </aside>
      <div className="workspace" inert={menu}>
        <header className="topbar">
          <div className="topbar-left">
            <button
              className="icon-button mobile-only"
              aria-label="Open navigation"
              aria-expanded={menu}
              aria-controls="workspace-navigation"
              onClick={() => setMenu(true)}
            >
              <Menu size={21} />
            </button>
            <span className="breadcrumb">
              Workspace <ChevronRight size={13} />
              <strong>{title}</strong>
            </span>
          </div>
          <div className="topbar-actions">
            <ThemeSwitch />
            <span className="topbar-divider" />
            <button
              className={`key-pill ${hasKey ? 'connected' : ''}`}
              aria-label={hasKey ? 'Manage saved Gemini key' : 'Add API key'}
              onClick={() => setKeyModal(true)}
            >
              <KeyRound size={15} />
              <span>{hasKey ? 'Key saved' : 'Add API key'}</span>
              {hasKey ? <Check size={13} /> : <Plus size={13} />}
            </button>
            <Link href="/forge" className="button primary topbar-build">
              Build a drill <ArrowUpRight size={15} />
            </Link>
          </div>
        </header>
        <main id="main-content" className="page-content">
          {children}
        </main>
        <footer className="footer">
          <span>
            <span className="brand-mark tiny">
              <span />
            </span>
            Thoughtful practice. Lasting progress.
          </span>
          <div>
            Private by design{' '}
            <span className="footer-separator" aria-hidden="true">
              /
            </span>
            <Link href="/science">
              Built on evidence <ArrowUpRight size={12} />
            </Link>
          </div>
        </footer>
      </div>
      <ByokModal />
      {notice && (
        <div className="toast" role="status">
          <Check size={18} />
          <span>{notice}</span>
          <button
            className="icon-button"
            onClick={() => notify('')}
            aria-label="Dismiss notification"
          >
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
