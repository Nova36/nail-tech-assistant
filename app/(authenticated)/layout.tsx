import { cookies } from 'next/headers';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { getSessionFromCookieString } from '@/lib/firebase/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type AuthenticatedLayoutProps = {
  children: import('react').ReactNode;
};

function BrandMark() {
  return (
    <svg
      viewBox="0 0 240 80"
      aria-hidden="true"
      className="h-auto w-[156px]"
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

function HomeIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="h-[18px] w-[18px]"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 11.5 12 4l9 7.5" />
      <path d="M5 10v9a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1v-9" />
    </svg>
  );
}

function GridIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="h-[18px] w-[18px]"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="4" y="4" width="7" height="7" rx="1.5" />
      <rect x="13" y="4" width="7" height="7" rx="1.5" />
      <rect x="4" y="13" width="7" height="7" rx="1.5" />
      <rect x="13" y="13" width="7" height="7" rx="1.5" />
    </svg>
  );
}

function BoxIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="h-[18px] w-[18px]"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3.5 7.5 12 3l8.5 4.5v9L12 21l-8.5-4.5z" />
      <path d="M3.5 7.5 12 12l8.5-4.5" />
      <path d="M12 12v9" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="h-[18px] w-[18px]"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h.01a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v.01a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

type NavGroup = {
  label: string;
  items: Array<{
    href: string;
    label: string;
    icon: 'home' | 'grid' | 'box';
    badge?: string;
    active?: boolean;
  }>;
};

const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Studio',
    items: [
      { href: '/', label: 'Dashboard', icon: 'home', active: true },
      { href: '#', label: 'Gallery', icon: 'grid', badge: '124' },
    ],
  },
  {
    label: 'Inventory',
    items: [{ href: '#', label: 'Polishes', icon: 'box', badge: '86' }],
  },
];

function NavIcon({ kind }: { kind: 'home' | 'grid' | 'box' }) {
  if (kind === 'home') return <HomeIcon />;
  if (kind === 'grid') return <GridIcon />;
  return <BoxIcon />;
}

function Sidebar({
  displayName,
  email,
}: {
  displayName: string;
  email: string;
}) {
  const initials = displayName
    .split(' ')
    .map((part) => part.charAt(0))
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <aside className="flex w-[260px] shrink-0 flex-col border-r border-[color:rgb(212_203_197_/_0.6)] bg-[color:rgb(240_235_227_/_0.5)] backdrop-blur-sm">
      <div className="px-6 pb-4 pt-7">
        <Link
          href="/"
          aria-label="Nail Tech Assistant home"
          className="inline-flex rounded-lg outline-none transition focus-visible:ring-2 focus-visible:ring-[color:rgb(107_63_94_/_0.25)]"
        >
          <BrandMark />
        </Link>
      </div>
      <nav
        aria-label="Primary"
        className="flex flex-1 flex-col gap-7 px-4 py-4"
      >
        {NAV_GROUPS.map((group) => (
          <div key={group.label} className="space-y-1.5">
            <p className="px-3 font-body text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              {group.label}
            </p>
            <ul className="space-y-1">
              {group.items.map((item) => {
                const isActive = Boolean(item.active);
                return (
                  <li key={item.label}>
                    <Link
                      href={item.href}
                      aria-current={isActive ? 'page' : undefined}
                      aria-disabled={item.href === '#' ? 'true' : undefined}
                      style={
                        isActive
                          ? {
                              backgroundColor: '#6B3F5E',
                              color: '#FAF7F2',
                              boxShadow: '0 8px 24px rgba(107,63,94,0.20)',
                            }
                          : undefined
                      }
                      className={`group flex min-h-[44px] items-center gap-3 rounded-xl px-3 py-2.5 font-body text-sm transition outline-none focus-visible:ring-2 focus-visible:ring-[color:rgb(107_63_94_/_0.22)] ${
                        isActive
                          ? ''
                          : 'text-foreground/80 hover:bg-[color:rgb(212_203_197_/_0.45)]'
                      }`}
                    >
                      <span
                        style={isActive ? { color: '#FAF7F2' } : undefined}
                        className={isActive ? '' : 'text-foreground/60'}
                      >
                        <NavIcon kind={item.icon} />
                      </span>
                      <span className="flex-1 font-medium tracking-[0.01em]">
                        {item.label}
                      </span>
                      {item.badge ? (
                        <span
                          style={
                            isActive
                              ? {
                                  backgroundColor: 'rgba(250,247,242,0.20)',
                                  color: '#FAF7F2',
                                }
                              : undefined
                          }
                          className={`rounded-full px-2 py-0.5 font-body text-[11px] font-medium tabular-nums ${
                            isActive ? '' : 'text-muted-foreground'
                          }`}
                        >
                          {item.badge}
                        </span>
                      ) : null}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
        <div className="mt-auto space-y-1">
          <Link
            href="#"
            aria-disabled="true"
            className="group flex min-h-[44px] items-center gap-3 rounded-xl px-3 py-2.5 font-body text-sm text-foreground/80 transition outline-none hover:bg-[color:rgb(212_203_197_/_0.45)] focus-visible:ring-2 focus-visible:ring-[color:rgb(107_63_94_/_0.22)]"
          >
            <span className="text-foreground/60">
              <SettingsIcon />
            </span>
            <span className="font-medium tracking-[0.01em]">Settings</span>
          </Link>
        </div>
      </nav>
      <div className="m-4 flex items-center gap-3 rounded-2xl border border-[color:rgb(212_203_197_/_0.7)] bg-card/85 px-4 py-3 shadow-[0_4px_14px_rgba(61,53,48,0.05)]">
        <span
          aria-hidden="true"
          style={{ backgroundColor: '#6B3F5E', color: '#FAF7F2' }}
          className="flex h-10 w-10 items-center justify-center rounded-full font-body text-xs font-semibold tracking-[0.05em]"
        >
          {initials || 'NT'}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-body text-sm font-medium text-foreground">
            {displayName}
          </p>
          <p className="truncate font-body text-[11px] text-muted-foreground">
            {email}
          </p>
        </div>
      </div>
    </aside>
  );
}

function deriveDisplayName(email: string): string {
  const local = email.split('@')[0] ?? email;
  // Strip trailing digits, split on common separators, titlecase each part.
  const cleaned = local
    .replace(/\d+$/, '')
    .replace(/[._-]+/g, ' ')
    .trim();
  if (!cleaned) return 'Studio Owner';
  return cleaned
    .split(/\s+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
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

  const displayName = session.name ?? deriveDisplayName(session.email);

  return (
    <div className="flex h-screen bg-background">
      <Sidebar displayName={displayName} email={session.email} />
      <main className="flex-1 overflow-x-hidden overflow-y-auto px-8 py-8 lg:px-12 lg:py-10">
        {children}
      </main>
    </div>
  );
}
