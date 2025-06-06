import { LRUCache } from 'lru-cache';
import { NextResponse } from 'next/server';

export interface RateLimitOptions {
  interval: number;
  uniqueTokenPerInterval: number;
}

export interface RateLimiter {
  check: (request: Request, limit: number) => Promise<void>;
}

export function rateLimit(options: RateLimitOptions): RateLimiter {
  const tokenCache = new LRUCache({
    max: options.uniqueTokenPerInterval || 500,
    ttl: options.interval || 60000,
  });

  return {
    check: async (request: Request, limit: number): Promise<void> => {
      const ip = request.headers.get('x-forwarded-for') ||
                request.headers.get('x-real-ip') ||
                'unknown';
      
      const tokenCount = (tokenCache.get(ip) as number[]) || [0];
      
      if (tokenCount[0] === 0) {
        tokenCache.set(ip, [1]);
      } else {
        tokenCount[0] += 1;
        
        if (tokenCount[0] > limit) {
          throw new Error('Rate limit exceeded');
        }
        
        tokenCache.set(ip, tokenCount);
      }
    },
  };
} 