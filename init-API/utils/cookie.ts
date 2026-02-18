import type { Response, CookieOptions } from 'express';

export const REFRESH_COOKIE_OPTIONS: CookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  path: '/api',
  maxAge: 7 * 24 * 60 * 60 * 1000
};

export function setRefreshCookie(res: Response, refreshToken: string): void {
  res.cookie('refreshToken', refreshToken, REFRESH_COOKIE_OPTIONS);
}

export function clearRefreshCookie(res: Response): void {
  res.clearCookie('refreshToken', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/api'
  });
}
