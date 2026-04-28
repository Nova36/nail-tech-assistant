import React from 'react';

const PLACEHOLDER_WIDTHS = [
  'w-3/4',
  'w-2/3',
  'w-4/5',
  'w-3/4',
  'w-2/3',
  'w-4/5',
];
const META_WIDTHS = ['w-1/4', 'w-1/3', 'w-1/4', 'w-1/3', 'w-1/4', 'w-1/3'];

export function BoardGridSkeleton() {
  return (
    <>
      <section
        aria-busy="true"
        aria-labelledby="boards-heading"
        data-component="BoardGridSkeleton"
      >
        <ul
          role="list"
          className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 lg:gap-8"
        >
          {PLACEHOLDER_WIDTHS.map((titleWidth, index) => (
            <li
              key={index}
              className="overflow-hidden rounded-[28px] bg-card shadow-[0_12px_32px_rgba(61,53,48,0.08)]"
            >
              <div className="sk-v1 aspect-square" />
              <div className="space-y-3 p-6">
                <div className={`sk-v1 h-5 rounded-full ${titleWidth}`} />
                <div
                  className={`sk-v1 h-3 rounded-full ${META_WIDTHS[index]}`}
                />
              </div>
            </li>
          ))}
        </ul>
      </section>
      <style>{`
        .sk-v1 {
          background:
            linear-gradient(
              100deg,
              rgba(255, 255, 255, 0) 30%,
              rgba(255, 255, 255, 0.45) 50%,
              rgba(255, 255, 255, 0) 70%
            ),
            var(--card);
          background-size: 220% 100%;
          background-position: 120% 0;
          animation: sk-sweep 2.6s ease-in-out infinite;
        }

        @keyframes sk-sweep {
          0% {
            background-position: 120% 0;
          }
          100% {
            background-position: -120% 0;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .sk-v1 {
            animation: none !important;
            background: var(--card);
          }
        }
      `}</style>
    </>
  );
}
