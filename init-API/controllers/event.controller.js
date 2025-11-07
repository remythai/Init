import { EventModel } from '../models/event.model.js';
import { ValidationError, NotFoundError, ForbiddenError, ConflictError } from '../utils/errors.js';
import { success, created } from '../utils/responses.js';
import { validateCustomFields, validateCustomData } from '../utils/customFieldsSchema.js';

export const EventController = {
  async create(req, res) {
    const { titre, description, date_debut, date_fin, lieu, custom_fields } = req.body;

    const debut = new Date(date_debut);
    const fin = date_fin ? new Date(date_fin) : null;

    if (fin && fin < debut) {
      throw new ValidationError('La date de fin doit être après la date de début');
    }

    if (custom_fields) {
      validateCustomFields(custom_fields);
    }

    const event = await EventModel.create({
      orga_id: req.user.id,
      titre,
      description,
      date_debut,
      date_fin,
      lieu,
      custom_fields: custom_fields || []
    });

    return created(res, event, 'Événement créé avec succès');
  },

  async getAll(req, res) {
    const { upcoming, lieu, search, limit, offset } = req.query;

    const filters = {
      upcoming: upcoming === 'true',
      lieu,
      search,
      limit: limit ? parseInt(limit) : undefined,
      offset: offset ? parseInt(offset) : undefined
    };

    const events = await EventModel.findAll(filters);
    return success(res, events);
  },

  // Obtenir un événement par ID
  async getById(req, res) {
    const event = await EventModel.findById(req.params.id);

    if (!event) {
      throw new NotFoundError('Événement non trouvé');
    }

    // Ajouter le nombre de participants
    const participantCount = await EventModel.countParticipants(req.params.id);
    event.participant_count = participantCount;

    return success(res, event);
  },

  // Obtenir les événements de l'orga connectée
  async getMyEvents(req, res) {
    const events = await EventModel.findByOrgaId(req.user.id);
    
    // Ajouter le nombre de participants pour chaque événement
    const eventsWithCount = await Promise.all(
      events.map(async (event) => ({
        ...event,
        participant_count: await EventModel.countParticipants(event.id)
      }))
    );

    return success(res, eventsWithCount);
  },

  // Mettre à jour un événement
  async update(req, res) {
    const eventId = req.params.id;
    const event = await EventModel.findById(eventId);

    if (!event) {
      throw new NotFoundError('Événement non trouvé');
    }

    if (event.orga_id !== req.user.id) {
      throw new ForbiddenError('Vous ne pouvez modifier que vos propres événements');
    }

    const { titre, description, date_debut, date_fin, lieu, custom_fields } = req.body;
    const updates = {};

    if (titre) updates.titre = titre;
    if (description !== undefined) updates.description = description;
    if (date_debut) updates.date_debut = date_debut;
    if (date_fin !== undefined) updates.date_fin = date_fin;
    if (lieu) updates.lieu = lieu;
    
    if (custom_fields) {
      validateCustomFields(custom_fields);
      updates.custom_fields = custom_fields;
    }

    // Valider les dates si modifiées
    if (updates.date_debut || updates.date_fin) {
      const debut = new Date(updates.date_debut || event.date_debut);
      const fin = updates.date_fin ? new Date(updates.date_fin) : (event.date_fin ? new Date(event.date_fin) : null);
      
      if (fin && fin < debut) {
        throw new ValidationError('La date de fin doit être après la date de début');
      }
    }

    if (Object.keys(updates).length === 0) {
      throw new ValidationError('Aucune donnée à mettre à jour');
    }

    const updatedEvent = await EventModel.update(eventId, updates);
    return success(res, updatedEvent, 'Événement mis à jour');
  },

  async delete(req, res) {
    const eventId = req.params.id;
    const event = await EventModel.findById(eventId);

    if (!event) {
      throw new NotFoundError('Événement non trouvé');
    }

    if (event.orga_id !== req.user.id) {
      throw new ForbiddenError('Vous ne pouvez supprimer que vos propres événements');
    }

    await EventModel.delete(eventId);
    return success(res, null, 'Événement supprimé');
  }
};