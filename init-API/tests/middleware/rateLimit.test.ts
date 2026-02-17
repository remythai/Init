import { describe, it, expect } from 'vitest';
import { authLimiter, registerLimiter, apiLimiter, uploadLimiter } from '../../middleware/rateLimit.middleware';

describe('rateLimit.middleware', () => {
  it('should export authLimiter', () => {
    expect(authLimiter).toBeDefined();
    expect(typeof authLimiter).toBe('function');
  });

  it('should export registerLimiter', () => {
    expect(registerLimiter).toBeDefined();
    expect(typeof registerLimiter).toBe('function');
  });

  it('should export apiLimiter', () => {
    expect(apiLimiter).toBeDefined();
    expect(typeof apiLimiter).toBe('function');
  });

  it('should export uploadLimiter', () => {
    expect(uploadLimiter).toBeDefined();
    expect(typeof uploadLimiter).toBe('function');
  });
});
