import { ValidationError } from './errors.js';

// Types de champs supportés
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

export const validateFieldDefinition = (field) => {
  if (!field.id || typeof field.id !== 'string') {
    throw new ValidationError('Chaque champ doit avoir un id (string)');
  }

  if (!field.type || !Object.values(FIELD_TYPES).includes(field.type)) {
    throw new ValidationError(`Type de champ invalide. Types acceptés: ${Object.values(FIELD_TYPES).join(', ')}`);
  }

  if (!field.label || typeof field.label !== 'string') {
    throw new ValidationError('Chaque champ doit avoir un label (string)');
  }

  if (['radio', 'select', 'multiselect'].includes(field.type)) {
    if (!Array.isArray(field.options) || field.options.length === 0) {
      throw new ValidationError(`Le champ de type ${field.type} doit avoir un tableau d'options non vide`);
    }

    field.options.forEach((option, index) => {
      if (!option.value || !option.label) {
        throw new ValidationError(`L'option ${index} doit avoir 'value' et 'label'`);
      }
    });
  }

  if (field.required !== undefined && typeof field.required !== 'boolean') {
    throw new ValidationError('La propriété "required" doit être un boolean');
  }

  if (field.placeholder !== undefined && typeof field.placeholder !== 'string') {
    throw new ValidationError('La propriété "placeholder" doit être une string');
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

  const ids = new Set();
  customFields.forEach((field, index) => {
    try {
      validateFieldDefinition(field);

      if (ids.has(field.id)) {
        throw new ValidationError(`ID de champ dupliqué: ${field.id}`);
      }
      ids.add(field.id);
    } catch (error) {
      throw new ValidationError(`Erreur dans le champ ${index}: ${error.message}`);
    }
  });

  return true;
};

export const validateCustomData = (customFields, customData) => {
  const errors = {};

  customFields.forEach(field => {
    const value = customData[field.id];

    if (field.required && (value === undefined || value === null || value === '')) {
      errors[field.id] = `Le champ "${field.label}" est requis`;
      return;
    }

    if (!field.required && (value === undefined || value === null || value === '')) {
      return;
    }

    switch (field.type) {
      case FIELD_TYPES.TEXT:
      case FIELD_TYPES.TEXTAREA:
        if (typeof value !== 'string') {
          errors[field.id] = 'Doit être un texte';
        } else {
          if (field.min && value.length < field.min) {
            errors[field.id] = `Minimum ${field.min} caractères`;
          }
          if (field.max && value.length > field.max) {
            errors[field.id] = `Maximum ${field.max} caractères`;
          }
          if (field.pattern) {
            const regex = new RegExp(field.pattern);
            if (!regex.test(value)) {
              errors[field.id] = 'Format invalide';
            }
          }
        }
        break;

      case FIELD_TYPES.NUMBER:
        if (typeof value !== 'number' && isNaN(Number(value))) {
          errors[field.id] = 'Doit être un nombre';
        } else {
          const num = Number(value);
          if (field.min !== undefined && num < field.min) {
            errors[field.id] = `Minimum ${field.min}`;
          }
          if (field.max !== undefined && num > field.max) {
            errors[field.id] = `Maximum ${field.max}`;
          }
        }
        break;

      case FIELD_TYPES.EMAIL:
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
          errors[field.id] = 'Email invalide';
        }
        break;

      case FIELD_TYPES.PHONE:
        const phoneRegex = /^[0-9+\s()-]{10,20}$/;
        if (!phoneRegex.test(value)) {
          errors[field.id] = 'Téléphone invalide';
        }
        break;

      case FIELD_TYPES.DATE:
        const date = new Date(value);
        if (isNaN(date.getTime())) {
          errors[field.id] = 'Date invalide';
        }
        break;

      case FIELD_TYPES.CHECKBOX:
        if (typeof value !== 'boolean') {
          errors[field.id] = 'Doit être true ou false';
        }
        break;

      case FIELD_TYPES.RADIO:
      case FIELD_TYPES.SELECT:
        const validValues = field.options.map(opt => opt.value);
        if (!validValues.includes(value)) {
          errors[field.id] = 'Valeur invalide';
        }
        break;

      case FIELD_TYPES.MULTISELECT:
        if (!Array.isArray(value)) {
          errors[field.id] = 'Doit être un tableau';
        } else {
          const validValues = field.options.map(opt => opt.value);
          const invalidValues = value.filter(v => !validValues.includes(v));
          if (invalidValues.length > 0) {
            errors[field.id] = `Valeurs invalides: ${invalidValues.join(', ')}`;
          }
          if (field.min && value.length < field.min) {
            errors[field.id] = `Sélectionnez au moins ${field.min} option(s)`;
          }
          if (field.max && value.length > field.max) {
            errors[field.id] = `Sélectionnez au maximum ${field.max} option(s)`;
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