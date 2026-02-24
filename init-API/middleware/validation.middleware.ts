import type { RequestHandler } from 'express';
import type { ZodSchema } from 'zod';
import {
  userRegisterSchema, userLoginSchema, userUpdateSchema, userChangePasswordSchema,
  orgaRegisterSchema, orgaLoginSchema, orgaUpdateSchema
} from '../schemas/index.js';

export const validationSchemas = {
  userRegister: userRegisterSchema,
  userLogin: userLoginSchema,
  userUpdate: userUpdateSchema,
  userChangePassword: userChangePasswordSchema,
  orgaRegister: orgaRegisterSchema,
  orgaLogin: orgaLoginSchema,
  orgaUpdate: orgaUpdateSchema
} as const;

export type SchemaName = keyof typeof validationSchemas;

export const validate = (schemaOrName: ZodSchema | SchemaName): RequestHandler => {
  return (req, res, next) => {
    const schema = typeof schemaOrName === 'string'
      ? validationSchemas[schemaOrName]
      : schemaOrName;

    const result = schema.safeParse(req.body);

    if (!result.success) {
      const errors: Record<string, string> = {};

      for (const issue of result.error.issues) {
        const field = issue.path.length > 0 ? issue.path.join('.') : '_root';
        if (!errors[field]) {
          errors[field] = issue.message;
        }
      }

      if (errors._root) {
        return res.status(400).json({ error: errors._root });
      }

      return res.status(400).json({
        error: 'Erreurs de validation',
        details: errors
      });
    }

    req.body = result.data;
    next();
  };
};
