import { cookies } from 'next/headers';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { getSessionFromCookieString } from '@/lib/firebase/session';

export const runtime = 'nodejs';

type AuthenticatedLayoutProps = {
  children: import('react').ReactNode;
};

function BrandMark() {
  return (
    <svg
      viewBox="0 0 240 80"
      aria-hidden="true"
      className="h-auto w-[168px]"
      xmlns="http://www.w3.org/2000/svg"
    >
      <g transform="translate(8, 4)">
        <rect x="5" y="0" width="14" height="9" rx="2" fill="#D4A5A8" />
        <rect x="8" y="9" width="8" height="7" fill="#6B3F5E" />
        <polygon
          points="3,16 0,22 0,68 12,72 24,68 24,22 21,16"
          fill="#6B3F5E"
        />
        <polygon
          points="12,18 21,22 24,68 12,72"
          fill="rgba(250,247,242,0.1)"
        />
      </g>
      <text
        x="36"
        y="42"
        fill="#6B3F5E"
        fontFamily="'Fraunces',Georgia,serif"
        fontSize="18"
        fontWeight="400"
      >
        Nail
      </text>
      <text
        x="36"
        y="63"
        fill="#6B3F5E"
        fontFamily="'Fraunces',Georgia,serif"
        fontSize="18"
        fontWeight="400"
      >
        Tech Assistant
      </text>
    </svg>
  );
}

function Header() {
  return (
    <header className="border-b border-[color:rgb(212_203_197_/_0.7)] bg-background/90 backdrop-blur-sm">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-6 py-5">
        <Link
          href="/"
          aria-label="Nail Tech Assistant home"
          className="rounded-xl outline-none transition focus-visible:ring-2 focus-visible:ring-[color:rgb(107_63_94_/_0.25)]"
        >
          <BrandMark />
        </Link>
        <nav aria-label="Primary" className="flex items-center gap-3">
          <span className="rounded-full border border-[color:rgb(212_203_197_/_0.85)] bg-card px-4 py-2 font-body text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
            Studio Dashboard
          </span>
        </nav>
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer className="border-t border-[color:rgb(212_203_197_/_0.7)] bg-background/80">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-5 font-body text-xs text-muted-foreground">
        <p>Private design workspace for Nail Tech Assistant.</p>
        <p>More dashboard routes land in later Epic A stories.</p>
      </div>
    </footer>
  );
}

export default async function AuthenticatedLayout({
  children,
}: AuthenticatedLayoutProps) {
  const cookieStore = await cookies();
  const session = await getSessionFromCookieString(
    cookieStore.get('session')?.value
  );

  if (!session) {
    redirect('/login');
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto max-w-6xl px-6 py-8 sm:py-10">{children}</main>
      <Footer />
    </div>
  );
}
