import React, { type ReactElement, useState } from 'react';

import { assertUnreachableShape, type NailShape } from '@/lib/types';

type Theme = 'flat' | 'line-art';

const SHAPE_PATHS: Record<NailShape, string> = {
  almond:
    'M 12 138 Q 8 60 50 4 Q 92 60 88 138 Q 88 140 84 140 L 16 140 Q 12 140 12 138 Z',
  coffin:
    'M 12 138 L 18 50 Q 20 14 34 8 L 66 8 Q 80 14 82 50 L 88 138 Q 88 140 84 140 L 16 140 Q 12 140 12 138 Z',
  square:
    'M 14 138 L 14 22 Q 14 8 26 8 L 74 8 Q 86 8 86 22 L 86 138 Q 86 140 82 140 L 18 140 Q 14 140 14 138 Z',
  round:
    'M 14 138 L 14 60 Q 14 16 50 16 Q 86 16 86 60 L 86 138 Q 86 140 82 140 L 18 140 Q 14 140 14 138 Z',
  oval: 'M 14 138 Q 14 50 50 8 Q 86 50 86 138 Q 86 140 82 140 L 18 140 Q 14 140 14 138 Z',
  stiletto:
    'M 14 138 Q 22 80 50 2 Q 78 80 86 138 Q 86 140 82 140 L 18 140 Q 14 140 14 138 Z',
};

interface AnchorDef {
  id: string;
  transform: string;
  w: number;
  h: number;
}

const NAIL_ANCHORS: AnchorDef[] = [
  {
    id: 'thumb',
    transform: 'translate(115 200) rotate(-8 115 150.5) scale(2.30 2.15)',
    w: 230,
    h: 301,
  },
  {
    id: 'index',
    transform: 'translate(345 100) rotate(-3 100 140) scale(2.0 2.0)',
    w: 200,
    h: 280,
  },
  {
    id: 'middle',
    transform: 'translate(540 50) rotate(0 100 140) scale(2.0 2.0)',
    w: 200,
    h: 280,
  },
  {
    id: 'ring',
    transform: 'translate(735 90) rotate(3 100 140) scale(2.0 2.0)',
    w: 200,
    h: 280,
  },
  {
    id: 'pinky',
    transform: 'translate(968 205) rotate(8 82.5 115.5) scale(1.65 1.65)',
    w: 165,
    h: 231,
  },
];

function themeClass(theme: Theme): string {
  switch (theme) {
    case 'flat':
      return 'nail-visualizer-theme-flat';
    case 'line-art':
      return 'nail-visualizer-theme-line-art';
    default:
      return assertUnreachableShape(theme);
  }
}

export interface NailVisualizerProps {
  theme: Theme;
  imageUrl: string | null;
  nailShape: NailShape;
  onImageError?: () => void;
}

export function NailVisualizer({
  theme,
  imageUrl,
  nailShape,
  onImageError,
}: NailVisualizerProps): ReactElement {
  const [imgError, setImgError] = useState(false);
  const clipId = `nail-tip-${nailShape}`;
  const shapePath = SHAPE_PATHS[nailShape];

  function handleImageError() {
    setImgError(true);
    console.error(`NailVisualizer: image load failed for url=${imageUrl}`);
    onImageError?.();
  }

  const showFallback = imageUrl === null || imgError;

  return (
    <div className={themeClass(theme)}>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 1280 540"
        width="1280"
        height="540"
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label="Five nail canvas"
      >
        <defs>
          <clipPath id={clipId} clipPathUnits="userSpaceOnUse">
            <path d={shapePath} />
          </clipPath>
        </defs>

        {NAIL_ANCHORS.map((anchor) => (
          <g
            key={anchor.id}
            id={`nail-${anchor.id}`}
            transform={anchor.transform}
          >
            {showFallback ? null : (
              <image
                href={imageUrl!}
                x={0}
                y={0}
                width={100}
                height={140}
                preserveAspectRatio="xMidYMid slice"
                clipPath={`url(#${clipId})`}
                data-testid="nail-image"
                onError={handleImageError}
              />
            )}
            <path
              d={shapePath}
              fill="none"
              stroke="var(--nail-outline-color, #8c7e78)"
              strokeWidth={1.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </g>
        ))}

        {showFallback && (
          <rect
            data-testid="visualizer-fallback"
            x={0}
            y={0}
            width={1280}
            height={540}
            fill="none"
          />
        )}
      </svg>
    </div>
  );
}
