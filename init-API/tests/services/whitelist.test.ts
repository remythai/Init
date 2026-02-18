import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => {
  process.env.DB_USER = 'test';
  process.env.DB_HOST = 'localhost';
  process.env.DB_NAME = 'testdb';
  process.env.DB_PASSWORD = 'testpass';
  process.env.JWT_SECRET = 'testsecret';

  return {
    WhitelistModel: {
      getByEventId: vi.fn(),
      addPhone: vi.fn(),
      updatePhone: vi.fn(),
      softRemove: vi.fn(),
      permanentDelete: vi.fn(),
      reactivate: vi.fn(),
      addPhonesBulk: vi.fn(),
    },
    EventModel: {
      findById: vi.fn(),
    },
    normalizePhone: vi.fn().mockImplementation((p: string) => p),
    isValidPhone: vi.fn().mockReturnValue(true),
    parseCSVSimple: vi.fn().mockReturnValue(['+33612345678']),
    parseCSVWithColumn: vi.fn().mockReturnValue(['+33612345678']),
    getCSVHeaders: vi.fn().mockReturnValue({
      headers: [{ index: 0, name: 'phone' }],
      preview: [['+33612345678']],
      totalRows: 1,
      delimiter: ';',
    }),
    parseXML: vi.fn().mockReturnValue(['+33612345678']),
  };
});

vi.mock('../../models/whitelist.model.js', () => ({ WhitelistModel: mocks.WhitelistModel }));
vi.mock('../../models/event.model.js', () => ({ EventModel: mocks.EventModel }));
vi.mock('../../utils/phone.js', () => ({
  normalizePhone: mocks.normalizePhone,
  isValidPhone: mocks.isValidPhone,
}));
vi.mock('../../utils/fileParser.js', () => ({
  parseCSVSimple: mocks.parseCSVSimple,
  parseCSVWithColumn: mocks.parseCSVWithColumn,
  getCSVHeaders: mocks.getCSVHeaders,
  parseXML: mocks.parseXML,
}));
vi.mock('../../utils/errors.js', async () => {
  const actual = await vi.importActual<typeof import('../../utils/errors.js')>('../../utils/errors.js');
  return actual;
});

import { WhitelistService } from '../../services/whitelist.service';
import {
  ValidationError,
  NotFoundError,
  ForbiddenError,
} from '../../utils/errors';

async function expectError(
  fn: () => Promise<unknown>,
  ErrorClass: new (...args: any[]) => Error,
  message: string
) {
  try {
    await fn();
    expect.unreachable('Expected an error to be thrown');
  } catch (err: any) {
    expect(err.constructor.name).toBe(ErrorClass.name);
    expect(err.message).toBe(message);
  }
}

describe('WhitelistService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.normalizePhone.mockImplementation((p: string) => p);
    mocks.isValidPhone.mockReturnValue(true);
  });

  describe('verifyEventOwnership (via list)', () => {
    it('should throw NotFoundError when event does not exist', async () => {
      mocks.EventModel.findById.mockResolvedValueOnce(undefined);

      await expectError(
        () => WhitelistService.list(1, 1, false, 50, 0),
        NotFoundError,
        'Événement non trouvé'
      );
    });

    it('should throw ForbiddenError when orga does not own the event', async () => {
      mocks.EventModel.findById.mockResolvedValueOnce({ id: 1, orga_id: 99 });

      await expectError(
        () => WhitelistService.list(1, 1, false, 50, 0),
        ForbiddenError,
        'Accès non autorisé'
      );
    });
  });

  describe('list', () => {
    it('should return whitelist entries for the event', async () => {
      mocks.EventModel.findById.mockResolvedValueOnce({ id: 5, orga_id: 1 });

      const entries = [
        {
          id: 1, phone: '+33612345678', status: 'active', source: 'manual',
          user_id: 42, firstname: 'Alice', lastname: 'A',
          created_at: '2025-01-01', removed_at: null,
        },
      ];
      mocks.WhitelistModel.getByEventId.mockResolvedValueOnce(entries);

      const result = await WhitelistService.list(1, 5, false, 50, 0);

      expect(mocks.WhitelistModel.getByEventId).toHaveBeenCalledWith(5, false, 50, 0);
      expect(result).toEqual({
        event_id: 5,
        count: 1,
        entries: [
          {
            id: 1, phone: '+33612345678', status: 'active', source: 'manual',
            user: { id: 42, firstname: 'Alice', lastname: 'A' },
            created_at: '2025-01-01', removed_at: null,
          },
        ],
      });
    });

    it('should return null user when user_id is null', async () => {
      mocks.EventModel.findById.mockResolvedValueOnce({ id: 5, orga_id: 1 });
      mocks.WhitelistModel.getByEventId.mockResolvedValueOnce([
        {
          id: 2, phone: '+33699999999', status: 'active', source: 'csv',
          user_id: null, firstname: null, lastname: null,
          created_at: '2025-01-01', removed_at: null,
        },
      ]);

      const result = await WhitelistService.list(1, 5, false, 50, 0);

      expect(result.entries[0].user).toBeNull();
    });

    it('should pass includeRemoved flag', async () => {
      mocks.EventModel.findById.mockResolvedValueOnce({ id: 5, orga_id: 1 });
      mocks.WhitelistModel.getByEventId.mockResolvedValueOnce([]);

      await WhitelistService.list(1, 5, true, 50, 0);

      expect(mocks.WhitelistModel.getByEventId).toHaveBeenCalledWith(5, true, 50, 0);
    });
  });

  describe('addPhone', () => {
    it('should throw ValidationError when phone is missing', async () => {
      await expectError(
        () => WhitelistService.addPhone(1, 5, ''),
        ValidationError,
        'Le numéro de téléphone est requis'
      );
    });

    it('should throw ValidationError when phone format is invalid', async () => {
      mocks.isValidPhone.mockReturnValue(false);

      await expectError(
        () => WhitelistService.addPhone(1, 5, 'abc'),
        ValidationError,
        'Format de numéro invalide'
      );
    });

    it('should return reactivated response', async () => {
      mocks.EventModel.findById.mockResolvedValueOnce({ id: 5, orga_id: 1 });
      mocks.WhitelistModel.addPhone.mockResolvedValueOnce({
        id: 1, phone: '+33612345678', status: 'active', was_reactivated: true,
      });

      const result = await WhitelistService.addPhone(1, 5, '+33612345678');

      expect(mocks.WhitelistModel.addPhone).toHaveBeenCalledWith(5, '+33612345678', 'manual', true);
      expect(result).toEqual({
        data: { id: 1, phone: '+33612345678', status: 'active', reactivated: true },
        message: 'Numéro réactivé',
        isNew: false,
      });
    });

    it('should return duplicate response', async () => {
      mocks.EventModel.findById.mockResolvedValueOnce({ id: 5, orga_id: 1 });
      mocks.WhitelistModel.addPhone.mockResolvedValueOnce({
        phone: '+33612345678', status: 'active', was_reactivated: false, is_new: false,
      });

      const result = await WhitelistService.addPhone(1, 5, '+33612345678');

      expect(result).toEqual({
        data: { phone: '+33612345678', status: 'active' },
        message: 'Numéro déjà présent',
        isNew: false,
      });
    });

    it('should return new entry response', async () => {
      mocks.EventModel.findById.mockResolvedValueOnce({ id: 5, orga_id: 1 });
      mocks.WhitelistModel.addPhone.mockResolvedValueOnce({
        id: 10, phone: '+33612345678', status: 'active', source: 'manual',
        was_reactivated: false, is_new: true,
      });

      const result = await WhitelistService.addPhone(1, 5, '+33612345678');

      expect(result).toEqual({
        data: { id: 10, phone: '+33612345678', status: 'active', source: 'manual' },
        message: 'Numéro ajouté à la whitelist',
        isNew: true,
      });
    });
  });

  describe('updatePhone', () => {
    it('should throw ValidationError when new phone is missing', async () => {
      await expectError(
        () => WhitelistService.updatePhone(1, 5, '+33612345678', ''),
        ValidationError,
        'Le nouveau numéro est requis'
      );
    });

    it('should throw ValidationError when new phone format is invalid', async () => {
      mocks.isValidPhone.mockReturnValue(false);

      await expectError(
        () => WhitelistService.updatePhone(1, 5, '+33612345678', 'bad'),
        ValidationError,
        'Format de numéro invalide'
      );
    });

    it('should throw NotFoundError when phone not in whitelist', async () => {
      mocks.EventModel.findById.mockResolvedValueOnce({ id: 5, orga_id: 1 });
      mocks.WhitelistModel.updatePhone.mockResolvedValueOnce(null);

      await expectError(
        () => WhitelistService.updatePhone(1, 5, '+33612345678', '+33699999999'),
        NotFoundError,
        'Numéro non trouvé dans la whitelist'
      );
    });

    it('should update and return result', async () => {
      mocks.EventModel.findById.mockResolvedValueOnce({ id: 5, orga_id: 1 });
      mocks.WhitelistModel.updatePhone.mockResolvedValueOnce({
        id: 1, phone: '+33699999999', status: 'active',
      });

      const result = await WhitelistService.updatePhone(1, 5, '+33612345678', '+33699999999');

      expect(mocks.WhitelistModel.updatePhone).toHaveBeenCalledWith(5, '+33612345678', '+33699999999');
      expect(result).toEqual({ id: 1, phone: '+33699999999', status: 'active' });
    });
  });

  describe('removePhone', () => {
    it('should soft remove by default', async () => {
      mocks.EventModel.findById.mockResolvedValueOnce({ id: 5, orga_id: 1 });
      mocks.WhitelistModel.softRemove.mockResolvedValueOnce({
        phone: '+33612345678', user_id: 42,
      });

      const result = await WhitelistService.removePhone(1, 5, '+33612345678', false);

      expect(mocks.WhitelistModel.softRemove).toHaveBeenCalledWith(5, '+33612345678');
      expect(mocks.WhitelistModel.permanentDelete).not.toHaveBeenCalled();
      expect(result).toEqual({
        data: { phone: '+33612345678', permanent: false, user_affected: true },
        message: 'Numéro retiré de la whitelist (matches archivés)',
      });
    });

    it('should permanently delete when permanent=true', async () => {
      mocks.EventModel.findById.mockResolvedValueOnce({ id: 5, orga_id: 1 });
      mocks.WhitelistModel.permanentDelete.mockResolvedValueOnce({
        phone: '+33612345678', user_id: null,
      });

      const result = await WhitelistService.removePhone(1, 5, '+33612345678', true);

      expect(mocks.WhitelistModel.permanentDelete).toHaveBeenCalledWith(5, '+33612345678');
      expect(mocks.WhitelistModel.softRemove).not.toHaveBeenCalled();
      expect(result).toEqual({
        data: { phone: '+33612345678', permanent: true, user_affected: false },
        message: 'Numéro et données associées supprimés définitivement',
      });
    });

    it('should throw NotFoundError when phone not found', async () => {
      mocks.EventModel.findById.mockResolvedValueOnce({ id: 5, orga_id: 1 });
      mocks.WhitelistModel.softRemove.mockResolvedValueOnce(null);

      await expectError(
        () => WhitelistService.removePhone(1, 5, '+33612345678', false),
        NotFoundError,
        'Numéro non trouvé dans la whitelist'
      );
    });
  });

  describe('reactivate', () => {
    it('should throw NotFoundError when phone cannot be reactivated', async () => {
      mocks.EventModel.findById.mockResolvedValueOnce({ id: 5, orga_id: 1 });
      mocks.WhitelistModel.reactivate.mockResolvedValueOnce(null);

      await expectError(
        () => WhitelistService.reactivate(1, 5, '+33612345678'),
        NotFoundError,
        'Numéro non trouvé ou déjà actif'
      );
    });

    it('should reactivate and return result', async () => {
      mocks.EventModel.findById.mockResolvedValueOnce({ id: 5, orga_id: 1 });
      mocks.WhitelistModel.reactivate.mockResolvedValueOnce({
        id: 1, phone: '+33612345678', status: 'active',
      });

      const result = await WhitelistService.reactivate(1, 5, '+33612345678');

      expect(mocks.WhitelistModel.reactivate).toHaveBeenCalledWith(5, '+33612345678');
      expect(result).toEqual({ id: 1, phone: '+33612345678', status: 'active' });
    });
  });

  describe('previewImport', () => {
    it('should throw ValidationError when content is missing', async () => {
      await expectError(
        () => WhitelistService.previewImport(1, 5, ''),
        ValidationError,
        'Le contenu du fichier est requis'
      );
    });

    it('should return CSV headers', async () => {
      mocks.EventModel.findById.mockResolvedValueOnce({ id: 5, orga_id: 1 });

      const csvData = {
        headers: [{ index: 0, name: 'phone' }],
        preview: [['+33612345678']],
        totalRows: 1,
        delimiter: ';',
      };
      mocks.getCSVHeaders.mockReturnValueOnce(csvData);

      const result = await WhitelistService.previewImport(1, 5, 'phone\n+33612345678');

      expect(mocks.getCSVHeaders).toHaveBeenCalledWith('phone\n+33612345678');
      expect(result).toEqual(csvData);
    });
  });

  describe('importFile', () => {
    it('should throw ValidationError when content is missing', async () => {
      await expectError(
        () => WhitelistService.importFile(1, 5, '', 'csv'),
        ValidationError,
        'Le contenu du fichier est requis'
      );
    });

    it('should throw ValidationError for invalid format', async () => {
      await expectError(
        () => WhitelistService.importFile(1, 5, 'data', 'txt'),
        ValidationError,
        'Format invalide. Utilisez "csv" ou "xml"'
      );
    });

    it('should throw ValidationError when no format provided', async () => {
      await expectError(
        () => WhitelistService.importFile(1, 5, 'data', ''),
        ValidationError,
        'Format invalide. Utilisez "csv" ou "xml"'
      );
    });

    it('should throw ValidationError when parsed phones list is empty', async () => {
      mocks.EventModel.findById.mockResolvedValueOnce({ id: 5, orga_id: 1 });
      mocks.parseCSVSimple.mockReturnValueOnce([]);

      await expectError(
        () => WhitelistService.importFile(1, 5, 'empty', 'csv'),
        ValidationError,
        'Aucun numéro trouvé dans le fichier'
      );
    });

    it('should use parseCSVSimple for csv without columnIndex', async () => {
      mocks.EventModel.findById.mockResolvedValueOnce({ id: 5, orga_id: 1 });
      mocks.parseCSVSimple.mockReturnValueOnce(['+33612345678']);

      const stats = { total: 1, added: 1, skipped_duplicate: 0, skipped_removed: 0, invalid: 0, errors: [] };
      mocks.WhitelistModel.addPhonesBulk.mockResolvedValueOnce(stats);

      const result = await WhitelistService.importFile(1, 5, '+33612345678', 'csv');

      expect(mocks.parseCSVSimple).toHaveBeenCalledWith('+33612345678');
      expect(mocks.parseCSVWithColumn).not.toHaveBeenCalled();
      expect(mocks.WhitelistModel.addPhonesBulk).toHaveBeenCalledWith(5, ['+33612345678'], 'csv');
      expect(result).toEqual({
        stats: { total: 1, added: 1, skipped_duplicate: 0, skipped_removed: 0, invalid: 0 },
        errors: undefined,
        message: 'Import terminé: 1 ajoutés, 0 doublons, 0 précédemment supprimés, 0 invalides',
      });
    });

    it('should use parseCSVWithColumn when columnIndex is provided', async () => {
      mocks.EventModel.findById.mockResolvedValueOnce({ id: 5, orga_id: 1 });
      mocks.parseCSVWithColumn.mockReturnValueOnce(['+33612345678']);

      const stats = { total: 1, added: 1, skipped_duplicate: 0, skipped_removed: 0, invalid: 0, errors: [] };
      mocks.WhitelistModel.addPhonesBulk.mockResolvedValueOnce(stats);

      await WhitelistService.importFile(1, 5, 'name;phone\nAlice;+33612345678', 'csv', 1);

      expect(mocks.parseCSVWithColumn).toHaveBeenCalledWith('name;phone\nAlice;+33612345678', 1);
      expect(mocks.parseCSVSimple).not.toHaveBeenCalled();
    });

    it('should use parseXML for xml format', async () => {
      mocks.EventModel.findById.mockResolvedValueOnce({ id: 5, orga_id: 1 });
      mocks.parseXML.mockReturnValueOnce(['+33612345678']);

      const stats = { total: 1, added: 1, skipped_duplicate: 0, skipped_removed: 0, invalid: 0, errors: [] };
      mocks.WhitelistModel.addPhonesBulk.mockResolvedValueOnce(stats);

      await WhitelistService.importFile(1, 5, '<phone>+33612345678</phone>', 'xml');

      expect(mocks.parseXML).toHaveBeenCalledWith('<phone>+33612345678</phone>');
      expect(mocks.parseCSVSimple).not.toHaveBeenCalled();
    });

    it('should include errors in response when present', async () => {
      mocks.EventModel.findById.mockResolvedValueOnce({ id: 5, orga_id: 1 });
      mocks.parseCSVSimple.mockReturnValueOnce(['+33612345678']);

      const stats = {
        total: 1, added: 0, skipped_duplicate: 0, skipped_removed: 0, invalid: 1,
        errors: [{ phone: '+33612345678', error: 'Invalid format' }],
      };
      mocks.WhitelistModel.addPhonesBulk.mockResolvedValueOnce(stats);

      const result = await WhitelistService.importFile(1, 5, '+33612345678', 'csv');

      expect(result.errors).toEqual([{ phone: '+33612345678', error: 'Invalid format' }]);
    });
  });

  describe('bulkRemove', () => {
    it('should throw ValidationError when phones is missing', async () => {
      await expectError(
        () => WhitelistService.bulkRemove(1, 5, undefined as any, false),
        ValidationError,
        'La liste des numéros est requise'
      );
    });

    it('should throw ValidationError when phones is not an array', async () => {
      await expectError(
        () => WhitelistService.bulkRemove(1, 5, 'not-array' as any, false),
        ValidationError,
        'La liste des numéros est requise'
      );
    });

    it('should throw ValidationError when phones is empty array', async () => {
      await expectError(
        () => WhitelistService.bulkRemove(1, 5, [], false),
        ValidationError,
        'La liste des numéros est requise'
      );
    });

    it('should soft remove phones and return stats', async () => {
      mocks.EventModel.findById.mockResolvedValueOnce({ id: 5, orga_id: 1 });
      mocks.WhitelistModel.softRemove
        .mockResolvedValueOnce({ phone: '+33612345678' })
        .mockResolvedValueOnce(null);

      const result = await WhitelistService.bulkRemove(1, 5, ['+33612345678', '+33699999999'], false);

      expect(mocks.WhitelistModel.softRemove).toHaveBeenCalledTimes(2);
      expect(result).toEqual({
        stats: { total: 2, removed: 1, not_found: 1, errors: [] },
        message: 'Retrait: 1 retirés, 1 non trouvés',
      });
    });

    it('should permanently delete when permanent is true', async () => {
      mocks.EventModel.findById.mockResolvedValueOnce({ id: 5, orga_id: 1 });
      mocks.WhitelistModel.permanentDelete.mockResolvedValueOnce({ phone: '+33612345678' });

      const result = await WhitelistService.bulkRemove(1, 5, ['+33612345678'], true);

      expect(mocks.WhitelistModel.permanentDelete).toHaveBeenCalledWith(5, '+33612345678');
      expect(mocks.WhitelistModel.softRemove).not.toHaveBeenCalled();
      expect(result).toEqual({
        stats: { total: 1, removed: 1, not_found: 0, errors: [] },
        message: 'Suppression définitive: 1 supprimés, 0 non trouvés',
      });
    });

    it('should catch errors for individual phones', async () => {
      mocks.EventModel.findById.mockResolvedValueOnce({ id: 5, orga_id: 1 });
      mocks.WhitelistModel.softRemove.mockRejectedValueOnce(new Error('DB error'));

      const result = await WhitelistService.bulkRemove(1, 5, ['+33612345678'], false);

      expect(result.stats.errors).toEqual([{ phone: '+33612345678', error: 'DB error' }]);
    });
  });
});
