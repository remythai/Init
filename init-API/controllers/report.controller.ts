import type { Request, Response } from 'express';
import { success, created } from '../utils/responses.js';
import { ReportService } from '../services/report.service.js';
import type { ReportStatus } from '../types/index.js';

export const ReportController = {
  async createReport(req: Request, res: Response): Promise<void> {
    const eventId = parseInt(req.params.id);
    const result = await ReportService.createReport(eventId, req.user!.id, req.body);
    created(res, result, 'Signalement envoyé');
  },

  async getReports(req: Request, res: Response): Promise<void> {
    const eventId = parseInt(req.params.id);
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const offset = parseInt(req.query.offset as string) || 0;
    const result = await ReportService.getReports(req.user!.id, eventId, (req.query.status as ReportStatus) || null, limit, offset);
    success(res, result);
  },

  async getReportDetails(req: Request, res: Response): Promise<void> {
    const eventId = parseInt(req.params.id);
    const reportId = parseInt(req.params.reportId);
    const result = await ReportService.getReportDetails(req.user!.id, eventId, reportId);
    success(res, result);
  },

  async updateReport(req: Request, res: Response): Promise<void> {
    const eventId = parseInt(req.params.id);
    const reportId = parseInt(req.params.reportId);
    const result = await ReportService.updateReport(req.user!.id, eventId, reportId, req.body);
    success(res, result, 'Signalement mis à jour');
  }
};
