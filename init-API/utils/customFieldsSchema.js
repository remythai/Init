import { ValidationError } from './errors.js';

export const FIELD_TYPES = {
  TEXT: 'text',           // Texte court
  TEXTAREA: 'textarea',   // Texte long
  NUMBER: 'number',       // Nombre
  EMAIL: 'email',         // Email
  PHONE: 'phone',         // Téléphone
  DATE: 'date',           // Date
  CHECKBOX: 'checkbox',   // Case à cocher (boolean)
  RADIO: 'radio',         // Choix unique (liste)
  SELECT: 'select',       // Menu déroulant (choix unique)
  MULTISELECT: 'multiselect' // Choix multiples
};

// Génère un identifiant stable à partir du label
export const getFieldId = (label) => {
  return label
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')  // Supprime les accents
    .replace(/[^a-z0-9\s]/g, '')       // Supprime les caractères spéciaux
    .trim()
    .replace(/\s+/g, '_');             // Remplace espaces par underscore
};

export const validateFieldDefinition = (field) => {
  if (!field.label || typeof field.label !== 'string' || !field.label.trim()) {
    throw new ValidationError('Chaque champ doit avoir un label (question)');
  }

  if (!field.type || !Object.values(FIELD_TYPES).includes(field.type)) {
    throw new ValidationError(`Type de champ invalide. Types acceptés: ${Object.values(FIELD_TYPES).join(', ')}`);
  }

  // Options simplifiées : tableau de strings
  if (['radio', 'select', 'multiselect'].includes(field.type)) {
    if (!Array.isArray(field.options) || field.options.length === 0) {
      throw new ValidationError(`Le champ de type ${field.type} doit avoir un tableau d'options non vide`);
    }

    field.options.forEach((option, index) => {
      if (typeof option !== 'string' || !option.trim()) {
        throw new ValidationError(`L'option ${index} doit être une chaîne non vide`);
      }
    });
  }

  if (field.required !== undefined && typeof field.required !== 'boolean') {
    throw new ValidationError('La propriété "required" doit être un boolean');
  }

  if (field.min !== undefined && typeof field.min !== 'number') {
    throw new ValidationError('La propriété "min" doit être un nombre');
  }

  if (field.max !== undefined && typeof field.max !== 'number') {
    throw new ValidationError('La propriété "max" doit être un nombre');
  }

  if (field.pattern !== undefined && typeof field.pattern !== 'string') {
    throw new ValidationError('La propriété "pattern" doit être une string (regex)');
  }

  return true;
};

export const validateCustomFields = (customFields) => {
  if (!Array.isArray(customFields)) {
    throw new ValidationError('custom_fields doit être un tableau');
  }

  const labels = new Set();
  customFields.forEach((field, index) => {
    try {
      validateFieldDefinition(field);

      const fieldId = getFieldId(field.label);
      if (labels.has(fieldId)) {
        throw new ValidationError(`Label dupliqué: ${field.label}`);
      }
      labels.add(fieldId);
    } catch (error) {
      throw new ValidationError(`Erreur dans le champ ${index}: ${error.message}`);
    }
  });

  return true;
};

export const validateCustomData = (customFields, customData) => {
  const errors = {};

  customFields.forEach(field => {
    const fieldId = getFieldId(field.label);
    const value = customData[fieldId];

    if (field.required && (value === undefined || value === null || value === '')) {
      errors[fieldId] = `Le champ "${field.label}" est requis`;
      return;
    }

    if (!field.required && (value === undefined || value === null || value === '')) {
      return;
    }

    switch (field.type) {
      case FIELD_TYPES.TEXT:
      case FIELD_TYPES.TEXTAREA:
        if (typeof value !== 'string') {
          errors[fieldId] = 'Doit être un texte';
        } else {
          if (field.min && value.length < field.min) {
            errors[fieldId] = `Minimum ${field.min} caractères`;
          }
          if (field.max && value.length > field.max) {
            errors[fieldId] = `Maximum ${field.max} caractères`;
          }
          if (field.pattern) {
            const regex = new RegExp(field.pattern);
            if (!regex.test(value)) {
              errors[fieldId] = 'Format invalide';
            }
          }
        }
        break;

      case FIELD_TYPES.NUMBER:
        if (typeof value !== 'number' && isNaN(Number(value))) {
          errors[fieldId] = 'Doit être un nombre';
        } else {
          const num = Number(value);
          if (field.min !== undefined && num < field.min) {
            errors[fieldId] = `Minimum ${field.min}`;
          }
          if (field.max !== undefined && num > field.max) {
            errors[fieldId] = `Maximum ${field.max}`;
          }
        }
        break;

      case FIELD_TYPES.EMAIL:
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
          errors[fieldId] = 'Email invalide';
        }
        break;

      case FIELD_TYPES.PHONE:
        const phoneRegex = /^[0-9+\s()-]{10,20}$/;
        if (!phoneRegex.test(value)) {
          errors[fieldId] = 'Téléphone invalide';
        }
        break;

      case FIELD_TYPES.DATE:
        const date = new Date(value);
        if (isNaN(date.getTime())) {
          errors[fieldId] = 'Date invalide';
        }
        break;

      case FIELD_TYPES.CHECKBOX:
        if (typeof value !== 'boolean') {
          errors[fieldId] = 'Doit être true ou false';
        }
        break;

      case FIELD_TYPES.RADIO:
      case FIELD_TYPES.SELECT:
        // Options sont maintenant des strings simples
        if (!field.options.includes(value)) {
          errors[fieldId] = 'Valeur invalide';
        }
        break;

      case FIELD_TYPES.MULTISELECT:
        if (!Array.isArray(value)) {
          errors[fieldId] = 'Doit être un tableau';
        } else {
          const invalidValues = value.filter(v => !field.options.includes(v));
          if (invalidValues.length > 0) {
            errors[fieldId] = `Valeurs invalides: ${invalidValues.join(', ')}`;
          }
          if (field.min && value.length < field.min) {
            errors[fieldId] = `Sélectionnez au moins ${field.min} option(s)`;
          }
          if (field.max && value.length > field.max) {
            errors[fieldId] = `Sélectionnez au maximum ${field.max} option(s)`;
          }
        }
        break;
    }
  });

  if (Object.keys(errors).length > 0) {
    const error = new ValidationError('Erreurs de validation des champs personnalisés');
    error.details = errors;
    throw error;
  }

  return true;
};
