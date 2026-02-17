import { describe, it, expect } from 'vitest';

describe('TypeScript setup', () => {
  it('should compile and run TypeScript tests', () => {
    expect(true).toBe(true);
  });

  it('should support type imports', async () => {
    const types = await import('../../types/index');
    expect(types).toBeDefined();
  });
});
