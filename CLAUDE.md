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
- Timing attack login corrige (bcrypt.compare toujours execute, dummy hash si user inexistant)
- Rotation refresh token a chaque /refresh (ancien supprime, nouveau genere et renvoye)
- Strip EXIF metadata sur photos uploadees (sharp.rotate() preserve l'orientation, supprime GPS/metadata)
- Error handler ne leak plus le nom de colonne DB (err.column supprime du message 23502)
- Pagination plafonnee a 100 (Math.min sur les deux endpoints pagines)
- Cache en memoire (30s TTL) sur endpoint stats/leaderboard (utils/cache.js)
- Validation contenu image via sharp (rejette les fichiers non-image meme si mimetype correct, 400)
- Headers securite helmet (X-Content-Type-Options, X-Frame-Options, Strict-Transport-Security, etc.)
- Rate limiting global API (100 req/min par IP) + upload strict (20 req/min) sur photo.routes.js

- Limite explicite body size 100kb sur express.json() et express.urlencoded()
- Echappement wildcards LIKE/ILIKE (%, _, \\ echappes dans les recherches event)

- npm audit : 2 vulns high dans tar (dep de bcrypt via node-pre-gyp) — install-time only, corrige par migration argon2 en Phase 4
- WebSocket IDOR corrige : chat:join verifie appartenance au match, event:join verifie inscription a l'event (+ typing/markRead bloques si pas dans le room)
- Handlers unhandledRejection et uncaughtException : log l'erreur puis graceful shutdown (evite crash silencieux)
- Limite longueur messages chat 5000 caracteres (XSS stocke non pertinent car React echappe par defaut)
- CORS socket : ne depend plus de NODE_ENV, utilise CORS_ORIGINS (si vide = tout accepte = dev, si rempli = strict)
- Path traversal : resolveUploadPath() verifie que le chemin reste dans UPLOAD_DIR (stripExif, deletePhotoFile)
- trust proxy active (prepare Cloudflare : rate limiting utilise X-Forwarded-For au lieu de l'IP proxy)
- Docker logging persistant avec rotation (json-file, 10m max, 3-5 fichiers par service)

### Phase 4 - Apres la beta
18. Email orga beta hardcode dans orga.controller.js:17
22. Migrer bcrypt vers argon2 pour le hash des mots de passe (user, orga, event) — necessite migration des hash existants en DB
23. Enlever le leaderboard
24. Password policy plus stricte (majuscule, chiffre, caractere special)

## Branches
- `main` : branche principale
- `apiToFront` : branche de dev actuelle
