# Demande de financement EIP — Projet Init

**Date :** Mars 2026
**Groupe EIP :** Antton Ducos, Armand Dufresne, Rémy Thai, Simon Maigrot
**Programme :** Epitech Innovative Project (EIP)

---

## 1. Présentation du projet

**Init** est une application de rencontres éphémère dédiée aux événements. Elle permet aux participants d'un événement (soirée, festival, conférence, meetup) de se découvrir, matcher et échanger avant, pendant et après l'événement.

L'application est disponible sur **3 plateformes** : application mobile (iOS & Android), application web (init-app.tech) et API temps réel avec messagerie WebSocket.

Fonctionnalités clés : création d'événements par des organisateurs, inscription par whitelist / lien / mot de passe, profils avec photos, swipe / like / match, messagerie instantanée, tableau de bord organisateur, modération et suppression automatique des données post-événement (RGPD).

**État actuel :** 273 commits sur 5 mois, 15 tables en production, application déployée sur init-app.tech, premiers événements réels avec **250+ participants**, conformité RGPD complète.

---

## 2. Problématique

### Infrastructure actuelle — DigitalOcean (financée par l'équipe)

Le développement d'Init a débuté **avant le cadre du projet EIP**. L'équipe finance sa propre infrastructure :

| Ressource | Valeur |
|-----------|--------|
| Type | Droplet Premium Intel |
| vCPU / RAM / Disque | 2 vCPU / 2 GB / 90 GB NVMe SSD |
| Coût | **24 $/mois (~22 €/mois)**, financé par l'équipe |

**Problème critique :** les 2 GB de RAM sont insuffisants pour faire tourner les 5 services simultanés (PostgreSQL, API Node.js + Socket.io, Next.js SSR, Nginx, Mailu). Nous avons dû **allouer de l'espace disque en mémoire swap** pour compenser le manque de RAM, ce qui dégrade fortement les performances (le disque étant ~100x plus lent que la RAM).

Lors de notre dernier événement (250+ utilisateurs simultanés) : latence API x3 à x5, déconnexions WebSocket fréquentes, traitement d'images bloquant, risque de crash par saturation mémoire (OOM kill).

### Serveur proposé par Epitech

| Ressource | Valeur |
|-----------|--------|
| vCPU / RAM / Disque | 1 vCPU / 2 GB / 25 GB |

Ce serveur est **moins performant** que celui que nous payons déjà (1 vCPU vs 2, 25 GB de disque vs 90 GB) et **notre serveur actuel est déjà insuffisant**.

### Partenariat en attente : Bordeaux Open Air

**Bordeaux Open Air** est un festival de musique électronique en plein air, gratuit et reconnu par la Ville de Bordeaux, qui rassemble **plusieurs dizaines de milliers de festivaliers** chaque été.

Le festival est **potentiellement intéressé par Init** pour connecter ses festivaliers. Ce partenariat implique de supporter **plusieurs milliers d'utilisateurs simultanés** — impossible avec notre infrastructure actuelle. Ne pas pouvoir honorer ce partenariat serait une occasion manquée pour le projet et la visibilité d'Epitech.

---

## 3. Budget détaillé

> **Note :** Les prix OVHcloud sont affichés HT. La TVA (20%) est appliquée dans le récapitulatif. Les tarifs Apple et Google sont TTC (facturés aux particuliers).

### CAPEX — Investissements ponctuels

| Poste | Coût |
|-------|------|
| Compte Apple Developer (publication App Store — annuel) | 99 €/an TTC |
| Compte Google Play Developer (publication Play Store — unique) | 25 $ (~23 €) TTC |
| Nom de domaine init-app.tech (annuel) | ~10 €/an |
| **Total CAPEX année 1** | **~132 €** |

### OPEX — Coûts récurrents

Configuration demandée : **3 VPS OVHcloud 2026** pour isoler les services :

| Serveur | Specs | Rôle | Coût HT/mois |
|---------|-------|------|-------------|
| **VPS 1 — Base de données** | 4 vCores / 8 GB / 75 GB | PostgreSQL + Redis | 7,79 € |
| **VPS 2 — API Backend** | 4 vCores / 8 GB / 75 GB | Node.js + Socket.io + stockage photos | 7,79 € |
| **VPS 3 — Frontend + Proxy** | 4 vCores / 8 GB / 75 GB | Next.js + Nginx + Mailu | 7,79 € |
| **Total mensuel** | | | **23,37 € HT / 28,04 € TTC** |
| **Total annuel** | | | **280,44 € HT / 336,53 € TTC** |

### Comparaison des configurations

| | Serveur Epitech | DigitalOcean actuel | 3× VPS OVH (demandé) |
|---|---|---|---|
| vCPU | 1 | 2 | **12** (3 × 4) |
| RAM | 2 GB | 2 GB (+swap disque) | **24 GB** (3 × 8 GB) |
| Disque | 25 GB | 90 GB NVMe | **225 GB** (3 × 75 GB) |
| Isolation | Tout sur 1 machine | Tout sur 1 machine | **DB / API / Front séparés** |
| Capacité estimée | ~100 users | ~200 users | **~1 000+ users** |

Services gratuits : Cloudflare (CDN + DDoS), Let's Encrypt (SSL), Mailu (email), GitHub.

---

## 4. Récapitulatif financier — Année 1

| Catégorie | Montant TTC |
|-----------|-------------|
| **CAPEX** — Apple (99€) + Google (23€) + Domaine (10€) | **132 €** |
| **OPEX** — 3 VPS OVH × 12 mois (28,04€ × 12) | **336,53 €** |
| **Total année 1** | **~469 €** |
| **Coût mensuel moyen** | **~39 €/mois** |

---

## 5. Justification technique

### Pourquoi 3 serveurs ?

**Isolation des pannes** — Si l'API crash, la base de données et le frontend restent opérationnels.

**Ressources dédiées** — PostgreSQL a besoin de RAM pour ses caches, Node.js + Socket.io a besoin de CPU pour le temps réel. Sur un serveur unique, ils se disputent les mêmes ressources et on est contraint d'utiliser du swap disque.

**Sécurité** — La base de données n'est pas exposée sur Internet, seul le VPS API s'y connecte via réseau privé.

**Scalabilité** — Possibilité d'ajouter un 2ème serveur API derrière un load balancer si l'affluence augmente.

---

## 6. Perspectives de croissance

**Court terme (3-6 mois)** — Publication sur l'App Store et le Google Play Store, partenariats événements étudiants (BDE, associations), déploiement avec **Bordeaux Open Air**.

**Moyen terme (6-12 mois)** — Événements professionnels (networking, salons), partenariats festivals, monétisation (abonnement organisateur premium).

**Long terme (12+ mois)** — Expansion géographique, internationalisation (FR/EN/ES déjà implémenté).

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
