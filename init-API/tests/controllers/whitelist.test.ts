import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => {
  process.env.DB_USER = 'test';
  process.env.DB_HOST = 'localhost';
  process.env.DB_NAME = 'testdb';
  process.env.DB_PASSWORD = 'testpass';
  process.env.JWT_SECRET = 'testsecret_long_enough_for_32chars!';

  return {
    WhitelistService: {
      list: vi.fn(),
      addPhone: vi.fn(),
      updatePhone: vi.fn(),
      removePhone: vi.fn(),
      reactivate: vi.fn(),
      previewImport: vi.fn(),
      importFile: vi.fn(),
      bulkRemove: vi.fn(),
    },
    successFn: vi.fn(),
    createdFn: vi.fn(),
  };
});

vi.mock('../../services/whitelist.service.js', () => ({ WhitelistService: mocks.WhitelistService }));
vi.mock('../../utils/responses.js', () => ({ success: mocks.successFn, created: mocks.createdFn }));
vi.mock('../../utils/errors.js', async () => {
  const actual = await vi.importActual<typeof import('../../utils/errors.js')>('../../utils/errors.js');
  return actual;
});

import { WhitelistController } from '../../controllers/whitelist.controller';

function mockReq(overrides: Record<string, unknown> = {}) {
  return {
    user: { id: 1 },
    params: { id: '5', phone: '%2B33612345678' },
    query: {},
    body: {},
    ...overrides,
  };
}

const res = {} as any;

describe('WhitelistController', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('list', () => {
    it('should delegate to WhitelistService.list with parsed params', async () => {
      const result = { event_id: 5, count: 1, entries: [{ id: 1 }] };
      mocks.WhitelistService.list.mockResolvedValueOnce(result);

      const req = mockReq({ query: {} });
      await WhitelistController.list(req as any, res);

      expect(mocks.WhitelistService.list).toHaveBeenCalledWith(1, 5, false, 50, 0);
      expect(mocks.successFn).toHaveBeenCalledWith(res, result);
    });

    it('should pass include_removed=true from query', async () => {
      mocks.WhitelistService.list.mockResolvedValueOnce({ event_id: 5, count: 0, entries: [] });

      const req = mockReq({ query: { include_removed: 'true' } });
      await WhitelistController.list(req as any, res);

      expect(mocks.WhitelistService.list).toHaveBeenCalledWith(1, 5, true, 50, 0);
    });

    it('should cap limit at 100', async () => {
      mocks.WhitelistService.list.mockResolvedValueOnce({ event_id: 5, count: 0, entries: [] });

      const req = mockReq({ query: { limit: '200', offset: '10' } });
      await WhitelistController.list(req as any, res);

      expect(mocks.WhitelistService.list).toHaveBeenCalledWith(1, 5, false, 100, 10);
    });
  });

  describe('addPhone', () => {
    it('should call created() for new entry', async () => {
      mocks.WhitelistService.addPhone.mockResolvedValueOnce({
        data: { id: 10, phone: '+33612345678', status: 'active', source: 'manual' },
        message: 'Numéro ajouté à la whitelist',
        isNew: true,
      });

      const req = mockReq({ body: { phone: '+33612345678' } });
      await WhitelistController.addPhone(req as any, res);

      expect(mocks.WhitelistService.addPhone).toHaveBeenCalledWith(1, 5, '+33612345678');
      expect(mocks.createdFn).toHaveBeenCalledWith(
        res,
        { id: 10, phone: '+33612345678', status: 'active', source: 'manual' },
        'Numéro ajouté à la whitelist'
      );
    });

    it('should call success() for existing entry', async () => {
      mocks.WhitelistService.addPhone.mockResolvedValueOnce({
        data: { phone: '+33612345678', status: 'active' },
        message: 'Numéro déjà présent',
        isNew: false,
      });

      const req = mockReq({ body: { phone: '+33612345678' } });
      await WhitelistController.addPhone(req as any, res);

      expect(mocks.successFn).toHaveBeenCalledWith(
        res,
        { phone: '+33612345678', status: 'active' },
        'Numéro déjà présent'
      );
    });

    it('should call success() for reactivated entry', async () => {
      mocks.WhitelistService.addPhone.mockResolvedValueOnce({
        data: { id: 1, phone: '+33612345678', status: 'active', reactivated: true },
        message: 'Numéro réactivé',
        isNew: false,
      });

      const req = mockReq({ body: { phone: '+33612345678' } });
      await WhitelistController.addPhone(req as any, res);

      expect(mocks.successFn).toHaveBeenCalledWith(
        res,
        { id: 1, phone: '+33612345678', status: 'active', reactivated: true },
        'Numéro réactivé'
      );
    });
  });

  describe('updatePhone', () => {
    it('should delegate to WhitelistService.updatePhone', async () => {
      const result = { id: 1, phone: '+33699999999', status: 'active' };
      mocks.WhitelistService.updatePhone.mockResolvedValueOnce(result);

      const req = mockReq({ body: { phone: '+33699999999' } });
      await WhitelistController.updatePhone(req as any, res);

      expect(mocks.WhitelistService.updatePhone).toHaveBeenCalledWith(1, 5, '+33612345678', '+33699999999');
      expect(mocks.successFn).toHaveBeenCalledWith(res, result, 'Numéro mis à jour');
    });
  });

  describe('removePhone', () => {
    it('should soft remove by default', async () => {
      mocks.WhitelistService.removePhone.mockResolvedValueOnce({
        data: { phone: '+33612345678', permanent: false, user_affected: true },
        message: 'Numéro retiré de la whitelist (matches archivés)',
      });

      const req = mockReq({ query: {} });
      await WhitelistController.removePhone(req as any, res);

      expect(mocks.WhitelistService.removePhone).toHaveBeenCalledWith(1, 5, '+33612345678', false);
      expect(mocks.successFn).toHaveBeenCalledWith(
        res,
        { phone: '+33612345678', permanent: false, user_affected: true },
        'Numéro retiré de la whitelist (matches archivés)'
      );
    });

    it('should permanently delete when permanent=true', async () => {
      mocks.WhitelistService.removePhone.mockResolvedValueOnce({
        data: { phone: '+33612345678', permanent: true, user_affected: false },
        message: 'Numéro et données associées supprimés définitivement',
      });

      const req = mockReq({ query: { permanent: 'true' } });
      await WhitelistController.removePhone(req as any, res);

      expect(mocks.WhitelistService.removePhone).toHaveBeenCalledWith(1, 5, '+33612345678', true);
      expect(mocks.successFn).toHaveBeenCalledWith(
        res,
        { phone: '+33612345678', permanent: true, user_affected: false },
        'Numéro et données associées supprimés définitivement'
      );
    });
  });

  describe('reactivate', () => {
    it('should delegate to WhitelistService.reactivate', async () => {
      const result = { id: 1, phone: '+33612345678', status: 'active' };
      mocks.WhitelistService.reactivate.mockResolvedValueOnce(result);

      const req = mockReq();
      await WhitelistController.reactivate(req as any, res);

      expect(mocks.WhitelistService.reactivate).toHaveBeenCalledWith(1, 5, '+33612345678');
      expect(mocks.successFn).toHaveBeenCalledWith(res, result, 'Numéro réactivé');
    });
  });

  describe('previewImport', () => {
    it('should delegate to WhitelistService.previewImport', async () => {
      const csvData = { headers: [{ index: 0, name: 'phone' }], preview: [['+33612345678']], totalRows: 1, delimiter: ';' };
      mocks.WhitelistService.previewImport.mockResolvedValueOnce(csvData);

      const req = mockReq({ body: { content: 'phone\n+33612345678' } });
      await WhitelistController.previewImport(req as any, res);

      expect(mocks.WhitelistService.previewImport).toHaveBeenCalledWith(1, 5, 'phone\n+33612345678');
      expect(mocks.successFn).toHaveBeenCalledWith(res, csvData);
    });
  });

  describe('importFile', () => {
    it('should delegate to WhitelistService.importFile', async () => {
      const result = {
        stats: { total: 1, added: 1, skipped_duplicate: 0, skipped_removed: 0, invalid: 0 },
        errors: undefined,
        message: 'Import terminé: 1 ajoutés, 0 doublons, 0 précédemment supprimés, 0 invalides',
      };
      mocks.WhitelistService.importFile.mockResolvedValueOnce(result);

      const req = mockReq({ body: { content: '+33612345678', format: 'csv' } });
      await WhitelistController.importFile(req as any, res);

      expect(mocks.WhitelistService.importFile).toHaveBeenCalledWith(1, 5, '+33612345678', 'csv', undefined);
      expect(mocks.successFn).toHaveBeenCalledWith(res, result);
    });

    it('should pass columnIndex when provided', async () => {
      const result = {
        stats: { total: 1, added: 1, skipped_duplicate: 0, skipped_removed: 0, invalid: 0 },
        errors: undefined,
        message: 'Import terminé: 1 ajoutés, 0 doublons, 0 précédemment supprimés, 0 invalides',
      };
      mocks.WhitelistService.importFile.mockResolvedValueOnce(result);

      const req = mockReq({ body: { content: 'data', format: 'csv', columnIndex: 1 } });
      await WhitelistController.importFile(req as any, res);

      expect(mocks.WhitelistService.importFile).toHaveBeenCalledWith(1, 5, 'data', 'csv', 1);
    });
  });

  describe('bulkRemove', () => {
    it('should delegate to WhitelistService.bulkRemove', async () => {
      const result = {
        stats: { total: 2, removed: 1, not_found: 1, errors: [] },
        message: 'Retrait: 1 retirés, 1 non trouvés',
      };
      mocks.WhitelistService.bulkRemove.mockResolvedValueOnce(result);

      const req = mockReq({ body: { phones: ['+33612345678', '+33699999999'] } });
      await WhitelistController.bulkRemove(req as any, res);

      expect(mocks.WhitelistService.bulkRemove).toHaveBeenCalledWith(1, 5, ['+33612345678', '+33699999999'], false);
      expect(mocks.successFn).toHaveBeenCalledWith(
        res,
        { stats: { total: 2, removed: 1, not_found: 1, errors: [] } },
        'Retrait: 1 retirés, 1 non trouvés'
      );
    });

    it('should pass permanent=true', async () => {
      const result = {
        stats: { total: 1, removed: 1, not_found: 0, errors: [] },
        message: 'Suppression définitive: 1 supprimés, 0 non trouvés',
      };
      mocks.WhitelistService.bulkRemove.mockResolvedValueOnce(result);

      const req = mockReq({ body: { phones: ['+33612345678'], permanent: true } });
      await WhitelistController.bulkRemove(req as any, res);

      expect(mocks.WhitelistService.bulkRemove).toHaveBeenCalledWith(1, 5, ['+33612345678'], true);
    });
  });
});
