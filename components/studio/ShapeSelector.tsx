'use client';

import type { NailShape } from '@/lib/types';

type ShapeSelectorProps = {
  value: NailShape;
  onChange: (value: NailShape) => void;
};

const SHAPES: NailShape[] = [
  'almond',
  'coffin',
  'square',
  'round',
  'oval',
  'stiletto',
];

export function ShapeSelector({ value, onChange }: ShapeSelectorProps) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-foreground">Shape</p>
      <div className="flex flex-wrap gap-3">
        {SHAPES.map((shape) => {
          const isActive = shape === value;

          return (
            <button
              key={shape}
              type="button"
              onClick={() => onChange(shape)}
              className={`rounded-full px-4 py-2 text-sm capitalize transition ${
                isActive
                  ? 'bg-[color:var(--primary)] text-[color:var(--primary-foreground)]'
                  : 'border border-border bg-background text-foreground'
              }`}
              aria-pressed={isActive}
            >
              {shape}
            </button>
          );
        })}
      </div>
    </div>
  );
}
