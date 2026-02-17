import { describe, it, expect, vi } from 'vitest';
import { success, created, noContent } from '../../utils/responses';

function mockRes() {
  const res: any = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  res.send = vi.fn().mockReturnValue(res);
  return res;
}

describe('success', () => {
  it('should return 200 with data and message', () => {
    const res = mockRes();
    success(res, { id: 1 }, 'OK');
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: 'OK',
      data: { id: 1 }
    });
  });

  it('should return 200 without message when null', () => {
    const res = mockRes();
    success(res, { id: 1 });
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: { id: 1 }
    });
  });

  it('should allow custom status code', () => {
    const res = mockRes();
    success(res, null, 'Accepted', 202);
    expect(res.status).toHaveBeenCalledWith(202);
  });

  it('should omit data when falsy', () => {
    const res = mockRes();
    success(res, null, 'done');
    const body = res.json.mock.calls[0][0];
    expect(body.data).toBeUndefined();
  });
});

describe('created', () => {
  it('should return 201 with default message', () => {
    const res = mockRes();
    created(res, { id: 5 });
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: 'Created with success',
      data: { id: 5 }
    });
  });

  it('should accept custom message', () => {
    const res = mockRes();
    created(res, { id: 5 }, 'Utilisateur créé');
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      message: 'Utilisateur créé'
    }));
  });
});

describe('noContent', () => {
  it('should return 204 with no body', () => {
    const res = mockRes();
    noContent(res);
    expect(res.status).toHaveBeenCalledWith(204);
    expect(res.send).toHaveBeenCalled();
  });
});
