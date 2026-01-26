import { WhitelistModel, normalizePhone, isValidPhone } from '../models/whitelist.model.js';
import { EventModel } from '../models/event.model.js';
import { ValidationError, NotFoundError, ForbiddenError, ConflictError } from '../utils/errors.js';
import { success, created } from '../utils/responses.js';

/**
 * Parse CSV content
 * Expects one phone per line or comma-separated
 */
function parseCSV(content) {
  const phones = [];
  const lines = content.split(/[\r\n]+/);

  for (const line of lines) {
    // Split by comma, semicolon, or tab
    const parts = line.split(/[,;\t]+/);
    for (const part of parts) {
      const phone = part.trim();
      if (phone && phone.length > 0) {
        phones.push(phone);
      }
    }
  }

  return phones;
}

/**
 * Parse XML content
 * Expects <phone>...</phone> or <tel>...</tel> tags
 */
function parseXML(content) {
  const phones = [];
  // Match <phone>...</phone> or <tel>...</tel> or <numero>...</numero>
  const regex = /<(?:phone|tel|numero)>([^<]+)<\/(?:phone|tel|numero)>/gi;
  let match;

  while ((match = regex.exec(content)) !== null) {
    const phone = match[1].trim();
    if (phone) {
      phones.push(phone);
    }
  }

  return phones;
}

export const WhitelistController = {
  /**
   * GET /api/events/:id/whitelist
   * List whitelist entries for an event
   */
  async list(req, res) {
    const eventId = parseInt(req.params.id);
    const includeRemoved = req.query.include_removed === 'true';

    // Check event exists and belongs to orga
    const event = await EventModel.findById(eventId);
    if (!event) {
      throw new NotFoundError('Événement non trouvé');
    }

    if (event.orga_id !== req.user.id) {
      throw new ForbiddenError('Accès non autorisé');
    }

    const whitelist = await WhitelistModel.getByEventId(eventId, includeRemoved);

    return success(res, {
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
    });
  },

  /**
   * POST /api/events/:id/whitelist
   * Add a phone to whitelist
   */
  async addPhone(req, res) {
    const eventId = parseInt(req.params.id);
    const { phone } = req.body;

    if (!phone) {
      throw new ValidationError('Le numéro de téléphone est requis');
    }

    if (!isValidPhone(phone)) {
      throw new ValidationError('Format de numéro invalide');
    }

    // Check event exists and belongs to orga
    const event = await EventModel.findById(eventId);
    if (!event) {
      throw new NotFoundError('Événement non trouvé');
    }

    if (event.orga_id !== req.user.id) {
      throw new ForbiddenError('Accès non autorisé');
    }

    const entry = await WhitelistModel.addPhone(eventId, phone, 'manual');

    if (entry.was_removed) {
      return success(res, {
        message: 'Ce numéro a été précédemment supprimé. Utilisez /reactivate pour le réactiver.',
        entry: {
          phone: entry.phone,
          status: entry.status,
          removed_at: entry.removed_at
        }
      }, 'Numéro déjà supprimé');
    }

    if (!entry.is_new) {
      return success(res, {
        phone: entry.phone,
        status: entry.status
      }, 'Numéro déjà présent');
    }

    return created(res, {
      id: entry.id,
      phone: entry.phone,
      status: entry.status,
      source: entry.source
    }, 'Numéro ajouté à la whitelist');
  },

  /**
   * PUT /api/events/:id/whitelist/:phone
   * Update a phone in whitelist
   */
  async updatePhone(req, res) {
    const eventId = parseInt(req.params.id);
    const oldPhone = decodeURIComponent(req.params.phone);
    const { phone: newPhone } = req.body;

    if (!newPhone) {
      throw new ValidationError('Le nouveau numéro est requis');
    }

    if (!isValidPhone(newPhone)) {
      throw new ValidationError('Format de numéro invalide');
    }

    // Check event exists and belongs to orga
    const event = await EventModel.findById(eventId);
    if (!event) {
      throw new NotFoundError('Événement non trouvé');
    }

    if (event.orga_id !== req.user.id) {
      throw new ForbiddenError('Accès non autorisé');
    }

    const entry = await WhitelistModel.updatePhone(eventId, oldPhone, newPhone);

    if (!entry) {
      throw new NotFoundError('Numéro non trouvé dans la whitelist');
    }

    return success(res, {
      id: entry.id,
      phone: entry.phone,
      status: entry.status
    }, 'Numéro mis à jour');
  },

  /**
   * DELETE /api/events/:id/whitelist/:phone
   * Remove a phone from whitelist (soft or permanent)
   */
  async removePhone(req, res) {
    const eventId = parseInt(req.params.id);
    const phone = decodeURIComponent(req.params.phone);
    const permanent = req.query.permanent === 'true';

    // Check event exists and belongs to orga
    const event = await EventModel.findById(eventId);
    if (!event) {
      throw new NotFoundError('Événement non trouvé');
    }

    if (event.orga_id !== req.user.id) {
      throw new ForbiddenError('Accès non autorisé');
    }

    let result;
    if (permanent) {
      result = await WhitelistModel.permanentDelete(eventId, phone);
    } else {
      result = await WhitelistModel.softRemove(eventId, phone);
    }

    if (!result) {
      throw new NotFoundError('Numéro non trouvé dans la whitelist');
    }

    const message = permanent
      ? 'Numéro et données associées supprimés définitivement'
      : 'Numéro retiré de la whitelist (matches archivés)';

    return success(res, {
      phone: result.phone,
      permanent,
      user_affected: result.user_id !== null
    }, message);
  },

  /**
   * POST /api/events/:id/whitelist/:phone/reactivate
   * Reactivate a removed phone
   */
  async reactivate(req, res) {
    const eventId = parseInt(req.params.id);
    const phone = decodeURIComponent(req.params.phone);

    // Check event exists and belongs to orga
    const event = await EventModel.findById(eventId);
    if (!event) {
      throw new NotFoundError('Événement non trouvé');
    }

    if (event.orga_id !== req.user.id) {
      throw new ForbiddenError('Accès non autorisé');
    }

    const entry = await WhitelistModel.reactivate(eventId, phone);

    if (!entry) {
      throw new NotFoundError('Numéro non trouvé ou déjà actif');
    }

    return success(res, {
      id: entry.id,
      phone: entry.phone,
      status: entry.status
    }, 'Numéro réactivé');
  },

  /**
   * POST /api/events/:id/whitelist/import
   * Import phones from CSV or XML
   */
  async importFile(req, res) {
    const eventId = parseInt(req.params.id);
    const { content, format } = req.body;

    if (!content) {
      throw new ValidationError('Le contenu du fichier est requis');
    }

    if (!format || !['csv', 'xml'].includes(format.toLowerCase())) {
      throw new ValidationError('Format invalide. Utilisez "csv" ou "xml"');
    }

    // Check event exists and belongs to orga
    const event = await EventModel.findById(eventId);
    if (!event) {
      throw new NotFoundError('Événement non trouvé');
    }

    if (event.orga_id !== req.user.id) {
      throw new ForbiddenError('Accès non autorisé');
    }

    // Parse content based on format
    let phones;
    const source = format.toLowerCase();

    if (source === 'csv') {
      phones = parseCSV(content);
    } else {
      phones = parseXML(content);
    }

    if (phones.length === 0) {
      throw new ValidationError('Aucun numéro trouvé dans le fichier');
    }

    // Bulk import
    const stats = await WhitelistModel.addPhonesBulk(eventId, phones, source);

    return success(res, {
      stats: {
        total: stats.total,
        added: stats.added,
        skipped_duplicate: stats.skipped_duplicate,
        skipped_removed: stats.skipped_removed,
        invalid: stats.invalid
      },
      errors: stats.errors.length > 0 ? stats.errors.slice(0, 10) : undefined, // Limit errors shown
      message: `Import terminé: ${stats.added} ajoutés, ${stats.skipped_duplicate} doublons, ${stats.skipped_removed} précédemment supprimés, ${stats.invalid} invalides`
    });
  }
};
