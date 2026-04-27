import { cookies } from 'next/headers';
import Link from 'next/link';

import { getSessionFromCookieString } from '@/lib/firebase/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function deriveDisplayName(email: string): string {
  const local = email.split('@')[0] ?? email;
  const cleaned = local
    .replace(/\d+$/, '')
    .replace(/[._-]+/g, ' ')
    .trim();
  if (!cleaned) return 'there';
  return cleaned
    .split(/\s+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
}

function timeOfDayGreeting(date: Date): string {
  const hour = date.getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

const WEEKDAYS = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

function PlusIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="h-6 w-6"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
    >
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function ArrowRightIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5 12h14M13 5l7 7-7 7" />
    </svg>
  );
}

function GalleryStack() {
  const cards = [
    {
      label: 'Mulberry Chrome',
      tilt: '-rotate-6 -translate-x-6 translate-y-3',
      gradient:
        'linear-gradient(160deg, #C9B4C9 0%, #8C6F8C 70%, #4A3148 100%)',
    },
    {
      label: 'Champagne',
      tilt: '-rotate-2 -translate-x-2 translate-y-1',
      gradient:
        'linear-gradient(160deg, #F0E1C8 0%, #D4B896 70%, #A88C5C 100%)',
    },
    {
      label: 'Soft Mauve Tips',
      tilt: 'rotate-0',
      gradient:
        'linear-gradient(160deg, #E8D5E0 0%, #C9A4B8 60%, #8C5C7A 100%)',
    },
    {
      label: 'Coral Accents',
      tilt: 'rotate-3 translate-x-2 translate-y-1',
      gradient:
        'linear-gradient(160deg, #F0C8B8 0%, #D89880 70%, #A8624A 100%)',
    },
    {
      label: 'Ivory & Blush',
      tilt: 'rotate-6 translate-x-6 translate-y-3',
      gradient:
        'linear-gradient(160deg, #F5E8E0 0%, #E0C0B8 60%, #B8908C 100%)',
    },
  ];
  return (
    <div className="relative mx-auto flex h-[200px] w-full max-w-[420px] items-center justify-center">
      {cards.map((card, i) => (
        <div
          key={card.label}
          aria-hidden="true"
          className={`absolute flex h-[180px] w-[120px] flex-col justify-end rounded-[20px] p-3 shadow-[0_10px_30px_rgba(61,53,48,0.18)] transition ${card.tilt}`}
          style={{
            background: card.gradient,
            zIndex: i === 2 ? 5 : Math.abs(i - 2) === 1 ? 3 : 1,
          }}
        >
          <span className="rounded-full bg-background/85 px-2.5 py-1 text-center font-body text-[10px] font-medium text-foreground shadow-[0_2px_6px_rgba(61,53,48,0.10)]">
            {card.label}
          </span>
        </div>
      ))}
    </div>
  );
}

type KpiTile = {
  label: string;
  value: string;
  unit: string;
};

const KPI_TILES: KpiTile[] = [
  { label: 'This week', value: '12', unit: 'sets booked' },
  { label: 'Saved this month', value: '7', unit: 'new designs' },
  { label: 'Running low', value: '3', unit: 'polishes' },
];

export default async function AuthenticatedHomePage() {
  const cookieStore = await cookies();
  const session = await getSessionFromCookieString(
    cookieStore.get('session')?.value
  );
  const fullName = session
    ? (session.name ?? deriveDisplayName(session.email))
    : 'there';
  const firstName = fullName.split(' ')[0] ?? fullName;

  const now = new Date();
  const greeting = timeOfDayGreeting(now);
  const weekday = WEEKDAYS[now.getDay()];

  return (
    <div className="mx-auto max-w-[1180px] space-y-10">
      <header className="space-y-3">
        <p className="font-body text-[11px] font-medium uppercase tracking-[0.28em] text-muted-foreground">
          {greeting} · {weekday}
        </p>
        <h1 className="font-heading-display text-5xl font-light tracking-[-0.03em] text-foreground sm:text-6xl">
          Hello, <span className="italic text-primary">{firstName}.</span>
        </h1>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
        <article
          className="relative flex min-h-[420px] flex-col justify-between overflow-hidden rounded-[28px] p-8 shadow-[0_18px_44px_rgba(61,53,48,0.12)]"
          style={{ background: 'var(--gradient-signature)' }}
        >
          <div className="flex items-start justify-between gap-4">
            <p className="font-body text-[11px] font-medium uppercase tracking-[0.24em] text-foreground/70">
              — Start Fresh
            </p>
            <span
              aria-hidden="true"
              className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-[0_8px_20px_rgba(61,53,48,0.18)]"
            >
              <PlusIcon />
            </span>
          </div>

          <div className="space-y-4">
            <h2 className="font-heading-display text-6xl font-light tracking-[-0.04em] text-foreground sm:text-7xl">
              New <span className="italic text-primary">design</span>
            </h2>
            <p className="max-w-md font-body text-sm leading-7 text-foreground/80">
              Open a blank canvas — sketch a set from scratch, pick palette
              &amp; finish, and save it to your studio.
            </p>
          </div>

          <div className="space-y-5">
            <div className="flex flex-wrap gap-2">
              {['Sketch', 'Palette', 'Generate with AI'].map((chip) => (
                <span
                  key={chip}
                  className="rounded-full bg-background/80 px-4 py-2 font-body text-[12px] font-medium text-foreground shadow-[0_2px_6px_rgba(61,53,48,0.08)]"
                >
                  {chip}
                </span>
              ))}
            </div>
            <Link
              href="#"
              aria-disabled="true"
              data-state="placeholder"
              className="inline-flex min-h-[44px] items-center gap-3 rounded-full bg-background px-6 py-3 font-body text-sm font-medium text-primary shadow-[0_6px_16px_rgba(61,53,48,0.10)] outline-none transition hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-[color:rgb(107_63_94_/_0.28)]"
            >
              Start a new design <ArrowRightIcon />
            </Link>
          </div>
        </article>

        <article className="flex min-h-[420px] flex-col justify-between rounded-[28px] border border-dashed border-[color:rgb(107_63_94_/_0.30)] bg-background/60 p-8 shadow-[0_8px_28px_rgba(61,53,48,0.06)]">
          <div className="space-y-3">
            <p className="font-body text-[11px] font-medium uppercase tracking-[0.24em] text-muted-foreground">
              — Your Gallery
            </p>
            <h2 className="font-heading-display text-5xl font-light tracking-[-0.03em] text-foreground sm:text-6xl">
              My <span className="italic text-primary">designs</span>
            </h2>
            <p className="max-w-md font-body text-sm leading-7 text-muted-foreground">
              Revisit saved sets, browse favorites, and re-apply a look for a
              returning client.
            </p>
          </div>

          <GalleryStack />

          <div className="flex flex-wrap items-center justify-between gap-4">
            <p className="font-body text-sm text-muted-foreground">
              <span className="font-semibold text-foreground tabular-nums">
                124 designs
              </span>{' '}
              saved · 18 favorites
            </p>
            <Link
              href="#"
              aria-disabled="true"
              data-state="placeholder"
              className="inline-flex min-h-[44px] items-center gap-3 rounded-full border border-[color:rgb(107_63_94_/_0.30)] bg-background px-6 py-3 font-body text-sm font-medium text-primary outline-none transition hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-[color:rgb(107_63_94_/_0.28)]"
            >
              Browse gallery <ArrowRightIcon />
            </Link>
          </div>
        </article>
      </div>

      <section
        aria-label="Studio summary"
        className="grid gap-4 rounded-[24px] border border-[color:rgb(212_203_197_/_0.6)] bg-card/60 p-6 sm:grid-cols-[1fr_1fr_1fr_auto]"
      >
        {KPI_TILES.map((tile, index) => (
          <div
            key={tile.label}
            className={`space-y-2 sm:pr-4 ${index < KPI_TILES.length - 1 ? 'sm:border-r sm:border-[color:rgb(212_203_197_/_0.5)]' : ''}`}
          >
            <p className="font-body text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
              {tile.label}
            </p>
            <p className="font-heading-display text-3xl font-light tracking-[-0.02em] text-foreground tabular-nums">
              {tile.value}
              <span className="ml-2 font-body text-sm font-normal tracking-normal text-muted-foreground">
                {tile.unit}
              </span>
            </p>
          </div>
        ))}
        <Link
          href="#"
          aria-disabled="true"
          data-state="placeholder"
          className="inline-flex min-h-[44px] items-center justify-center gap-2 self-center rounded-full px-4 py-2 font-body text-sm font-medium text-primary outline-none transition hover:bg-[color:rgb(107_63_94_/_0.06)] focus-visible:ring-2 focus-visible:ring-[color:rgb(107_63_94_/_0.28)]"
        >
          View studio <ArrowRightIcon />
        </Link>
      </section>
    </div>
  );
}
