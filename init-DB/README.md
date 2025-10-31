# Dating Site Database - Setup

Base de données PostgreSQL pour l'application de rencontres.

## 🚀 Installation rapide

### Prérequis
1. Installe Docker Desktop : https://www.docker.com/products/docker-desktop
2. Assure-toi que Docker est lancé (icône dans la barre des tâches/menu)

### Configuration initiale

```bash
# 1. Clone le repo (ou extrais le ZIP)
cd dating_db

# 2. Copie le fichier d'exemple
cp .env.example .env

# 3. Édite le fichier .env et change les valeurs
nano .env   # ou avec ton éditeur préféré
```

**Important** : Change au minimum `POSTGRES_PASSWORD` avec un mot de passe fort !

### Démarrage

```bash
# Lance la base de données
docker-compose up -d

# Vérifie que ça tourne
docker-compose ps
```

La base de données est maintenant disponible ! ✅

## 📊 Connexion à la base

Les informations de connexion sont dans ton fichier `.env`.

Par défaut :
```
Host:     localhost
Port:     5432 (ou la valeur dans .env)
Database: (celui que tu as mis dans .env)
User:     (celui que tu as mis dans .env)
Password: (celui que tu as mis dans .env)
```

### Avec psql (ligne de commande)
```bash
# Utilise les valeurs de ton .env
psql -h localhost -U dating_admin -d dating_site -W
```

### Avec un client graphique
- **pgAdmin** : https://www.pgadmin.org/
- **DBeaver** : https://dbeaver.io/
- **TablePlus** : https://tableplus.com/

Configure une nouvelle connexion avec les informations de ton `.env`.

## 🔐 Sécurité

### ⚠️ IMPORTANT
- Le fichier `.env` contient tes mots de passe
- Il est automatiquement ignoré par Git (voir `.gitignore`)
- **NE JAMAIS** commit le fichier `.env`
- Partage uniquement `.env.example` sur GitHub

### Générer un mot de passe sécurisé

```bash
# Sur Linux/Mac
openssl rand -base64 32

# Ou utilise un générateur en ligne
# https://passwordsgenerator.net/
```

## 🛠️ Commandes utiles

```bash
# Voir les logs
docker-compose logs -f

# Arrêter la base
docker-compose down

# Arrêter ET supprimer les données (attention !)
docker-compose down -v

# Redémarrer
docker-compose restart

# Voir l'état
docker-compose ps
```

## 🔄 Mise à jour du schéma

Si le schéma de la base évolue :

```bash
# 1. Arrête la base
docker-compose down -v

# 2. Remplace le fichier init.sql par la nouvelle version

# 3. Relance
docker-compose up -d
```

## 📝 Structure du projet

```
dating_db/
├── docker-compose.yml  # Configuration Docker
├── .env.example       # Template de configuration (à commit)
├── .env               # Tes vrais secrets (JAMAIS commit)
├── .gitignore         # Protection des fichiers sensibles
├── init.sql           # Schéma de base (sans données sensibles)
└── README.md          # Ce fichier
```

## 🐛 Problèmes courants

### "POSTGRES_PASSWORD not set"
```bash
# Assure-toi d'avoir créé le fichier .env
cp .env.example .env
# Puis édite .env avec tes valeurs
```

### Port 5432 déjà utilisé
Si tu as déjà PostgreSQL installé localement :
```bash
# Dans .env, change le port
POSTGRES_PORT=5433
```

### La base ne démarre pas
```bash
# Vérifie les logs
docker-compose logs postgres

# Redémarre proprement
docker-compose down
docker-compose up -d
```

## 🚀 Déploiement en production

Pour déployer sur un serveur :

1. **Sur le serveur**, crée un `.env` avec des valeurs de production
2. Utilise des mots de passe forts (32+ caractères)
3. Configure des sauvegardes régulières
4. Ne pas exposer le port 5432 publiquement
5. Utilise un réseau Docker privé
6. Active SSL/TLS pour PostgreSQL

### Variables d'environnement sur serveur

Au lieu d'utiliser `.env`, configure les variables directement :

```bash
# Exemple avec systemd ou dans ton CI/CD
export POSTGRES_PASSWORD="ton_super_mot_de_passe_production"
docker-compose up -d
```

---

**Besoin d'aide ?** Contacte-moi !