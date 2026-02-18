import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Init-API Documentation',
      version: '1.0.0',
      description: 'Documentation de l\'API avec authentification JWT',
      contact: {
        name: 'Antton',
        email: 'antton.ducos@gmail.com'
      }
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Serveur de développement'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Entrez votre token JWT'
        }
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: { type: 'integer', description: 'ID unique de l\'utilisateur' },
            firstname: { type: 'string', example: 'Jean' },
            lastname: { type: 'string', example: 'Dupont' },
            mail: { type: 'string', format: 'email', example: 'jean.dupont@example.com' },
            tel: { type: 'string', example: '+33612345678' },
            birthday: { type: 'string', format: 'date', example: '1990-01-01' },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' }
          }
        },
        UserRegister: {
          type: 'object',
          required: ['firstname', 'lastname', 'tel', 'birthday', 'password'],
          properties: {
            firstname: { type: 'string', minLength: 2, maxLength: 100, example: 'Jean' },
            lastname: { type: 'string', minLength: 2, maxLength: 100, example: 'Dupont' },
            mail: { type: 'string', format: 'email', example: 'jean.dupont@example.com' },
            tel: { type: 'string', example: '+33612345678' },
            birthday: { type: 'string', format: 'date', example: '1990-01-01', description: 'Date de naissance (doit avoir 18 ans minimum)' },
            password: { type: 'string', format: 'password', minLength: 8, example: 'motdepasse123' }
          }
        },
        UserLogin: {
          type: 'object',
          required: ['tel', 'password'],
          properties: {
            tel: { type: 'string', example: '+33612345678' },
            password: { type: 'string', format: 'password', example: 'motdepasse123' }
          }
        },
        TokenResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string', example: 'Connexion réussie' },
            data: {
              type: 'object',
              properties: {
                accessToken: { type: 'string', description: 'Token JWT valide 15 minutes' },
                refreshToken: { type: 'string', description: 'Token de rafraîchissement valide 7 jours' },
                user: { $ref: '#/components/schemas/User' }
              }
            }
          }
        },
        SuccessResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string' },
            data: { type: 'object' }
          }
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            error: { type: 'string', example: 'Message d\'erreur' },
            code: { type: 'string', example: 'ERROR_CODE' },
            details: { type: 'object', description: 'Détails supplémentaires sur l\'erreur' }
          }
        },
        ValidationError: {
          type: 'object',
          properties: {
            error: { type: 'string', example: 'Erreurs de validation' },
            details: {
              type: 'object',
              additionalProperties: { type: 'string' },
              example: {
                firstname: 'Le champ firstname est requis',
                mail: 'Format d\'email invalide'
              }
            }
          }
        }
      },
      responses: {
        UnauthorizedError: {
          description: 'Token manquant ou invalide',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' },
              example: { error: 'Token invalide ou expiré' }
            }
          }
        },
        ValidationError: {
          description: 'Erreur de validation des données',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ValidationError' }
            }
          }
        },
        NotFoundError: {
          description: 'Ressource non trouvée',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' },
              example: { error: 'Utilisateur non trouvé' }
            }
          }
        }
      }
    },
    tags: [
      { name: 'Users', description: 'Gestion des utilisateurs' },
      { name: 'Authentication', description: 'Authentification et tokens' },
      { name: 'Organizations', description: 'Gestion des organisations' },
      { name: 'Events', description: 'Gestion des événements' }
    ]
  },
  apis: ['./routes/*.ts', './controllers/*.ts', './dist/routes/*.js', './dist/controllers/*.js']
};

export const swaggerSpec = swaggerJsdoc(options);
