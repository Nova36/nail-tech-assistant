import { describe, expect, it } from 'vitest';

import nextConfig from '@/next.config';

describe('next.config images.remotePatterns', () => {
  it('allows Firebase Storage signed URLs while preserving existing hosts', () => {
    const remotePatterns = nextConfig.images?.remotePatterns;

    expect(remotePatterns).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          protocol: 'https',
          hostname: 'i.pinimg.com',
        }),
        expect.objectContaining({
          protocol: 'https',
          hostname: 'storage.googleapis.com',
        }),
      ])
    );
  });

  it('uses https for every remote image host', () => {
    const remotePatterns = nextConfig.images?.remotePatterns;

    expect(remotePatterns).toBeDefined();
    expect(remotePatterns).toSatisfy((patterns) =>
      patterns.every(
        (pattern: { protocol?: string }) => pattern.protocol === 'https'
      )
    );
  });
});
