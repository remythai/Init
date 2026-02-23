import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => {
  process.env.DB_USER = 'test';
  process.env.DB_HOST = 'localhost';
  process.env.DB_NAME = 'testdb';
  process.env.DB_PASSWORD = 'testpass';
  process.env.JWT_SECRET = 'testsecret_long_enough_for_32chars!';

  return {
    ReportService: {
      createReport: vi.fn(),
      getReports: vi.fn(),
      getReportDetails: vi.fn(),
      updateReport: vi.fn(),
    },
    successFn: vi.fn(),
    createdFn: vi.fn(),
  };
});

vi.mock('../../services/report.service.js', () => ({ ReportService: mocks.ReportService }));
vi.mock('../../utils/responses.js', () => ({ success: mocks.successFn, created: mocks.createdFn }));
vi.mock('../../utils/errors.js', async () => {
  const actual = await vi.importActual<typeof import('../../utils/errors.js')>('../../utils/errors.js');
  return actual;
});

import { ReportController } from '../../controllers/report.controller';

function mockReq(overrides: Record<string, unknown> = {}) {
  return {
    user: { id: 1 },
    params: { id: '5', reportId: '10' },
    query: {},
    body: {},
    ...overrides,
  };
}

const res = {} as any;

describe('ReportController', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createReport', () => {
    it('should delegate to ReportService.createReport and call created()', async () => {
      const result = { id: 42, report_type: 'photo', reason: 'inappropriate', status: 'pending' };
      mocks.ReportService.createReport.mockResolvedValueOnce(result);

      const req = mockReq({
        params: { id: '5' },
        body: { reportedUserId: 2, reportType: 'photo', reason: 'inappropriate', description: 'Bad' },
      });
      await ReportController.createReport(req as any, res);

      expect(mocks.ReportService.createReport).toHaveBeenCalledWith(5, 1, req.body);
      expect(mocks.createdFn).toHaveBeenCalledWith(res, result, 'Signalement envoyé');
    });

    it('should propagate errors from service', async () => {
      const { ValidationError } = await import('../../utils/errors.js');
      mocks.ReportService.createReport.mockRejectedValueOnce(new ValidationError('Type de signalement invalide'));

      const req = mockReq({ body: { reportedUserId: 2, reportType: 'invalid' } });
      await expect(ReportController.createReport(req as any, res)).rejects.toThrow('Type de signalement invalide');
    });
  });

  describe('getReports', () => {
    it('should delegate to ReportService.getReports with parsed params', async () => {
      const result = { stats: {}, reports: [] };
      mocks.ReportService.getReports.mockResolvedValueOnce(result);

      const req = mockReq({ query: { status: 'pending' } });
      await ReportController.getReports(req as any, res);

      expect(mocks.ReportService.getReports).toHaveBeenCalledWith(1, 5, 'pending', 50, 0);
      expect(mocks.successFn).toHaveBeenCalledWith(res, result);
    });

    it('should pass null status when query is empty', async () => {
      mocks.ReportService.getReports.mockResolvedValueOnce({ stats: {}, reports: [] });

      const req = mockReq({ query: {} });
      await ReportController.getReports(req as any, res);

      expect(mocks.ReportService.getReports).toHaveBeenCalledWith(1, 5, null, 50, 0);
    });

    it('should cap limit at 100', async () => {
      mocks.ReportService.getReports.mockResolvedValueOnce({ stats: {}, reports: [] });

      const req = mockReq({ query: { limit: '200', offset: '10' } });
      await ReportController.getReports(req as any, res);

      expect(mocks.ReportService.getReports).toHaveBeenCalledWith(1, 5, null, 100, 10);
    });
  });

  describe('getReportDetails', () => {
    it('should delegate to ReportService.getReportDetails', async () => {
      const result = { id: 10, report_type: 'photo' };
      mocks.ReportService.getReportDetails.mockResolvedValueOnce(result);

      const req = mockReq();
      await ReportController.getReportDetails(req as any, res);

      expect(mocks.ReportService.getReportDetails).toHaveBeenCalledWith(1, 5, 10);
      expect(mocks.successFn).toHaveBeenCalledWith(res, result);
    });
  });

  describe('updateReport', () => {
    it('should delegate to ReportService.updateReport', async () => {
      const result = { id: 10, status: 'resolved', orga_notes: 'Done', reviewed_at: null, resolved_at: '2025-01-02' };
      mocks.ReportService.updateReport.mockResolvedValueOnce(result);

      const req = mockReq({ body: { status: 'resolved', orga_notes: 'Done' } });
      await ReportController.updateReport(req as any, res);

      expect(mocks.ReportService.updateReport).toHaveBeenCalledWith(1, 5, 10, req.body);
      expect(mocks.successFn).toHaveBeenCalledWith(res, result, 'Signalement mis à jour');
    });
  });
});
