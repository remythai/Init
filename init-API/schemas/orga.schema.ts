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

export const orgaRegisterSchema = z.object({
  name: z.string().min(2, 'Doit contenir au moins 2 caractères').max(255, 'Doit contenir au maximum 255 caractères'),
  mail: emailSchema,
  description: z.string().optional(),
  tel: phoneSchema.optional(),
  password: passwordSchema
});

export const orgaLoginSchema = z.object({
  mail: emailSchema,
  password: z.string().min(1, 'Le champ password est requis')
});

export const orgaUpdateSchema = z.object({
  nom: z.string().min(2, 'Doit contenir au moins 2 caractères').max(255, 'Doit contenir au maximum 255 caractères').optional(),
  mail: emailSchema.optional(),
  tel: phoneSchema.optional(),
  description: z.string().optional()
}).refine(data => Object.keys(data).length > 0, {
  message: 'Aucun champ à mettre à jour fourni'
});

export type OrgaRegisterInput = z.infer<typeof orgaRegisterSchema>;
export type OrgaLoginInput = z.infer<typeof orgaLoginSchema>;
export type OrgaUpdateInput = z.infer<typeof orgaUpdateSchema>;
