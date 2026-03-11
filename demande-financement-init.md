# Demande de financement EIP — Projet Init

**Date :** Mars 2026
**Groupe EIP :** Antton Ducos, Rémy Thai, Simon Maigrot
**Programme :** Epitech Innovative Project (EIP)

---

## 1. Présentation du projet

### Qu'est-ce que Init ?

**Init** est une application de rencontres éphémère dédiée aux événements. Elle permet aux participants d'un événement (soirée, festival, conférence, meetup) de se découvrir, matcher et échanger avant, pendant et après l'événement.

L'application est disponible sur **3 plateformes** :
- **Application mobile** (iOS & Android) — React Native / Expo
- **Application web** — Next.js (init-app.tech)
- **API temps réel** — Node.js / Express / Socket.io

### Fonctionnalités principales

- Création et gestion d'événements par des organisateurs
- Système d'inscription avec whitelist, liens d'accès, mots de passe
- Profils personnalisables avec photos et champs custom par événement
- Système de swipe / like / match entre participants d'un même événement
- Messagerie instantanée en temps réel (WebSocket)
- Tableau de bord organisateur avec statistiques
- Système de signalement et modération
- Suppression automatique des données à la fin de l'événement (RGPD)

### État d'avancement

- **273 commits** sur 5 mois de développement actif (octobre 2025 → mars 2026)
- **15 tables** de base de données en production
- Application **déployée et fonctionnelle** sur init-app.tech
- Premiers événements réels organisés avec **250+ participants**
- Conformité RGPD (CGU, politique de confidentialité, mentions légales)

---

## 2. Problématique : pourquoi cette demande ?

### Notre infrastructure actuelle (DigitalOcean, financée par l'équipe)

Le développement d'Init a débuté **avant le cadre du projet EIP**. Nous avons donc mis en place notre propre infrastructure sur DigitalOcean, financée par l'équipe :

| Ressource | Valeur |
|-----------|--------|
| Type | Droplet Premium Intel |
| vCPU | 2 vCPU (Intel) |
| RAM | 2 GB |
| Disque | 90 GB NVMe SSD |
| Bande passante | 3 TB transfert |
| Coût | **24 $/mois (~22 €/mois)**, financé par l'équipe |

### Le serveur proposé par Epitech

Epitech met à disposition des projets EIP un VPS avec les caractéristiques suivantes :

| Ressource | Valeur |
|-----------|--------|
| Type | VPS |
| vCPU | 1 vCPU (x86_64) |
| RAM | 2 GB |
| Disque | 25 GB |
| Bande passante | 100 Mbps |
| Traffic | Illimité |
| SLA | 99.95% |

Ce serveur est **encore moins performant** que celui que nous payons déjà (1 vCPU au lieu de 2, 25 GB de disque au lieu de 90 GB), et **notre serveur actuel est déjà insuffisant**.

### Pourquoi ni l'un ni l'autre ne suffit

Init fait tourner **5 services** simultanément :

| Service | Conso RAM estimée | Conso CPU |
|---------|-------------------|-----------|
| PostgreSQL 17 (base de données) | 300-500 MB | Modérée |
| Node.js API + Socket.io (temps réel) | 200-400 MB | Élevée (WebSocket + traitement d'images) |
| Next.js SSR (frontend web) | 200-300 MB | Modérée (rendu serveur) |
| Nginx (reverse proxy) | 50 MB | Faible |
| Mailu (serveur email) | 200-300 MB | Faible |
| **Total estimé** | **~1.0-1.5 GB** | **2 vCPU saturés en pic** |

Avec **2 GB de RAM**, il ne reste quasiment rien pour absorber les pics de charge. Lors de notre dernier événement avec **250+ utilisateurs simultanés**, nous avons constaté :

- **Latence élevée** sur les requêtes API (temps de réponse x3 à x5)
- **Déconnexions WebSocket** fréquentes (messagerie temps réel instable)
- **Traitement d'images ralenti** (upload de photos bloquant le serveur)
- **Risque de crash** par saturation mémoire (OOM kill)

Le serveur Epitech aggraverait ces problèmes (1 seul vCPU, 25 GB de disque insuffisant pour le stockage des photos utilisateurs).

### Un partenariat concret en attente : Bordeaux Open Air

**Bordeaux Open Air** est un festival de musique électronique en plein air, organisé chaque été à Bordeaux et dans la métropole. C'est un événement **gratuit, pluriculturel et multigénérationnel** qui rassemble **plusieurs dizaines de milliers de festivaliers** sur plusieurs dimanches pendant l'été.

Le festival est aujourd'hui considéré comme un **événement incontournable de la scène électronique bordelaise**, reconnu par la Ville de Bordeaux, avec une approche éco-responsable et inclusive.

**Bordeaux Open Air est potentiellement intéressé par Init** pour permettre à ses festivaliers de se connecter, matcher et échanger avant, pendant et après les événements. Ce type de partenariat représente une opportunité majeure pour le projet, mais implique de pouvoir supporter **plusieurs milliers d'utilisateurs simultanés** — ce qui est impossible avec notre infrastructure actuelle.

Ne pas pouvoir honorer ce partenariat par manque de ressources serveur serait une occasion manquée pour le projet et pour la visibilité d'Epitech à travers l'EIP.

### Ce que nous demandons

Un financement pour passer d'une infrastructure limitée à **une infrastructure de production** capable de supporter **1 000 à 5 000 utilisateurs simultanés**, et publier l'application sur les stores mobiles.

---

## 3. Budget détaillé

### CAPEX — Investissements ponctuels

| Poste | Détail | Coût (HT) |
|-------|--------|-----------|
| **Compte Apple Developer** | Publication sur l'App Store — abonnement annuel obligatoire | 99 $/an (~91 €) |
| **Compte Google Play Developer** | Publication sur le Play Store — frais unique à vie | 25 $ (~23 €) |
| **Nom de domaine** | init-app.tech — renouvellement annuel | ~10 €/an |
| **Certificat SSL** | Let's Encrypt — gratuit et automatisé | 0 € |
| | | |
| **Total CAPEX année 1** | | **~124 €** |

### OPEX — Coûts récurrents (mensuels)

#### Configuration demandée — 3 VPS OVH (~36 €/mois)

Séparation des services sur **3 serveurs dédiés** pour isoler les charges :

| Serveur | Spec OVH | Rôle | Coût/mois |
|---------|----------|------|-----------|
| **VPS 1 — Base de données** | B2-7 (4 GB RAM / 2 vCPU / 80 GB SSD) | PostgreSQL + Redis (cache et sessions) | 12,00 € |
| **VPS 2 — API Backend** | B2-7 (4 GB RAM / 2 vCPU / 80 GB SSD) | Node.js API + Socket.io + stockage photos | 12,00 € |
| **VPS 3 — Frontend + Proxy** | B2-7 (4 GB RAM / 2 vCPU / 80 GB SSD) | Next.js + Nginx reverse proxy + Mailu | 12,00 € |
| | | | |
| **Total mensuel** | | | **36,00 €** |
| **Total annuel** | | | **432,00 €** |

**Capacité estimée : ~1 000 utilisateurs simultanés**

### Comparaison des configurations

| Ressource | Serveur Epitech (proposé) | DigitalOcean (actuel, payé par l'équipe) | 3x VPS OVH B2-7 (demandé) |
|-----------|--------------------------|------------------------------------------|---------------------------|
| vCPU | 1 | 2 | **6** (3 × 2) |
| RAM | 2 GB | 2 GB | **12 GB** (3 × 4 GB) |
| Disque | 25 GB | 90 GB NVMe | **240 GB** (3 × 80 GB) |
| Isolation | Tout sur 1 machine | Tout sur 1 machine | **DB / API / Front séparés** |
| Capacité estimée | ~100 users simultanés | ~200 users simultanés | **~1 000 users simultanés** |

### Services gratuits utilisés (aucun coût supplémentaire)

| Service | Usage | Coût |
|---------|-------|------|
| Cloudflare | CDN mondial, HTTPS automatique, protection DDoS | Gratuit |
| Let's Encrypt | Certificats SSL | Gratuit |
| Mailu (auto-hébergé) | Serveur email @init-app.tech | Gratuit |
| GitHub | Hébergement du code source | Gratuit |

---

## 4. Récapitulatif financier — Année 1

| Catégorie | Détail | Montant |
|-----------|--------|---------|
| **CAPEX** | Apple Developer (91€) + Google Play (23€) + Domaine (10€) | **124 €** |
| **OPEX** | 3 VPS OVH × 12 mois (36€ × 12) | **432 €** |
| | | |
| **Total année 1** | | **556 €** |
| **Coût mensuel moyen** | | **~46 €/mois** |

---

## 5. Justification technique

### Pourquoi 3 serveurs et pas 1 plus gros ?

**1. Isolation des pannes** — Si l'API crash (bug, pic de charge), la base de données et le frontend restent opérationnels. Sur un serveur unique, tout tombe en même temps.

**2. Allocation dédiée des ressources** — PostgreSQL a besoin de RAM pour ses caches et buffers. Node.js + Socket.io a besoin de CPU pour les connexions temps réel. Sur un serveur partagé, ils se disputent les mêmes ressources.

**3. Sécurité** — La base de données n'est pas exposée sur Internet. Seul le VPS API peut s'y connecter via un réseau privé OVH (vRack).

**4. Scalabilité future** — Si l'affluence augmente, on peut ajouter un 2ème serveur API derrière un load balancer sans toucher au reste de l'infrastructure.

### Améliorations techniques prévues avec le nouveau setup

| Problème actuel | Solution | Impact |
|----------------|----------|--------|
| Tout sur 1 serveur (1 vCPU / 2 GB) | 3 serveurs dédiés (6 vCPU / 12 GB) | x5 capacité utilisateurs |
| Cache en mémoire (perdu au restart) | Redis sur le serveur DB | Réponses API 10x plus rapides |
| Pas de compression HTTP | Gzip activé via Nginx | -70% bande passante consommée |
| Socket.io limité à 1 instance | Redis adapter pour Socket.io | Scalable sur plusieurs serveurs |
| 20 connexions DB max (2 GB RAM) | Pool augmenté à 50+ (4 GB RAM) | Supporte plus de requêtes simultanées |
| 25 GB de disque total | 240 GB répartis sur 3 serveurs | Stockage photos largement suffisant |

---

## 6. Perspectives de croissance

### Court terme (3-6 mois)
- Publication sur l'**App Store** et le **Google Play Store**
- Partenariats avec des organisateurs d'événements étudiants (BDE, associations)
- **Déploiement avec Bordeaux Open Air** (festival électronique, dizaines de milliers de festivaliers)
- Objectif : 500 à 2 000 utilisateurs actifs

### Moyen terme (6-12 mois)
- Ouverture aux événements professionnels (networking, meetups, salons)
- Partenariats avec d'autres festivals et événements culturels
- Système de monétisation (abonnement organisateur premium)
- Objectif : **50 événements / mois**, 5 000 utilisateurs actifs

### Long terme (12+ mois)
- Expansion géographique (autres villes, autres pays)
- Internationalisation de l'application (FR/EN/ES déjà implémenté)
- Objectif : **200+ événements / mois**, 20 000+ utilisateurs actifs

---

## 7. Équipe

| Membre | Rôle |
|--------|------|
| **Antton Ducos** | Software Engineer — API & Database |
| **Armand Dufresne** | Fullstack Developer |
| **Rémy Thai** | Mobile Developer — UI Designer |
| **Simon Maigrot** | Web Developer — UI Designer |

Étudiants à **Epitech** dans le cadre du programme **EIP** (Epitech Innovative Project).

---

## 8. Contact

- **Email :** antton.ducos@gmail.com
- **Site :** https://init-app.tech
---

*Projet EIP — Epitech, mars 2026*
