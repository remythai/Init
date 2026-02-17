import type { Request, Response } from 'express';
import { success, created } from '../utils/responses.js';
import { WhitelistService } from '../services/whitelist.service.js';

export const WhitelistController = {
  async list(req: Request, res: Response): Promise<void> {
    const eventId = parseInt(req.params.id);
    const includeRemoved = req.query.include_removed === 'true';
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const offset = parseInt(req.query.offset as string) || 0;
    const result = await WhitelistService.list(req.user!.id, eventId, includeRemoved, limit, offset);
    success(res, result);
  },

  async addPhone(req: Request, res: Response): Promise<void> {
    const eventId = parseInt(req.params.id);
    const result = await WhitelistService.addPhone(req.user!.id, eventId, req.body.phone);
    if (result.isNew) {
      created(res, result.data, result.message);
    } else {
      success(res, result.data, result.message);
    }
  },

  async updatePhone(req: Request, res: Response): Promise<void> {
    const eventId = parseInt(req.params.id);
    const oldPhone = decodeURIComponent(req.params.phone);
    const result = await WhitelistService.updatePhone(req.user!.id, eventId, oldPhone, req.body.phone);
    success(res, result, 'Numéro mis à jour');
  },

  async removePhone(req: Request, res: Response): Promise<void> {
    const eventId = parseInt(req.params.id);
    const phone = decodeURIComponent(req.params.phone);
    const permanent = req.query.permanent === 'true';
    const result = await WhitelistService.removePhone(req.user!.id, eventId, phone, permanent);
    success(res, result.data, result.message);
  },

  async reactivate(req: Request, res: Response): Promise<void> {
    const eventId = parseInt(req.params.id);
    const phone = decodeURIComponent(req.params.phone);
    const result = await WhitelistService.reactivate(req.user!.id, eventId, phone);
    success(res, result, 'Numéro réactivé');
  },

  async previewImport(req: Request, res: Response): Promise<void> {
    const eventId = parseInt(req.params.id);
    const result = await WhitelistService.previewImport(req.user!.id, eventId, req.body.content);
    success(res, result);
  },

  async importFile(req: Request, res: Response): Promise<void> {
    const eventId = parseInt(req.params.id);
    const result = await WhitelistService.importFile(req.user!.id, eventId, req.body.content, req.body.format, req.body.columnIndex);
    success(res, result);
  },

  async bulkRemove(req: Request, res: Response): Promise<void> {
    const eventId = parseInt(req.params.id);
    const result = await WhitelistService.bulkRemove(req.user!.id, eventId, req.body.phones, req.body.permanent || false);
    success(res, { stats: result.stats }, result.message);
  }
};
