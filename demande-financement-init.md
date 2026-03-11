# Demande de financement EIP — Projet Init

**Date :** Mars 2026
**Groupe EIP :** Antton Ducos, Armand Dufresne, Rémy Thai, Simon Maigrot
**Programme :** Epitech Innovative Project (EIP)

---

## 1. Présentation du projet

Chaque année, des millions de personnes participent à des festivals, soirées et meetups, souvent entourées d'inconnus avec qui elles ne se parleront jamais. **Init** transforme chaque événement en opportunité de rencontre.

Init est une application éphémère de rencontres, pensée pour les événements. Elle permet aux participants de se découvrir, matcher et échanger dans un cadre limité dans le temps : une fois l'événement terminé, les interactions sont verrouillées, plus de swipe, plus de nouveaux messages. L'expérience reste liée au moment.

L'application est disponible en **web** (init-app.tech) et en cours de production sur **mobile** (Android, iOS à venir), avec messagerie instantanée en temps réel.

Fonctionnalités clés : création d'événements par des organisateurs, inscription par whitelist, profils avec photos, swipe / like / match, messagerie instantanée, tableau de bord organisateur et modération.

**État actuel :** application déployée en production sur init-app.tech, 15 tables en base de données, 649 tests unitaires (42 suites). Premier événement réel avec **plus de 250 participants**, **1 443 matches générés** et **100% d'engagement** (tous les inscrits ont utilisé l'application).

---

## 2. Problématique

### Infrastructure actuelle — DigitalOcean (financée par l'équipe)

Le développement d'Init a débuté **avant le cadre du projet EIP**. L'équipe finance sa propre infrastructure :

| Ressource | Valeur |
|-----------|--------|
| Type | Droplet Premium Intel |
| vCPU / RAM / Disque | 2 vCPU / 2 GB / 90 GB NVMe SSD |
| Coût | **24 $/mois (~22 €/mois)**, financé par l'équipe |

**Problème critique :** les 2 GB de RAM sont insuffisants pour faire tourner les **12 conteneurs Docker** simultanés (PostgreSQL, API Node.js + Socket.io, Next.js SSR, Nginx, Mailu — 8 conteneurs à lui seul). Nous avons dû **allouer de l'espace disque en mémoire swap** pour compenser le manque de RAM, le disque étant ~100x plus lent que la RAM.

Lors de notre dernier événement (250+ utilisateurs simultanés), nous avons constaté une **dégradation notable des performances** : ralentissements de l'API, instabilité des connexions WebSocket et traitement d'images bloquant. Le serveur fonctionnait en permanence sur la mémoire swap, à la limite du crash par saturation mémoire (OOM kill).

### Serveur proposé par Epitech (partenariat OVH)

Dans le cadre du partenariat Epitech–OVH, un VPS d2-2 est proposé aux groupes EIP :

| Ressource | Valeur |
|-----------|--------|
| vCPU / RAM / Disque | 1 vCPU / 2 GB / 25 GB |

Ce serveur est **moins performant** que celui que nous payons déjà (1 vCPU vs 2, 25 GB de disque vs 90 GB) et **notre serveur actuel est déjà insuffisant**.

### Partenariat en cours : Bordeaux Open Air

**Bordeaux Open Air** est un festival de musique électronique en plein air, gratuit et reconnu par la Ville de Bordeaux, qui rassemble **plusieurs dizaines de milliers de festivaliers** chaque été.

Nous sommes **en discussion avec les organisateurs du festival** et un appel est prévu prochainement. L'objectif est de déployer Init lors d'une prochaine édition pour connecter les festivaliers. Ce partenariat implique de supporter **plusieurs milliers d'utilisateurs simultanés** — impossible avec notre infrastructure actuelle.

### Ce constat justifie notre demande

Notre infrastructure actuelle est saturée, le serveur proposé par Epitech est insuffisant, et une opportunité concrète de déploiement à grande échelle se présente. C'est pourquoi nous demandons des ressources adaptées à l'ambition du projet.

---

## 3. Budget détaillé

> **Note :** Les prix OVHcloud sont ceux de la gamme VPS 2026, affichés HT (tarifs au 1er avril 2026). La TVA (20%) est appliquée dans le récapitulatif. Les tarifs Apple et Google sont TTC.

### CAPEX — Investissements ponctuels

| Poste | Coût |
|-------|------|
| Compte Apple Developer (publication App Store — annuel) | 99 €/an TTC |
| Compte Google Play Developer (publication Play Store — unique) | 25 $ (~23 €) TTC |
| **Total CAPEX année 1** | **~122 €** |

> Le nom de domaine init-app.tech est actuellement couvert par le GitHub Student Developer Pack.

### OPEX — Coûts récurrents

Nous proposons **deux configurations** selon la phase du projet, permettant une montée en charge progressive :

#### Configuration A — Beta & événements étudiants

**2 VPS OVHcloud 2026** pour isoler la base de données du reste de l'application :

| Poste | Specs | Rôle | Coût HT/mois |
|-------|-------|------|-------------|
| **VPS 1 — Base de données** | 4 vCores / 8 GB / 75 GB NVMe | PostgreSQL + Redis | 7,79 € |
| **VPS 2 — Application** | 4 vCores / 8 GB / 75 GB NVMe | API Node.js + Socket.io + Next.js + Nginx | 7,79 € |
| **Email Pro** | 5 boîtes × 15 Go | Communication projet @init-app.tech (aliases : no-reply@, admin@) | 7,95 € |
| **Total mensuel** | | | **23,53 € HT / 28,24 € TTC** |
| **Total annuel** | | | **282,36 € HT / 338,83 € TTC** |

Stockage photos sur le VPS Application (75 GB). Suffisant pour ~7 000 utilisateurs (6 photos × 5 MB = 30 MB/utilisateur).

**Capacité :** événements jusqu'à **500 utilisateurs simultanés** — couvre les betas, événements étudiants (BDE, associations) et les premiers partenariats.

#### Configuration B — Montée en charge (Bordeaux Open Air)

Upgrade des VPS + ajout d'Object Storage pour supporter un festival à grande échelle :

| Poste | Specs | Rôle | Coût HT/mois |
|-------|-------|------|-------------|
| **VPS 1 — Base de données** | 6 vCores / 12 GB / 100 GB NVMe | PostgreSQL + Redis | 11,99 € |
| **VPS 2 — Application** | 6 vCores / 12 GB / 100 GB NVMe | API Node.js + Socket.io + Next.js + Nginx | 11,99 € |
| **Object Storage S3** | ~150 GB | Photos utilisateurs (offload du VPS) | ~1,05 € |
| **Email Pro** | 5 boîtes × 15 Go | (identique) | 7,95 € |
| **Total mensuel** | | | **32,98 € HT / 39,58 € TTC** |
| **Total annuel** | | | **395,76 € HT / 474,91 € TTC** |

L'Object Storage permet de supporter **des dizaines de milliers d'utilisateurs** sans contrainte de disque. L'upgrade VPS-1 → VPS-2 se fait sans reconfiguration.

**Capacité :** événements jusqu'à **plusieurs milliers d'utilisateurs simultanés** — dimensionné pour un déploiement lors de Bordeaux Open Air (14 000+ festivaliers, taux d'adoption estimé à 10-15%).

### Comparaison des configurations

| | Serveur Epitech (OVH d2-2) | DigitalOcean actuel | Config A (demandée) | Config B (upgrade) |
|---|---|---|---|---|
| vCPU | 1 | 2 | **8** (2 × 4) | **12** (2 × 6) |
| RAM | 2 GB | 2 GB (+swap) | **16 GB** (2 × 8) | **24 GB** (2 × 12) |
| Disque | 25 GB | 90 GB NVMe | **150 GB** NVMe | **200 GB** NVMe + S3 |
| Isolation | Tout sur 1 machine | Tout sur 1 machine | **DB / App séparés** | **DB / App séparés** |
| Email | — | Mailu (port 25 bloqué) | **Email Pro** | **Email Pro** |

Services gratuits : Cloudflare (CDN + protection DDoS), Let's Encrypt (SSL), GitHub (CI/CD). Le domaine init-app.tech est couvert pour 1 an via le GitHub Student Developer Pack.

### Récapitulatif — Configuration A (demande initiale)

| Catégorie | Montant TTC |
|-----------|-------------|
| **CAPEX** — Apple (99 €) + Google (23 €) | **122 €** |
| **OPEX** — 2 VPS + Email Pro × 12 mois (28,24 € × 12) | **338,83 €** |
| **Total année 1** | **~461 €** |
| **Coût mensuel moyen** | **~38 €/mois** |

### Récapitulatif — Configuration B (si partenariat BOA confirmé)

| Catégorie | Montant TTC |
|-----------|-------------|
| **CAPEX** — (identique) | **122 €** |
| **OPEX** — 2 VPS + Object Storage + Email Pro × 12 mois (39,58 € × 12) | **474,91 €** |
| **Total année 1** | **~597 €** |
| **Coût mensuel moyen** | **~50 €/mois** |

> L'upgrade de la Config A vers la Config B se fait en quelques minutes (changement de gamme VPS + activation Object Storage), sans migration ni interruption de service.

> **À noter :** l'équipe finance déjà son infrastructure à hauteur de **22 €/mois** depuis le début du projet. La Config A représente un coût comparable (28 €/mois) pour des ressources significativement supérieures.

---

## 4. Justification technique

### Pourquoi 2 serveurs séparés ?

**Ressources dédiées** — PostgreSQL a besoin de RAM pour ses caches et index. De son côté, l'API cumule des tâches CPU-intensives : traitement d'images en temps réel (Sharp), hachage de mots de passe (Argon2) et gestion de centaines de connexions WebSocket persistantes (Socket.io). Sur un serveur unique, ces services se disputent les mêmes ressources — c'est exactement ce qui nous contraint aujourd'hui à utiliser du swap disque.

**Isolation des pannes** — Si l'API subit un pic de charge (ex: début de soirée, tout le monde swipe en même temps), la base de données continue de fonctionner normalement. Et inversement, une requête SQL lourde (agrégation de statistiques) ne bloque pas les connexions WebSocket.

**Sécurité** — La base de données n'est pas exposée sur Internet. Son firewall n'accepte que les connexions provenant de l'IP du VPS Application. Aucun accès direct depuis l'extérieur.

**Scalabilité** — L'architecture est conçue pour évoluer : si la charge augmente, on peut déployer plusieurs instances de l'API derrière un load balancer (Nginx), avec Redis comme broker entre les instances Socket.io. Ce scaling horizontal ne nécessite aucune modification de la base de données.

---

## 5. Perspectives de croissance

**Déjà réalisé** — Application fonctionnelle déployée en production, première beta réussie, infrastructure Docker complète, 649 tests unitaires. Le produit existe et a fait ses preuves.

**Court terme (3-6 mois)** — Publication sur les stores mobiles (conditionnée à l'obtention des comptes développeur), partenariats événements étudiants (BDE, associations). Si le partenariat avec **Bordeaux Open Air** se confirme, déploiement lors de l'édition estivale.

**Moyen terme (6-12 mois)** — Élargissement à d'autres festivals et événements festifs, monétisation (fonctionnalités premium pour les organisateurs et les utilisateurs).

**Long terme (12+ mois)** — Expansion géographique, diversification des types de rencontres (amicales, amoureuses) selon les événements.

---

## 6. Équipe

| Membre | Rôle |
|--------|------|
| **Antton Ducos** | Software Engineer — API & Database |
| **Armand Dufresne** | Fullstack Developer |
| **Rémy Thai** | Mobile Developer — UI Designer |
| **Simon Maigrot** | Web Developer — UI Designer |

Étudiants en **Tek3 à Epitech** dans le cadre du programme **EIP** (Epitech Innovative Project).

---

## 7. Contact

- **Email :** antton.ducos@gmail.com
- **Site :** https://init-app.tech
---

*Projet EIP — Epitech, mars 2026*
