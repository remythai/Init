import { WhitelistModel, normalizePhone, isValidPhone } from '../models/whitelist.model.js';
import { EventModel } from '../models/event.model.js';
import { ValidationError, NotFoundError, ForbiddenError, ConflictError } from '../utils/errors.js';
import { success, created } from '../utils/responses.js';

/**
 * Detect the delimiter used in CSV content
 * Prefers semicolon (European convention) if consistent
 */
function detectDelimiter(content) {
  const lines = content.split(/[\r\n]+/).filter(line => line.trim());
  if (lines.length === 0) return ';';

  // Check first few lines (max 5)
  const sampleLines = lines.slice(0, Math.min(5, lines.length));

  const delimiters = [';', '\t', ','];

  for (const delimiter of delimiters) {
    // Count occurrences in each line (outside quotes)
    const counts = sampleLines.map(line => {
      let count = 0;
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"' && (i === 0 || line[i-1] !== '\\')) {
          inQuotes = !inQuotes;
        } else if (char === delimiter && !inQuotes) {
          count++;
        }
      }
      return count;
    });

    // Check if this delimiter is consistent (same count on all lines, at least 1)
    const firstCount = counts[0];
    if (firstCount > 0 && counts.every(c => c === firstCount)) {
      return delimiter;
    }
  }

  // Fallback: use the delimiter that appears most consistently
  // Prefer semicolon for European CSV (decimal comma)
  for (const delimiter of delimiters) {
    const counts = sampleLines.map(line => {
      let count = 0;
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"' && (i === 0 || line[i-1] !== '\\')) {
          inQuotes = !inQuotes;
        } else if (char === delimiter && !inQuotes) {
          count++;
        }
      }
      return count;
    });

    // If at least some lines have this delimiter
    if (counts.some(c => c > 0)) {
      return delimiter;
    }
  }

  return ';'; // Default to semicolon
}

/**
 * Parse CSV line with specific delimiter, handling quoted fields
 */
function parseCSVLineWithDelimiter(line, delimiter) {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"' && (i === 0 || line[i-1] !== '\\')) {
      inQuotes = !inQuotes;
    } else if (char === delimiter && !inQuotes) {
      result.push(current.trim().replace(/^["']|["']$/g, ''));
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim().replace(/^["']|["']$/g, ''));
  return result;
}

/**
 * Parse CSV content - simple mode (one phone per line or delimiter-separated)
 */
function parseCSVSimple(content) {
  const phones = [];
  const lines = content.split(/[\r\n]+/);
  const delimiter = detectDelimiter(content);

  for (const line of lines) {
    const parts = parseCSVLineWithDelimiter(line, delimiter);
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
 * Parse CSV with headers and extract specific column
 * Supports quoted fields
 */
function parseCSVWithColumn(content, columnIndex) {
  const phones = [];
  const lines = content.split(/[\r\n]+/).filter(line => line.trim());
  const delimiter = detectDelimiter(content);

  // Skip header row (index 0)
  for (let i = 1; i < lines.length; i++) {
    const parts = parseCSVLineWithDelimiter(lines[i], delimiter);
    if (parts[columnIndex] !== undefined) {
      const phone = parts[columnIndex];
      if (phone && phone.length > 0) {
        phones.push(phone);
      }
    }
  }

  return phones;
}

/**
 * Extract CSV headers for column selection
 * Auto-detects delimiter
 */
function getCSVHeaders(content) {
  const lines = content.split(/[\r\n]+/).filter(line => line.trim());
  if (lines.length === 0) return { headers: [], preview: [], totalRows: 0, delimiter: ';' };

  const delimiter = detectDelimiter(content);

  const headerLine = lines[0];
  const headerParts = parseCSVLineWithDelimiter(headerLine, delimiter);
  const headers = headerParts.map((h, index) => ({
    index,
    name: h
  }));

  // Get preview of first few rows
  const preview = [];
  for (let i = 1; i < Math.min(4, lines.length); i++) {
    const parts = parseCSVLineWithDelimiter(lines[i], delimiter);
    preview.push(parts);
  }

  return { headers, preview, totalRows: lines.length - 1, delimiter };
}

/**
 * Parse CSV line handling quoted fields (legacy, uses auto-detection)
 */
function parseCSVLine(line) {
  return parseCSVLineWithDelimiter(line, detectDelimiter(line));
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

    // Manual add allows reactivation of removed phones
    const entry = await WhitelistModel.addPhone(eventId, phone, 'manual', true);

    if (entry.was_reactivated) {
      return success(res, {
        id: entry.id,
        phone: entry.phone,
        status: entry.status,
        reactivated: true
      }, 'Numéro réactivé');
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
   * POST /api/events/:id/whitelist/import/preview
   * Preview CSV headers for column selection
   */
  async previewImport(req, res) {
    const eventId = parseInt(req.params.id);
    const { content } = req.body;

    if (!content) {
      throw new ValidationError('Le contenu du fichier est requis');
    }

    // Check event exists and belongs to orga
    const event = await EventModel.findById(eventId);
    if (!event) {
      throw new NotFoundError('Événement non trouvé');
    }

    if (event.orga_id !== req.user.id) {
      throw new ForbiddenError('Accès non autorisé');
    }

    const csvData = getCSVHeaders(content);

    return success(res, csvData);
  },

  /**
   * POST /api/events/:id/whitelist/import
   * Import phones from CSV or XML
   */
  async importFile(req, res) {
    const eventId = parseInt(req.params.id);
    const { content, format, columnIndex } = req.body;

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
      // If columnIndex is provided, use column-based parsing
      if (columnIndex !== undefined && columnIndex !== null) {
        phones = parseCSVWithColumn(content, parseInt(columnIndex));
      } else {
        phones = parseCSVSimple(content);
      }
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
  },

  /**
   * DELETE /api/events/:id/whitelist/bulk
   * Remove multiple phones from whitelist
   */
  async bulkRemove(req, res) {
    const eventId = parseInt(req.params.id);
    const { phones, permanent = false } = req.body;

    if (!phones || !Array.isArray(phones) || phones.length === 0) {
      throw new ValidationError('La liste des numéros est requise');
    }

    // Check event exists and belongs to orga
    const event = await EventModel.findById(eventId);
    if (!event) {
      throw new NotFoundError('Événement non trouvé');
    }

    if (event.orga_id !== req.user.id) {
      throw new ForbiddenError('Accès non autorisé');
    }

    const stats = {
      total: phones.length,
      removed: 0,
      not_found: 0,
      errors: []
    };

    for (const phone of phones) {
      try {
        const normalizedPhone = normalizePhone(phone);
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
        stats.errors.push({ phone, error: err.message });
      }
    }

    const message = permanent
      ? `Suppression définitive: ${stats.removed} supprimés, ${stats.not_found} non trouvés`
      : `Retrait: ${stats.removed} retirés, ${stats.not_found} non trouvés`;

    return success(res, { stats }, message);
  }
};
