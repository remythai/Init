import { z } from 'zod';
import { isValidPhone } from '../utils/phone.js';

const passwordSchema = z.string()
  .min(8, 'Doit contenir au moins 8 caractères')
  .refine(v => /[A-Z]/.test(v), 'Doit contenir au moins une majuscule')
  .refine(v => /[0-9]/.test(v), 'Doit contenir au moins un chiffre')
  .refine(v => /[^A-Za-z0-9]/.test(v), 'Doit contenir au moins un caractère spécial');

const phoneSchema = z.string()
  .refine(v => isValidPhone(v), 'Format de téléphone invalide');

const emailSchema = z.string()
  .regex(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/, "Format d'email invalide");

const age18Schema = z.string()
  .refine(v => !isNaN(new Date(v).getTime()), 'Date invalide')
  .refine(v => {
    const birthDate = new Date(v);
    if (isNaN(birthDate.getTime())) return false;
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age >= 18;
  }, 'Vous devez avoir au moins 18 ans');

export const userRegisterSchema = z.object({
  firstname: z.string().min(2, 'Doit contenir au moins 2 caractères').max(100, 'Doit contenir au maximum 100 caractères'),
  lastname: z.string().min(2, 'Doit contenir au moins 2 caractères').max(100, 'Doit contenir au maximum 100 caractères'),
  mail: emailSchema.optional(),
  tel: phoneSchema,
  birthday: age18Schema,
  password: passwordSchema
});

export const userLoginSchema = z.object({
  tel: phoneSchema,
  password: z.string().min(1, 'Le champ password est requis')
});

export const userUpdateSchema = z.object({
  firstname: z.string().min(2, 'Doit contenir au moins 2 caractères').max(100, 'Doit contenir au maximum 100 caractères').optional(),
  lastname: z.string().min(2, 'Doit contenir au moins 2 caractères').max(100, 'Doit contenir au maximum 100 caractères').optional(),
  mail: emailSchema.optional(),
  tel: phoneSchema.optional()
}).refine(data => Object.keys(data).length > 0, {
  message: 'Aucun champ à mettre à jour fourni'
});

export const userChangePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Le mot de passe actuel est requis'),
  newPassword: passwordSchema
});

export type UserRegisterInput = z.infer<typeof userRegisterSchema>;
export type UserLoginInput = z.infer<typeof userLoginSchema>;
export type UserUpdateInput = z.infer<typeof userUpdateSchema>;
export type UserChangePasswordInput = z.infer<typeof userChangePasswordSchema>;
