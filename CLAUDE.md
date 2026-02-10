# Projet Init - Dating/Matching App

## Stack technique
- **Backend** : Node.js, Express 4.18, ES Modules
- **DB** : PostgreSQL 17 (pg driver)
- **Auth** : JWT + bcrypt, refresh tokens
- **Realtime** : Socket.io
- **Upload** : Multer
- **Docs** : Swagger (swagger-jsdoc + swagger-ui-express)
- **Infra** : Docker Compose (API + DB + Frontend Next.js)

## Architecture
- **Pattern** : MVC (Models = requetes SQL uniquement, Controllers = logique metier, Routes = routing + middleware)
- **Error handling** : asyncHandler wraps controllers, errorHandler middleware global
- **Validation** : validation.middleware.js avec schemas (userRegister, userUpdate, orgaRegister, orgaUpdate, etc.)
- **Arborescence** : `init-API/` (api), `init-DB/` (migrations SQL), `init-web/` (frontend Next.js)

## Refactoring effectue (tout verifie et fonctionnel)
- Suppression de tous les commentaires inutiles/generes
- Deplace raw SQL de report.controller vers RegistrationModel.findUserProfileByEvent
- Supprime validations dupliquees dans user.controller et orga.controller
- Deplace business logic de event.model.getEventStatistics vers event.controller (split en getEventRawStatistics + getLeaderboardData)
- Deplace fonctions CSV/XML parsing de whitelist.controller vers utils/fileParser.js
- Corrige photo.controller pour utiliser asyncHandler
- Rate limiting (authLimiter 10/15min, registerLimiter 5/1h) sur user.routes.js et orga.routes.js
- CORS strict (whitelist CORS_ORIGINS) dans server.js et socket/index.js
- Socket auth simplifie (un seul jwt.verify)
- Validation env vars + config pool DB (max:20, idle:30s, connect:5s) dans database.js
- withTransaction helper + client param sur 8 methodes model (likeProfile, removeParticipant)
- Race condition max_participants corrigee (SELECT FOR UPDATE dans transaction)
- Trigger DB pour purger tokens expires (05-auth.sql)
- Refresh tokens hashes en SHA-256 (token.model.js)
- Morgan request logging (dev/combined)
- Health check avec verification DB (503 si down)
- Graceful shutdown (SIGTERM/SIGINT)
- allowedColumns whitelist dans update() des 3 models
- normalizePhone centralise dans utils/phone.js, applique partout (register, login, update)
- SAFE_COLUMNS dans event.model.js (access_password_hash jamais expose)
- Nettoyage fichiers disque sur suppression compte/event (multer.config.js)
- Regex email/phone strictes dans validation.middleware.js
- Index DB dans leurs fichiers respectifs (04-matching.sql, 03-events.sql)

### Phase 4 - Apres la beta
18. Email orga beta hardcode dans orga.controller.js:17
22. Migrer bcrypt vers argon2 pour le hash des mots de passe (user, orga, event) — necessite migration des hash existants en DB
23. Enlever le leaderboard

## Branches
- `main` : branche principale
- `apiToFront` : branche de dev actuelle
