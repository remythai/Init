import { WhitelistModel } from '../models/whitelist.model.js';
import { EventModel } from '../models/event.model.js';
import { normalizePhone, isValidPhone } from '../utils/phone.js';
import { ValidationError, NotFoundError, ForbiddenError } from '../utils/errors.js';
import { parseCSVSimple, parseCSVWithColumn, getCSVHeaders, parseXML } from '../utils/fileParser.js';

async function verifyEventOwnership(eventId: number, orgaId: number) {
  const event = await EventModel.findById(eventId);
  if (!event) {
    throw new NotFoundError('Événement non trouvé');
  }
  if (event.orga_id !== orgaId) {
    throw new ForbiddenError('Accès non autorisé');
  }
  return event;
}

export const WhitelistService = {
  async list(orgaId: number, eventId: number, includeRemoved: boolean, limit: number, offset: number) {
    await verifyEventOwnership(eventId, orgaId);

    const whitelist = await WhitelistModel.getByEventId(eventId, includeRemoved, limit, offset);

    return {
      event_id: eventId,
      count: whitelist.length,
      entries: whitelist.map(entry => ({
        id: entry.id,
        phone: entry.phone,
        status: entry.status,
        source: entry.source,
        user: entry.user_id ? {
          id: entry.user_id,
          firstname: entry.firstname,
          lastname: entry.lastname
        } : null,
        created_at: entry.created_at,
        removed_at: entry.removed_at
      }))
    };
  },

  async addPhone(orgaId: number, eventId: number, phone: string) {
    if (!phone) {
      throw new ValidationError('Le numéro de téléphone est requis');
    }

    if (!isValidPhone(phone)) {
      throw new ValidationError('Format de numéro invalide');
    }

    await verifyEventOwnership(eventId, orgaId);

    const entry = await WhitelistModel.addPhone(eventId, phone, 'manual', true);

    if (entry.was_reactivated) {
      return {
        data: { id: entry.id, phone: entry.phone, status: entry.status, reactivated: true },
        message: 'Numéro réactivé',
        isNew: false
      };
    }

    if (!entry.is_new) {
      return {
        data: { phone: entry.phone, status: entry.status },
        message: 'Numéro déjà présent',
        isNew: false
      };
    }

    return {
      data: { id: entry.id, phone: entry.phone, status: entry.status, source: entry.source },
      message: 'Numéro ajouté à la whitelist',
      isNew: true
    };
  },

  async updatePhone(orgaId: number, eventId: number, oldPhone: string, newPhone: string) {
    if (!newPhone) {
      throw new ValidationError('Le nouveau numéro est requis');
    }

    if (!isValidPhone(newPhone)) {
      throw new ValidationError('Format de numéro invalide');
    }

    await verifyEventOwnership(eventId, orgaId);

    const entry = await WhitelistModel.updatePhone(eventId, oldPhone, newPhone);

    if (!entry) {
      throw new NotFoundError('Numéro non trouvé dans la whitelist');
    }

    return { id: entry.id, phone: entry.phone, status: entry.status };
  },

  async removePhone(orgaId: number, eventId: number, phone: string, permanent: boolean) {
    await verifyEventOwnership(eventId, orgaId);

    let result;
    if (permanent) {
      result = await WhitelistModel.permanentDelete(eventId, phone);
    } else {
      result = await WhitelistModel.softRemove(eventId, phone);
    }

    if (!result) {
      throw new NotFoundError('Numéro non trouvé dans la whitelist');
    }

    return {
      data: {
        phone: result.phone,
        permanent,
        user_affected: result.user_id !== null
      },
      message: permanent
        ? 'Numéro et données associées supprimés définitivement'
        : 'Numéro retiré de la whitelist (matches archivés)'
    };
  },

  async reactivate(orgaId: number, eventId: number, phone: string) {
    await verifyEventOwnership(eventId, orgaId);

    const entry = await WhitelistModel.reactivate(eventId, phone);
    if (!entry) {
      throw new NotFoundError('Numéro non trouvé ou déjà actif');
    }

    return { id: entry.id, phone: entry.phone, status: entry.status };
  },

  async previewImport(orgaId: number, eventId: number, content: string) {
    if (!content) {
      throw new ValidationError('Le contenu du fichier est requis');
    }

    await verifyEventOwnership(eventId, orgaId);

    return getCSVHeaders(content);
  },

  async importFile(orgaId: number, eventId: number, content: string, format: string, columnIndex?: number) {
    if (!content) {
      throw new ValidationError('Le contenu du fichier est requis');
    }

    if (!format || !['csv', 'xml'].includes(format.toLowerCase())) {
      throw new ValidationError('Format invalide. Utilisez "csv" ou "xml"');
    }

    await verifyEventOwnership(eventId, orgaId);

    let phones: string[];
    const source = format.toLowerCase() as 'csv' | 'xml';

    if (source === 'csv') {
      if (columnIndex !== undefined && columnIndex !== null) {
        phones = parseCSVWithColumn(content, typeof columnIndex === 'string' ? parseInt(columnIndex) : columnIndex);
      } else {
        phones = parseCSVSimple(content);
      }
    } else {
      phones = parseXML(content);
    }

    if (phones.length === 0) {
      throw new ValidationError('Aucun numéro trouvé dans le fichier');
    }

    const stats = await WhitelistModel.addPhonesBulk(eventId, phones, source);

    return {
      stats: {
        total: stats.total,
        added: stats.added,
        skipped_duplicate: stats.skipped_duplicate,
        skipped_removed: stats.skipped_removed,
        invalid: stats.invalid
      },
      errors: stats.errors.length > 0 ? stats.errors.slice(0, 10) : undefined,
      message: `Import terminé: ${stats.added} ajoutés, ${stats.skipped_duplicate} doublons, ${stats.skipped_removed} précédemment supprimés, ${stats.invalid} invalides`
    };
  },

  async bulkRemove(orgaId: number, eventId: number, phones: string[], permanent: boolean) {
    if (!phones || !Array.isArray(phones) || phones.length === 0) {
      throw new ValidationError('La liste des numéros est requise');
    }

    await verifyEventOwnership(eventId, orgaId);

    const stats = {
      total: phones.length,
      removed: 0,
      not_found: 0,
      errors: [] as Array<{ phone: string; error: string }>
    };

    for (const phone of phones) {
      try {
        const normalizedPhone = normalizePhone(phone)!;
        let result;

        if (permanent) {
          result = await WhitelistModel.permanentDelete(eventId, normalizedPhone);
        } else {
          result = await WhitelistModel.softRemove(eventId, normalizedPhone);
        }

        if (result) {
          stats.removed++;
        } else {
          stats.not_found++;
        }
      } catch (err) {
        stats.errors.push({ phone, error: (err as Error).message });
      }
    }

    return {
      stats,
      message: permanent
        ? `Suppression définitive: ${stats.removed} supprimés, ${stats.not_found} non trouvés`
        : `Retrait: ${stats.removed} retirés, ${stats.not_found} non trouvés`
    };
  }
};
