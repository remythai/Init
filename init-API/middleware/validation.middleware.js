import { isValidPhone } from '../utils/phone.js';

export const validationSchemas = {
  userRegister: {
    firstname: { required: true, type: 'string', minLength: 2, maxLength: 100 },
    lastname: { required: true, type: 'string', minLength: 2, maxLength: 100 },
    mail: { required: false, type: 'email' },
    tel: { required: true, type: 'phone' },
    birthday: { required: true, type: 'age18' },
    password: { required: true, type: 'string', minLength: 8 }
  },

  userLogin: {
    tel: { required: true, type: 'phone' },
    password: { required: true, type: 'string' }
  },

  userUpdate: {
    firstname: { required: false, type: 'string', minLength: 2, maxLength: 100 },
    lastname: { required: false, type: 'string', minLength: 2, maxLength: 100 },
    mail: { required: false, type: 'email' },
    tel: { required: false, type: 'phone' }
  },

  orgaRegister: {
    name: { required: true, type: 'string', minLength: 2, maxLength: 255 },
    mail: { required: true, type: 'email' },
    description: { required: false, type: 'string' },
    tel: { required: false, type: 'phone' },
    password: { required: true, type: 'string', minLength: 8 }
  },

  orgaLogin: {
    mail: { required: true, type: 'email' },
    password: { required: true, type: 'string' }
  },

  orgaUpdate: {
    nom: { required: false, type: 'string', minLength: 2, maxLength: 255 },
    mail: { required: false, type: 'email' },
    tel: { required: false, type: 'phone' },
    description: { required: false, type: 'string' }
  }
};
const validators = {
  string: (value, rules) => {
    if (typeof value !== 'string') return 'Doit être une chaîne de caractères';
    if (rules.minLength && value.length < rules.minLength) {
      return `Doit contenir au moins ${rules.minLength} caractères`;
    }
    if (rules.maxLength && value.length > rules.maxLength) {
      return `Doit contenir au maximum ${rules.maxLength} caractères`;
    }
    return null;
  },
  
  email: (value) => {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(value)) return "Format d'email invalide";
    return null;
  },

  phone: (value) => {
    if (!isValidPhone(value)) return 'Format de téléphone invalide';
    return null;
  },
  
  date: (value) => {
    const date = new Date(value);
    if (isNaN(date.getTime())) return 'Date invalide';
    return null;
  },

  age18: (value) => {
    const birthDate = new Date(value);
    if (isNaN(birthDate.getTime())) return 'Date invalide';
    
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    if (age < 18) return 'Vous devez avoir au moins 18 ans';
    return null;
  }
};

export const validate = (schemaName) => {
  return (req, res, next) => {
    const schema = validationSchemas[schemaName];
    if (!schema) {
      return res.status(500).json({
        error: `Schéma de validation '${schemaName}' introuvable`
      });
    }

    const errors = {};

    for (const [field, rules] of Object.entries(schema)) {
      const value = req.body[field];

      if (rules.required && (value === undefined || value === null || value === '')) {
        errors[field] = `Le champ ${field} est requis`;
        continue;
      }

      if (!rules.required && (value === undefined || value === null || value === '')) {
        continue;
      }

      if (rules.type && validators[rules.type]) {
        const error = validators[rules.type](value, rules);
        if (error) {
          errors[field] = error;
        }
      }
    }

    if ((schemaName === 'userUpdate' || schemaName === 'orgaUpdate') && Object.keys(req.body).length === 0) {
      return res.status(400).json({
        error: 'Aucun champ à mettre à jour fourni'
      });
    }

    if (Object.keys(errors).length > 0) {
      return res.status(400).json({
        error: 'Erreurs de validation',
        details: errors
      });
    }

    next();
  };
};
