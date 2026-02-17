import { describe, it, expect, vi } from 'vitest';
import { REFRESH_COOKIE_OPTIONS, setRefreshCookie, clearRefreshCookie } from '../../utils/cookie';

describe('REFRESH_COOKIE_OPTIONS', () => {
  it('should be httpOnly', () => {
    expect(REFRESH_COOKIE_OPTIONS.httpOnly).toBe(true);
  });

  it('should have sameSite lax', () => {
    expect(REFRESH_COOKIE_OPTIONS.sameSite).toBe('lax');
  });

  it('should scope to /api path', () => {
    expect(REFRESH_COOKIE_OPTIONS.path).toBe('/api');
  });

  it('should have 7 days maxAge', () => {
    expect(REFRESH_COOKIE_OPTIONS.maxAge).toBe(7 * 24 * 60 * 60 * 1000);
  });
});

describe('setRefreshCookie', () => {
  it('should call res.cookie with token and options', () => {
    const res = { cookie: vi.fn() } as any;
    setRefreshCookie(res, 'my-token');
    expect(res.cookie).toHaveBeenCalledWith('refreshToken', 'my-token', REFRESH_COOKIE_OPTIONS);
  });
});

describe('clearRefreshCookie', () => {
  it('should call res.clearCookie with correct options', () => {
    const res = { clearCookie: vi.fn() } as any;
    clearRefreshCookie(res);
    expect(res.clearCookie).toHaveBeenCalledWith('refreshToken', {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      path: '/api'
    });
  });
});
