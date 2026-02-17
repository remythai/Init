import type { Response } from 'express';

export const success = <T>(res: Response, data?: T, message: string | null = null, statusCode = 200): Response => {
  const response: { success: true; message?: string; data?: T } = { success: true };
  if (message) response.message = message;
  if (data) response.data = data;
  return res.status(statusCode).json(response);
};

export const created = <T>(res: Response, data?: T, message = 'Created with success'): Response => {
  return success(res, data, message, 201);
};

export const noContent = (res: Response): Response => {
  return res.status(204).send();
};
