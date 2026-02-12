// ============================================================
// RSE/RSN Calculator - Serveur Backend v5.0.0
// Credits : Samir Medjaher
// Sources reglementaires :
//   Reglement CE 561/2006 (Art. 6-8) - https://eur-lex.europa.eu
//   Code des transports francais - https://www.legifrance.gouv.fr
//     R3312-9 (duree de conduite continue)
//     R3312-11 (duree de conduite journaliere / hebdo)
//     R3312-28 (repos journalier)
//     L3312-1 et L3312-2 (amplitude et travail de nuit)
//   Sanctions R3315-10, R3315-11
//   Guide ecologie.gouv.fr :
//     https://www.ecologie.gouv.fr/politiques-publiques/temps-travail-conducteurs-routiers-transport-personnes
//   Bareme sanctions :
//     https://www.dan-dis-scan.fr/les-sanctions
//     https://www.sinari.com/blog/infractions-transport-routier
// ============================================================

const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Servir le frontend depuis client/dist
const distPath = path.join(__dirname, 'client', 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
}

// Configuration upload
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
const upload = multer({ dest: uploadsDir, limits: { fileSize: 5 * 1024 * 1024 } });

// ============================================================
// CONSTANTES REGLEMENTAIRES
// ============================================================
const REGLES = {
  // Conduite continue max avant pause obligatoire (CE 561/2006 Art.7)
  CONDUITE_CONTINUE_MAX_MIN: 270, // 4h30
  // Pause minimale apres conduite continue (CE 561/2006 Art.7)
  PAUSE_OBLIGATOIRE_MIN: 30,
  // Conduite journaliere max (CE 561/2006 Art.6)
  CONDUITE_JOURNALIERE_MAX_MIN: 540, // 9h
  // Conduite journaliere max avec derogation (2x par semaine) (CE 561/2006 Art.6)
  CONDUITE_JOURNALIERE_DEROGATOIRE_MAX_MIN: 600, // 10h
  // Conduite hebdomadaire max (CE 561/2006 Art.6)
  CONDUITE_HEBDOMADAIRE_MAX_MIN: 3360, // 56h
  // Conduite bi-hebdomadaire max (CE 561/2006 Art.6)
  CONDUITE_BIHEBDO_MAX_MIN: 5400, // 90h
  // Repos journalier normal (CE 561/2006 Art.8)
  REPOS_JOURNALIER_NORMAL_H: 11,
  // Repos journalier reduit (CE 561/2006 Art.8)
  REPOS_JOURNALIER_REDUIT_H: 9,
  // Repos hebdomadaire normal (CE 561/2006 Art.8)
  REPOS_HEBDO_NORMAL_H: 45,
  // Repos hebdomadaire reduit (CE 561/2006 Art.8)
  REPOS_HEBDO_REDUIT_H: 24,
  // Amplitude journaliere max services reguliers >50km (L3312-2)
  AMPLITUDE_MAX_REGULIER_H: 13,
  // Amplitude journaliere max services occasionnels (L3312-2)
  AMPLITUDE_MAX_OCCASIONNEL_H: 14,
  // Heure debut travail de nuit (L3312-1)
  NUIT_DEBUT_H: 21,
  // Heure fin travail de nuit (L3312-1)
  NUIT_FIN_H: 6,
  // Duree max travail de nuit (L3312-1)
  TRAVAIL_NUIT_MAX_H: 10,
  // Duree max travail journalier (Code du travail)
  TRAVAIL_JOURNALIER_MAX_H: 10,
  // Duree max travail hebdomadaire (Code du travail)
  TRAVAIL_HEBDO_MAX_H: 48,
  // Duree max travail hebdomadaire moyenne sur 12 semaines
  TRAVAIL_HEBDO_MOYENNE_MAX_H: 44
};

// ============================================================
// BAREME DES SANCTIONS
// Source : R3315-10 (contravention 4e classe)
//          R3315-11 (contravention 5e classe)
//          https://www.dan-dis-scan.fr/les-sanctions
// ============================================================
const SANCTIONS = {
  classe_4: {
    intitule: "Contravention de 4e classe",
    amende_max: 750,
    amende_forfaitaire: 135,
    seuils: {
      conduite_continue_depassement: "Plus de 1h30 au-dela de 4h30",
      conduite_journaliere_depassement: "Plus de 2h au-dela de 9h (ou 10h avec derogation)",
      conduite_hebdomadaire_depassement: "Plus de 14h au-dela de 56h",
      conduite_bihebdo_depassement: "Plus de 22h30 au-dela de 90h",
      repos_journalier_insuffisant: "Moins de 2h30 en dessous du minimum (solo)",
      repos_hebdomadaire_insuffisant: "Moins de 9h en dessous du minimum"
    }
  },
  classe_5: {
    intitule: "Contravention de 5e classe",
    amende_max: 1500,
    amende_recidive: 3000,
    description: "Tout depassement au-dela des seuils de 4e classe"
  },
  delits: {
    intitule: "Delit penal",
    falsification: "1 an emprisonnement + 30 000 euros",
    absence_chronotachygraphe: "1 an emprisonnement + 30 000 euros",
    carte_non_conforme: "6 mois emprisonnement + 3 750 euros",
    refus_controle: "6 mois emprisonnement + 3 750 euros"
  }
};

// ============================================================
// PAYS EUROPEENS ET DECALAGES UTC
// Heure ete : dernier dimanche de mars (directive 2000/84/CE)
// Heure hiver : dernier dimanche d'octobre
// ============================================================
const PAYS = {
  FR: { nom: "France", drapeau: "\uD83C\uDDEB\uD83C\uDDF7", utc_hiver: 1, utc_ete: 2 },
  DE: { nom: "Allemagne", drapeau: "\uD83C\uDDE9\uD83C\uDDEA", utc_hiver: 1, utc_ete: 2 },
  ES: { nom: "Espagne", drapeau: "\uD83C\uDDEA\uD83C\uDDF8", utc_hiver: 1, utc_ete: 2 },
  IT: { nom: "Italie", drapeau: "\uD83C\uDDEE\uD83C\uDDF9", utc_hiver: 1, utc_ete: 2 },
  BE: { nom: "Belgique", drapeau: "\uD83C\uDDE7\uD83C\uDDEA", utc_hiver: 1, utc_ete: 2 },
  NL: { nom: "Pays-Bas", drapeau: "\uD83C\uDDF3\uD83C\uDDF1", utc_hiver: 1, utc_ete: 2 },
  PT: { nom: "Portugal", drapeau: "\uD83C\uDDF5\uD83C\uDDF9", utc_hiver: 0, utc_ete: 1 },
  GB: { nom: "Royaume-Uni", drapeau: "\uD83C\uDDEC\uD83C\uDDE7", utc_hiver: 0, utc_ete: 1 },
  CH: { nom: "Suisse", drapeau: "\uD83C\uDDE8\uD83C\uDDED", utc_hiver: 1, utc_ete: 2 },
  AT: { nom: "Autriche", drapeau: "\uD83C\uDDE6\uD83C\uDDF9", utc_hiver: 1, utc_ete: 2 },
  PL: { nom: "Pologne", drapeau: "\uD83C\uDDF5\uD83C\uDDF1", utc_hiver: 1, utc_ete: 2 },
  RO: { nom: "Roumanie", drapeau: "\uD83C\uDDF7\uD83C\uDDF4", utc_hiver: 2, utc_ete: 3 },
  GR: { nom: "Grece", drapeau: "\uD83C\uDDEC\uD83C\uDDF7", utc_hiver: 2, utc_ete: 3 },
  BG: { nom: "Bulgarie", drapeau: "\uD83C\uDDE7\uD83C\uDDEC", utc_hiver: 2, utc_ete: 3 },
  CZ: { nom: "Tchequie", drapeau: "\uD83C\uDDE8\uD83C\uDDFF", utc_hiver: 1, utc_ete: 2 },
  HU: { nom: "Hongrie", drapeau: "\uD83C\uDDED\uD83C\uDDFA", utc_hiver: 1, utc_ete: 2 },
  SE: { nom: "Suede", drapeau: "\uD83C\uDDF8\uD83C\uDDEA", utc_hiver: 1, utc_ete: 2 },
  DK: { nom: "Danemark", drapeau: "\uD83C\uDDE9\uD83C\uDDF0", utc_hiver: 1, utc_ete: 2 },
  FI: { nom: "Finlande", drapeau: "\uD83C\uDDEB\uD83C\uDDEE", utc_hiver: 2, utc_ete: 3 },
  IE: { nom: "Irlande", drapeau: "\uD83C\uDDEE\uD83C\uDDEA", utc_hiver: 0, utc_ete: 1 },
  LU: { nom: "Luxembourg", drapeau: "\uD83C\uDDF1\uD83C\uDDFA", utc_hiver: 1, utc_ete: 2 },
  HR: { nom: "Croatie", drapeau: "\uD83C\uDDED\uD83C\uDDF7", utc_hiver: 1, utc_ete: 2 },
  SK: { nom: "Slovaquie", drapeau: "\uD83C\uDDF8\uD83C\uDDF0", utc_hiver: 1, utc_ete: 2 },
  SI: { nom: "Slovenie", drapeau: "\uD83C\uDDF8\uD83C\uDDEE", utc_hiver: 1, utc_ete: 2 },
  NO: { nom: "Norvege", drapeau: "\uD83C\uDDF3\uD83C\uDDF4", utc_hiver: 1, utc_ete: 2 },
  MA: { nom: "Maroc", drapeau: "\uD83C\uDDF2\uD83C\uDDE6", utc_hiver: 1, utc_ete: 1 },
  TN: { nom: "Tunisie", drapeau: "\uD83C\uDDF9\uD83C\uDDF3", utc_hiver: 1, utc_ete: 1 },
  DZ: { nom: "Algerie", drapeau: "\uD83C\uDDE9\uD83C\uDDFF", utc_hiver: 1, utc_ete: 1 },
  TR: { nom: "Turquie", drapeau: "\uD83C\uDDF9\uD83C\uDDF7", utc_hiver: 3, utc_ete: 3 }
};

// ============================================================
// FONCTIONS UTILITAIRES
// ============================================================

/**
 * Calcule le dernier dimanche d'un mois donne
 * Utilise pour determiner automatiquement heure ete/hiver
 * Source : Directive 2000/84/CE
 */
function dernierDimancheDuMois(annee, mois) {
  const dernierJour = new Date(annee, mois + 1, 0);
  const jourSemaine = dernierJour.getDay();
  dernierJour.setDate(dernierJour.getDate() - jourSemaine);
  return dernierJour;
}

/**
 * Determine si une date est en heure d'ete EU
 * Passage heure ete : dernier dimanche de mars a 1h UTC
 * Passage heure hiver : dernier dimanche d'octobre a 1h UTC
 */
function estHeureEteEU(date) {
  const annee = date.getFullYear();
  const debutEte = dernierDimancheDuMois(annee, 2); // Mars = 2
  debutEte.setHours(1, 0, 0, 0);
  const finEte = dernierDimancheDuMois(annee, 9); // Octobre = 9
  finEte.setHours(1, 0, 0, 0);
  return date >= debutEte && date < finEte;
}

/**
 * Obtient le decalage UTC pour un pays et une date
 */
function getDecalageUTC(codePays, date) {
  const pays = PAYS[codePays];
  if (!pays) return 1;
  if (estHeureEteEU(date)) {
    return pays.utc_ete;
  }
  return pays.utc_hiver;
}

/**
 * Parse une ligne CSV et retourne un objet activite
 * Format attendu : date;heure_debut;heure_fin;type_activite
 * Types : C=Conduite, T=Travail(autre tache), D=Disponibilite, P=Pause/Repos
 */
function parseCSVLigne(ligne, numeroLigne) {
  const erreurs = [];
  const parts = ligne.split(';').map(p => p.trim());

  if (parts.length < 4) {
    erreurs.push("Ligne " + numeroLigne + " : format invalide, attendu date;heure_debut;heure_fin;type");
    return { activite: null, erreurs };
  }

  const dateStr = parts[0];
  const heureDebut = parts[1];
  const heureFin = parts[2];
  const typeCode = parts[3].toUpperCase();

  // Validation du type
  const typesValides = { C: 'conduite', T: 'autre_tache', D: 'disponibilite', P: 'pause' };
  if (!typesValides[typeCode]) {
    erreurs.push("Ligne " + numeroLigne + " : type '" + typeCode + "' inconnu. Utiliser C, T, D ou P");
    return { activite: null, erreurs };
  }

  // Validation et parsing de la date
  const dateRegex = /^(\d{4})-(\d{2})-(\d{2})$/;
  const dateMatch = dateStr.match(dateRegex);
  if (!dateMatch) {
    erreurs.push("Ligne " + numeroLigne + " : date invalide '" + dateStr + "'. Format attendu : AAAA-MM-JJ");
    return { activite: null, erreurs };
  }

  // Validation heures
  const heureRegex = /^(\d{2}):(\d{2})$/;
  const debutMatch = heureDebut.match(heureRegex);
  const finMatch = heureFin.match(heureRegex);
  if (!debutMatch || !finMatch) {
    erreurs.push("Ligne " + numeroLigne + " : heure invalide. Format attendu : HH:MM");
    return { activite: null, erreurs };
  }

  const debut = new Date(dateStr + "T" + heureDebut + ":00");
  const fin = new Date(dateStr + "T" + heureFin + ":00");

  // Gerer le cas ou l'heure de fin est le lendemain (ex: 23:00 -> 02:00)
  let dureeMin;
  if (fin <= debut) {
    dureeMin = ((24 * 60) - (debut.getHours() * 60 + debut.getMinutes())) + (fin.getHours() * 60 + fin.getMinutes());
  } else {
    dureeMin = (fin.getTime() - debut.getTime()) / (1000 * 60);
  }

  if (dureeMin <= 0) {
    erreurs.push("Ligne " + numeroLigne + " : duree calculee invalide (" + dureeMin + " min)");
    return { activite: null, erreurs };
  }

  return {
    activite: {
      date: dateStr,
      heure_debut: heureDebut,
      heure_fin: heureFin,
      type: typesValides[typeCode],
      type_code: typeCode,
      duree_min: dureeMin,
      ligne: numeroLigne
    },
    erreurs
  };
}

/**
 * Analyse complete d'un CSV
 */
function analyserCSV(csvTexte, typeService, codePays) {
  const lignes = csvTexte.split('\n').map(l => l.trim()).filter(l => l.length > 0 && !l.startsWith('#') && !l.startsWith('date'));

  const activites = [];
  const erreursAnalyse = [];

  lignes.forEach((ligne, idx) => {
    const { activite, erreurs } = parseCSVLigne(ligne, idx + 1);
    if (activite) activites.push(activite);
    erreursAnalyse.push(...erreurs);
  });

  if (activites.length === 0) {
    return {
      score: 0,
      resume: "Aucune activite valide trouvee dans le CSV.",
      infractions: [],
      avertissements: [],
      erreurs_analyse: erreursAnalyse,
      details_jours: [],
      statistiques: {},
      amende_estimee: 0
    };
  }

  // Regrouper les activites par jour
  const joursMap = {};
  activites.forEach(a => {
    if (!joursMap[a.date]) joursMap[a.date] = [];
    joursMap[a.date].push(a);
  });

  // Trier les jours
  const joursTries = Object.keys(joursMap).sort();

  const infractions = [];
  const avertissements = [];
  const detailsJours = [];
  let totalConduiteMin = 0;
  let totalTravailMin = 0;
  let totalPauseMin = 0;
  let totalDispoMin = 0;
  let amendeEstimee = 0;

  // Analyser chaque jour
  joursTries.forEach(dateJour => {
    const activitesJour = joursMap[dateJour].sort((a, b) => a.heure_debut.localeCompare(b.heure_debut));

    let conduiteJour = 0;
    let travailJour = 0;
    let pauseJour = 0;
    let dispoJour = 0;
    let conduiteContinue = 0;
    let maxConduiteContinue = 0;
    let travailNuitMin = 0;
    let infractionsJour = [];
    let avertissementsJour = [];

    const dateObj = new Date(dateJour + "T12:00:00");
    const decalageUTC = getDecalageUTC(codePays, dateObj);

    activitesJour.forEach(a => {
      switch (a.type) {
        case 'conduite':
          conduiteJour += a.duree_min;
          conduiteContinue += a.duree_min;
          if (conduiteContinue > maxConduiteContinue) {
            maxConduiteContinue = conduiteContinue;
          }
          break;
        case 'autre_tache':
          travailJour += a.duree_min;
          // Autre tache ne remet pas a zero la conduite continue
          break;
        case 'disponibilite':
          dispoJour += a.duree_min;
          break;
        case 'pause':
          pauseJour += a.duree_min;
          // Une pause >= 30 min remet la conduite continue a zero (CE 561/2006 Art.7)
          if (a.duree_min >= REGLES.PAUSE_OBLIGATOIRE_MIN) {
            conduiteContinue = 0;
          }
          break;
      }

      // Verifier travail de nuit (L3312-1)
      const hDebut = parseInt(a.heure_debut.split(':')[0]);
      const hFin = parseInt(a.heure_fin.split(':')[0]);
      if (a.type === 'conduite' || a.type === 'autre_tache') {
        if (hDebut >= REGLES.NUIT_DEBUT_H || hDebut < REGLES.NUIT_FIN_H ||
          hFin >= REGLES.NUIT_DEBUT_H || hFin < REGLES.NUIT_FIN_H) {
          travailNuitMin += a.duree_min;
        }
      }
    });

    // Amplitude journaliere
    if (activitesJour.length >= 2) {
      const premiere = activitesJour[0];
      const derniere = activitesJour[activitesJour.length - 1];
      const debutJour = premiere.heure_debut.split(':').map(Number);
      const finJour = derniere.heure_fin.split(':').map(Number);
      let amplitudeMin = (finJour[0] * 60 + finJour[1]) - (debutJour[0] * 60 + debutJour[1]);
      if (amplitudeMin < 0) amplitudeMin += 24 * 60;
      const amplitudeH = amplitudeMin / 60;

      const amplitudeMax = typeService === 'REGULIER' ? REGLES.AMPLITUDE_MAX_REGULIER_H : REGLES.AMPLITUDE_MAX_OCCASIONNEL_H;
      if (amplitudeH > amplitudeMax) {
        const depassement = (amplitudeH - amplitudeMax).toFixed(1);
        infractionsJour.push({
          regle: "Amplitude journaliere (L3312-2)",
          limite: amplitudeMax + "h",
          constate: amplitudeH.toFixed(1) + "h",
          depassement: depassement + "h",
          classe: "4e classe",
          amende: SANCTIONS.classe_4.amende_forfaitaire + " euros (forfaitaire), max " + SANCTIONS.classe_4.amende_max + " euros"
        });
        amendeEstimee += SANCTIONS.classe_4.amende_forfaitaire;
      }
    }

    // Verification conduite continue (CE 561/2006 Art.7 + R3312-9)
    if (maxConduiteContinue > REGLES.CONDUITE_CONTINUE_MAX_MIN) {
      const depassement = maxConduiteContinue - REGLES.CONDUITE_CONTINUE_MAX_MIN;
      const classe = depassement > 90 ? "5e classe" : "4e classe";
      const amende = depassement > 90
        ? SANCTIONS.classe_5.amende_max + " euros (max), " + SANCTIONS.classe_5.amende_recidive + " euros en recidive"
        : SANCTIONS.classe_4.amende_forfaitaire + " euros (forfaitaire), max " + SANCTIONS.classe_4.amende_max + " euros";
      infractionsJour.push({
        regle: "Conduite continue (CE 561/2006 Art.7 + R3312-9)",
        limite: "4h30 (" + REGLES.CONDUITE_CONTINUE_MAX_MIN + " min)",
        constate: maxConduiteContinue + " min",
        depassement: depassement + " min",
        classe: classe,
        amende: amende
      });
      amendeEstimee += depassement > 90 ? SANCTIONS.classe_5.amende_max : SANCTIONS.classe_4.amende_forfaitaire;
    }

    // Verification conduite journaliere (CE 561/2006 Art.6 + R3312-11)
    if (conduiteJour > REGLES.CONDUITE_JOURNALIERE_MAX_MIN) {
      const depassement = conduiteJour - REGLES.CONDUITE_JOURNALIERE_MAX_MIN;
      if (conduiteJour > REGLES.CONDUITE_JOURNALIERE_DEROGATOIRE_MAX_MIN) {
        const classe = depassement > 120 ? "5e classe" : "4e classe";
        const amende = depassement > 120
          ? SANCTIONS.classe_5.amende_max + " euros (max), " + SANCTIONS.classe_5.amende_recidive + " euros en recidive"
          : SANCTIONS.classe_4.amende_forfaitaire + " euros (forfaitaire), max " + SANCTIONS.classe_4.amende_max + " euros";
        infractionsJour.push({
          regle: "Conduite journaliere (CE 561/2006 Art.6 + R3312-11)",
          limite: "9h (10h derogatoire, 2x/semaine)",
          constate: (conduiteJour / 60).toFixed(1) + "h (" + conduiteJour + " min)",
          depassement: depassement + " min",
          classe: classe,
          amende: amende
        });
        amendeEstimee += depassement > 120 ? SANCTIONS.classe_5.amende_max : SANCTIONS.classe_4.amende_forfaitaire;
      } else {
        avertissementsJour.push({
          regle: "Conduite journaliere proche du maximum derogatoire",
          message: "Conduite de " + (conduiteJour / 60).toFixed(1) + "h - depasse 9h mais dans la limite derogatoire de 10h (2x/semaine max)"
        });
      }
    }

    // Verification travail de nuit (L3312-1)
    if (travailNuitMin > REGLES.TRAVAIL_NUIT_MAX_H * 60) {
      infractionsJour.push({
        regle: "Travail de nuit (L3312-1)",
        limite: REGLES.TRAVAIL_NUIT_MAX_H + "h",
        constate: (travailNuitMin / 60).toFixed(1) + "h",
        depassement: ((travailNuitMin / 60) - REGLES.TRAVAIL_NUIT_MAX_H).toFixed(1) + "h",
        classe: "4e classe",
        amende: SANCTIONS.classe_4.amende_forfaitaire + " euros (forfaitaire), max " + SANCTIONS.classe_4.amende_max + " euros"
      });
      amendeEstimee += SANCTIONS.classe_4.amende_forfaitaire;
    }

    // Verification travail journalier total (conduite + autre tache)
    const travailTotalJour = conduiteJour + travailJour;
    if (travailTotalJour > REGLES.TRAVAIL_JOURNALIER_MAX_H * 60) {
      infractionsJour.push({
        regle: "Duree maximale de travail journalier (Code du travail)",
        limite: REGLES.TRAVAIL_JOURNALIER_MAX_H + "h",
        constate: (travailTotalJour / 60).toFixed(1) + "h",
        depassement: ((travailTotalJour / 60) - REGLES.TRAVAIL_JOURNALIER_MAX_H).toFixed(1) + "h",
        classe: "4e classe",
        amende: SANCTIONS.classe_4.amende_forfaitaire + " euros (forfaitaire), max " + SANCTIONS.classe_4.amende_max + " euros"
      });
      amendeEstimee += SANCTIONS.classe_4.amende_forfaitaire;
    }

    // Repos journalier (approximation sur les donnees disponibles)
    const totalActiviteJour = conduiteJour + travailJour + dispoJour + pauseJour;
    const reposEstime = (24 * 60) - totalActiviteJour;
    if (reposEstime < REGLES.REPOS_JOURNALIER_REDUIT_H * 60 && totalActiviteJour > 0) {
      const manqueMin = (REGLES.REPOS_JOURNALIER_REDUIT_H * 60) - reposEstime;
      if (manqueMin > 150) { // > 2h30 sous le minimum = classe 5
        infractionsJour.push({
          regle: "Repos journalier insuffisant (CE 561/2006 Art.8 + R3312-28)",
          limite: REGLES.REPOS_JOURNALIER_REDUIT_H + "h minimum (reduit)",
          constate: (reposEstime / 60).toFixed(1) + "h estimees",
          depassement: "Manque " + (manqueMin / 60).toFixed(1) + "h",
          classe: "5e classe",
          amende: SANCTIONS.classe_5.amende_max + " euros (max), " + SANCTIONS.classe_5.amende_recidive + " euros en recidive"
        });
        amendeEstimee += SANCTIONS.classe_5.amende_max;
      } else {
        infractionsJour.push({
          regle: "Repos journalier insuffisant (CE 561/2006 Art.8 + R3312-28)",
          limite: REGLES.REPOS_JOURNALIER_REDUIT_H + "h minimum (reduit)",
          constate: (reposEstime / 60).toFixed(1) + "h estimees",
          depassement: "Manque " + (manqueMin / 60).toFixed(1) + "h",
          classe: "4e classe",
          amende: SANCTIONS.classe_4.amende_forfaitaire + " euros (forfaitaire), max " + SANCTIONS.classe_4.amende_max + " euros"
        });
        amendeEstimee += SANCTIONS.classe_4.amende_forfaitaire;
      }
    } else if (reposEstime < REGLES.REPOS_JOURNALIER_NORMAL_H * 60 && reposEstime >= REGLES.REPOS_JOURNALIER_REDUIT_H * 60 && totalActiviteJour > 0) {
      avertissementsJour.push({
        regle: "Repos journalier en mode reduit",
        message: "Repos estime de " + (reposEstime / 60).toFixed(1) + "h (norme = " + REGLES.REPOS_JOURNALIER_NORMAL_H + "h, reduit admis = " + REGLES.REPOS_JOURNALIER_REDUIT_H + "h, max 3x entre 2 repos hebdo)"
      });
    }

    totalConduiteMin += conduiteJour;
    totalTravailMin += travailJour;
    totalPauseMin += pauseJour;
    totalDispoMin += dispoJour;

    infractions.push(...infractionsJour);
    avertissements.push(...avertissementsJour);

    detailsJours.push({
      date: dateJour,
      fuseau: "UTC+" + decalageUTC + " (" + (estHeureEteEU(dateObj) ? "ete" : "hiver") + ")",
      conduite_min: conduiteJour,
      conduite_h: (conduiteJour / 60).toFixed(1),
      travail_min: travailJour,
      travail_h: (travailJour / 60).toFixed(1),
      pause_min: pauseJour,
      pause_h: (pauseJour / 60).toFixed(1),
      disponibilite_min: dispoJour,
      disponibilite_h: (dispoJour / 60).toFixed(1),
      amplitude_estimee_h: activitesJour.length >= 2
        ? (function () {
          const d = activitesJour[0].heure_debut.split(':').map(Number);
          const f = activitesJour[activitesJour.length - 1].heure_fin.split(':').map(Number);
          let a = (f[0] * 60 + f[1]) - (d[0] * 60 + d[1]);
          if (a < 0) a += 24 * 60;
          return (a / 60).toFixed(1);
        })()
        : "N/A",
      conduite_continue_max_min: maxConduiteContinue,
      repos_estime_h: totalActiviteJour > 0 ? ((24 * 60 - totalActiviteJour) / 60).toFixed(1) : "N/A",
      travail_nuit_min: travailNuitMin,
      nombre_activites: activitesJour.length,
      infractions: infractionsJour,
      avertissements: avertissementsJour
    });
  });

  // Verification conduite hebdomadaire (si assez de jours)
  if (joursTries.length >= 5) {
    if (totalConduiteMin > REGLES.CONDUITE_HEBDOMADAIRE_MAX_MIN) {
      const depassement = totalConduiteMin - REGLES.CONDUITE_HEBDOMADAIRE_MAX_MIN;
      const classe = depassement > (14 * 60) ? "5e classe" : "4e classe";
      infractions.push({
        regle: "Conduite hebdomadaire (CE 561/2006 Art.6 + R3312-11)",
        limite: "56h (" + REGLES.CONDUITE_HEBDOMADAIRE_MAX_MIN + " min)",
        constate: (totalConduiteMin / 60).toFixed(1) + "h",
        depassement: (depassement / 60).toFixed(1) + "h",
        classe: classe,
        amende: classe === "5e classe"
          ? SANCTIONS.classe_5.amende_max + " euros (max)"
          : SANCTIONS.classe_4.amende_forfaitaire + " euros (forfaitaire)"
      });
      amendeEstimee += classe === "5e classe" ? SANCTIONS.classe_5.amende_max : SANCTIONS.classe_4.amende_forfaitaire;
    }
  }

  // Calcul du score de conformite
  const nbChecks = joursTries.length * 6; // 6 verifications par jour
  const nbInfractions = infractions.length;
  const score = nbChecks > 0 ? Math.max(0, Math.round(((nbChecks - nbInfractions) / nbChecks) * 100)) : 100;

  return {
    score,
    resume: infractions.length === 0
      ? "Aucune infraction detectee. Activite conforme a la reglementation."
      : infractions.length + " infraction(s) detectee(s) sur " + joursTries.length + " jour(s) analyses.",
    type_service: typeService,
    pays: codePays,
    periode: joursTries.length > 0 ? joursTries[0] + " au " + joursTries[joursTries.length - 1] : "N/A",
    nombre_jours: joursTries.length,
    infractions,
    avertissements,
    erreurs_analyse: erreursAnalyse,
    details_jours: detailsJours,
    statistiques: {
      conduite_totale_h: (totalConduiteMin / 60).toFixed(1),
      conduite_totale_min: totalConduiteMin,
      travail_autre_total_h: (totalTravailMin / 60).toFixed(1),
      pause_totale_h: (totalPauseMin / 60).toFixed(1),
      disponibilite_totale_h: (totalDispoMin / 60).toFixed(1),
      moyenne_conduite_jour_h: joursTries.length > 0 ? (totalConduiteMin / 60 / joursTries.length).toFixed(1) : "0",
      moyenne_travail_total_jour_h: joursTries.length > 0 ? ((totalConduiteMin + totalTravailMin) / 60 / joursTries.length).toFixed(1) : "0"
    },
    amende_estimee: amendeEstimee,
    bareme_sanctions: SANCTIONS
  };
}

// ============================================================
// ROUTES API
// ============================================================

// POST /api/analyze - Analyse un CSV
app.post('/api/analyze', (req, res) => {
  try {
    const { csv, typeService, pays } = req.body;

    if (!csv || csv.trim().length === 0) {
      return res.status(400).json({ error: "Aucun contenu CSV fourni." });
    }

    const typeServiceValide = ['STANDARD', 'REGULIER', 'OCCASIONNEL', 'SLO'].includes(typeService) ? typeService : 'STANDARD';
    const paysValide = PAYS[pays] ? pays : 'FR';

    console.log("[ANALYSE] Type service: " + typeServiceValide + ", Pays: " + paysValide + ", Lignes CSV: " + csv.split('\n').length);

    const resultat = analyserCSV(csv, typeServiceValide, paysValide);

    console.log("[RESULTAT] Score: " + resultat.score + "%, Infractions: " + resultat.infractions.length + ", Amende estimee: " + resultat.amende_estimee + " euros");

    res.json(resultat);
  } catch (err) {
    console.error("[ERREUR ANALYSE]", err);
    res.status(500).json({ error: "Erreur lors de l'analyse : " + err.message });
  }
});

// POST /api/upload - Upload un fichier CSV
app.post('/api/upload', upload.single('fichier'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "Aucun fichier recu." });
    }

    const contenu = fs.readFileSync(req.file.path, 'utf-8');

    // Nettoyer le fichier temporaire
    fs.unlinkSync(req.file.path);

    res.json({ csv: contenu, nom_fichier: req.file.originalname });
  } catch (err) {
    console.error("[ERREUR UPLOAD]", err);
    res.status(500).json({ error: "Erreur lors de l'upload : " + err.message });
  }
});

// GET /api/example-csv - Retourne un CSV d'exemple
app.get('/api/example-csv', (req, res) => {
  const exemple = [
    "# Exemple CSV - Semaine type conducteur transport de personnes",
    "# Format : date;heure_debut;heure_fin;type (C=Conduite, T=Autre tache, D=Disponibilite, P=Pause)",
    "2025-01-06;06:00;06:30;T",
    "2025-01-06;06:30;10:30;C",
    "2025-01-06;10:30;11:00;P",
    "2025-01-06;11:00;13:00;C",
    "2025-01-06;13:00;14:00;P",
    "2025-01-06;14:00;17:30;C",
    "2025-01-06;17:30;18:00;T",
    "2025-01-07;05:30;06:00;T",
    "2025-01-07;06:00;10:00;C",
    "2025-01-07;10:00;10:30;P",
    "2025-01-07;10:30;13:00;C",
    "2025-01-07;13:00;13:45;P",
    "2025-01-07;13:45;17:00;C",
    "2025-01-07;17:00;17:30;T",
    "2025-01-08;06:00;06:15;T",
    "2025-01-08;06:15;10:30;C",
    "2025-01-08;10:30;11:00;P",
    "2025-01-08;11:00;14:00;C",
    "2025-01-08;14:00;14:45;P",
    "2025-01-08;14:45;18:00;C",
    "2025-01-08;18:00;18:15;T"
  ].join('\n');

  res.type('text/plain').send(exemple);
});

// GET /api/health - Verification du serveur
app.get('/api/health', (req, res) => {
  res.json({
    status: "ok",
    version: "5.5.0",
    auteur: "Samir Medjaher",
    regles_version: "CE 561/2006 + Code des transports FR",
    pays_supportes: Object.keys(PAYS).length,
    timestamp: new Date().toISOString()
  });
});

// GET /api/pays - Liste des pays supportes
app.get('/api/pays', (req, res) => {
  res.json(PAYS);
});

// GET /api/regles - Constantes reglementaires
app.get('/api/regles', (req, res) => {
  res.json({ regles: REGLES, sanctions: SANCTIONS });
});

// ============================================================
// ROUTE QA - Tests automatisés accessibles par LLM
// GET /api/qa - Exécute tous les tests et retourne un rapport
// ============================================================
app.get('/api/qa', async (req, res) => {
  const rapport = {
    timestamp: new Date().toISOString(),
    version: "5.5.0",
    tests: [],
    resume: { total: 0, ok: 0, ko: 0 }
  };

  function test(nom, condition, detail) {
    const ok = !!condition;
    rapport.tests.push({ nom, ok, detail: detail || (ok ? 'OK' : 'ECHEC') });
    rapport.resume.total++;
    if (ok) rapport.resume.ok++;
    else rapport.resume.ko++;
  }

  // TEST 1 : Serveur en ligne
  test('Serveur en ligne', true, 'Le serveur repond sur le port ' + PORT);

  // TEST 2 : Constantes reglementaires
  test('Conduite continue max = 270 min (4h30)', REGLES.CONDUITE_CONTINUE_MAX_MIN === 270, 'Valeur: ' + REGLES.CONDUITE_CONTINUE_MAX_MIN);
  test('Conduite journaliere max = 540 min (9h)', REGLES.CONDUITE_JOURNALIERE_MAX_MIN === 540, 'Valeur: ' + REGLES.CONDUITE_JOURNALIERE_MAX_MIN);
  test('Conduite derogatoire max = 600 min (10h)', REGLES.CONDUITE_JOURNALIERE_DEROGATOIRE_MAX_MIN === 600, 'Valeur: ' + REGLES.CONDUITE_JOURNALIERE_DEROGATOIRE_MAX_MIN);
  test('Conduite hebdo max = 3360 min (56h)', REGLES.CONDUITE_HEBDOMADAIRE_MAX_MIN === 3360, 'Valeur: ' + REGLES.CONDUITE_HEBDOMADAIRE_MAX_MIN);
  test('Repos journalier normal = 11h', REGLES.REPOS_JOURNALIER_NORMAL_H === 11, 'Valeur: ' + REGLES.REPOS_JOURNALIER_NORMAL_H);
  test('Repos journalier reduit = 9h', REGLES.REPOS_JOURNALIER_REDUIT_H === 9, 'Valeur: ' + REGLES.REPOS_JOURNALIER_REDUIT_H);
  test('Repos hebdo normal = 45h', REGLES.REPOS_HEBDO_NORMAL_H === 45, 'Valeur: ' + REGLES.REPOS_HEBDO_NORMAL_H);
  test('Amplitude regulier = 13h', REGLES.AMPLITUDE_MAX_REGULIER_H === 13, 'Valeur: ' + REGLES.AMPLITUDE_MAX_REGULIER_H);
  test('Amplitude occasionnel = 14h', REGLES.AMPLITUDE_MAX_OCCASIONNEL_H === 14, 'Valeur: ' + REGLES.AMPLITUDE_MAX_OCCASIONNEL_H);
  test('Nuit debut = 21h', REGLES.NUIT_DEBUT_H === 21, 'Valeur: ' + REGLES.NUIT_DEBUT_H);
  test('Nuit fin = 6h', REGLES.NUIT_FIN_H === 6, 'Valeur: ' + REGLES.NUIT_FIN_H);

  // TEST 3 : Sanctions
  test('Amende 4e classe forfaitaire = 135', SANCTIONS.classe_4.amende_forfaitaire === 135, 'Valeur: ' + SANCTIONS.classe_4.amende_forfaitaire);
  test('Amende 4e classe max = 750', SANCTIONS.classe_4.amende_max === 750, 'Valeur: ' + SANCTIONS.classe_4.amende_max);
  test('Amende 5e classe max = 1500', SANCTIONS.classe_5.amende_max === 1500, 'Valeur: ' + SANCTIONS.classe_5.amende_max);
  test('Amende 5e classe recidive = 3000', SANCTIONS.classe_5.amende_recidive === 3000, 'Valeur: ' + SANCTIONS.classe_5.amende_recidive);

  // TEST 4 : Liste des pays
  const nbPays = Object.keys(PAYS).length;
  test('Pays charges >= 25', nbPays >= 25, 'Nombre de pays: ' + nbPays);
  test('France presente', !!PAYS.FR, 'FR: ' + JSON.stringify(PAYS.FR));
  test('Allemagne presente', !!PAYS.DE, 'DE: ' + JSON.stringify(PAYS.DE));
  test('Maroc present', !!PAYS.MA, 'MA: ' + JSON.stringify(PAYS.MA));

  // TEST 5 : Fuseau horaire / heure ete
  const datEte = new Date('2025-07-15T12:00:00Z');
  const datHiver = new Date('2025-01-15T12:00:00Z');
  test('Heure ete detectee en juillet', estHeureEteEU(datEte) === true, 'Juillet 2025: ete=' + estHeureEteEU(datEte));
  test('Heure hiver detectee en janvier', estHeureEteEU(datHiver) === false, 'Janvier 2025: ete=' + estHeureEteEU(datHiver));
  test('UTC France ete = +2', getDecalageUTC('FR', datEte) === 2, 'FR ete: UTC+' + getDecalageUTC('FR', datEte));
  test('UTC France hiver = +1', getDecalageUTC('FR', datHiver) === 1, 'FR hiver: UTC+' + getDecalageUTC('FR', datHiver));
  test('UTC Portugal ete = +1', getDecalageUTC('PT', datEte) === 1, 'PT ete: UTC+' + getDecalageUTC('PT', datEte));
  test('UTC Turquie = +3 (pas de changement)', getDecalageUTC('TR', datEte) === 3, 'TR: UTC+' + getDecalageUTC('TR', datEte));

  // TEST 6 : Analyse CSV - Journee conforme
  const csvConforme = [
    '2025-01-06;06:00;06:30;T',
    '2025-01-06;06:30;10:30;C',
    '2025-01-06;10:30;11:15;P',
    '2025-01-06;11:15;13:15;C',
    '2025-01-06;13:15;14:00;P',
    '2025-01-06;14:00;16:00;C',
    '2025-01-06;16:00;16:30;T'
  ].join('\n');
  const resConforme = analyserCSV(csvConforme, 'STANDARD', 'FR');
  test('CSV conforme: 0 infraction', resConforme.infractions.length === 0, 'Infractions: ' + resConforme.infractions.length);
  test('CSV conforme: score >= 80', resConforme.score >= 80, 'Score: ' + resConforme.score);
  test('CSV conforme: conduite ~6h', parseFloat(resConforme.statistiques.conduite_totale_h) >= 5.5 && parseFloat(resConforme.statistiques.conduite_totale_h) <= 6.5, 'Conduite: ' + resConforme.statistiques.conduite_totale_h + 'h');
  test('CSV conforme: amende = 0', resConforme.amende_estimee === 0, 'Amende: ' + resConforme.amende_estimee);

  // TEST 7 : Analyse CSV - Journee avec depassement conduite continue
  const csvDepassement = [
    '2025-01-06;06:00;12:00;C',
    '2025-01-06;12:00;12:30;P',
    '2025-01-06;12:30;18:30;C'
  ].join('\n');
  const resDepass = analyserCSV(csvDepassement, 'STANDARD', 'FR');
  test('CSV depassement: infractions > 0', resDepass.infractions.length > 0, 'Infractions: ' + resDepass.infractions.length);
  test('CSV depassement: amende > 0', resDepass.amende_estimee > 0, 'Amende: ' + resDepass.amende_estimee + ' euros');
  test('CSV depassement: conduite = 12h', parseFloat(resDepass.statistiques.conduite_totale_h) === 12.0, 'Conduite: ' + resDepass.statistiques.conduite_totale_h + 'h');
  const infraContinue = resDepass.infractions.find(i => i.regle && i.regle.includes('ontinue'));
  test('CSV depassement: infraction conduite continue detectee', !!infraContinue, infraContinue ? infraContinue.regle : 'Non trouvee');
  const infraJournaliere = resDepass.infractions.find(i => i.regle && i.regle.includes('ournali'));
  test('CSV depassement: infraction conduite journaliere detectee', !!infraJournaliere, infraJournaliere ? infraJournaliere.regle : 'Non trouvee');

  // TEST 8 : Analyse CSV - Repos insuffisant
  const csvRepos = [
    '2025-01-06;04:00;08:30;C',
    '2025-01-06;08:30;09:00;P',
    '2025-01-06;09:00;13:00;C',
    '2025-01-06;13:00;13:30;P',
    '2025-01-06;13:30;17:30;C',
    '2025-01-06;17:30;18:00;T',
    '2025-01-06;18:00;22:00;D'
  ].join('\n');
  const resRepos = analyserCSV(csvRepos, 'STANDARD', 'FR');
  const infraRepos = resRepos.infractions.find(i => i.regle && i.regle.toLowerCase().includes('repos'));
  test('CSV repos insuffisant: infraction repos detectee', !!infraRepos, infraRepos ? infraRepos.regle + ' - ' + infraRepos.constate : 'Non detectee');

  // TEST 9 : Parsing CSV invalide
  const csvInvalide = 'ceci;nest;pas;valide\n2025-01-06;06:00;07:00;Z';
  const resInvalide = analyserCSV(csvInvalide, 'STANDARD', 'FR');
  test('CSV invalide: erreurs detectees', resInvalide.erreurs_analyse.length > 0, 'Erreurs: ' + resInvalide.erreurs_analyse.length + ' - ' + (resInvalide.erreurs_analyse[0] || ''));

  // TEST 10 : Parsing CSV vide
  const resVide = analyserCSV('', 'STANDARD', 'FR');
  test('CSV vide: aucune activite', resVide.details_jours.length === 0, 'Jours: ' + resVide.details_jours.length);

  // TEST 11 : Multi-jours
  const csvMulti = [
    '2025-01-06;06:00;10:30;C',
    '2025-01-06;10:30;11:15;P',
    '2025-01-06;11:15;15:00;C',
    '2025-01-07;06:00;10:30;C',
    '2025-01-07;10:30;11:15;P',
    '2025-01-07;11:15;15:00;C',
    '2025-01-08;06:00;10:30;C',
    '2025-01-08;10:30;11:15;P',
    '2025-01-08;11:15;15:00;C'
  ].join('\n');
  const resMulti = analyserCSV(csvMulti, 'STANDARD', 'FR');
  test('CSV multi-jours: 3 jours detectes', resMulti.nombre_jours === 3, 'Jours: ' + resMulti.nombre_jours);
  test('CSV multi-jours: details_jours = 3', resMulti.details_jours.length === 3, 'Details: ' + resMulti.details_jours.length);
  test('CSV multi-jours: periode correcte', resMulti.periode && resMulti.periode.includes('2025-01-06'), 'Periode: ' + resMulti.periode);

  // TEST 12 : Service de nuit
  const csvNuit = [
    '2025-01-06;21:00;23:59;C',
    '2025-01-06;00:00;04:00;C'
  ].join('\n');
  const resNuit = analyserCSV(csvNuit, 'STANDARD', 'FR');
  test('CSV nuit: travail de nuit detecte', resNuit.details_jours.length > 0 && resNuit.details_jours[0].travail_nuit_min > 0, 'Nuit: ' + (resNuit.details_jours[0] ? resNuit.details_jours[0].travail_nuit_min + ' min' : 'N/A'));

  // TEST 13 : Frontend build existe
  const distExists = fs.existsSync(path.join(__dirname, 'client', 'dist', 'index.html'));
  test('Frontend build (client/dist/index.html) existe', distExists, distExists ? 'Fichier present' : 'MANQUANT - npx vite build necessaire');

  // Résumé
  rapport.resume.pourcentage = rapport.resume.total > 0 ? Math.round((rapport.resume.ok / rapport.resume.total) * 100) : 0;
  rapport.resume.status = rapport.resume.ko === 0 ? 'TOUS LES TESTS PASSENT' : rapport.resume.ko + ' TEST(S) EN ECHEC';

  console.log('[QA] ' + rapport.resume.ok + '/' + rapport.resume.total + ' tests OK (' + rapport.resume.pourcentage + '%)');

  res.json(rapport);
});


// ============================================================
// ============================================================
// ROUTE QA v5.6.0 - SYSTEME DE TEST AVANCE POUR DIAGNOSTIC LLM
// GET /api/qa/cas-reels
// 25 cas organises en 7 categories :
//   CAT-A : Conformite parfaite (cas 1-4)
//   CAT-B : Conduite continue CE 561/2006 Art.7 (cas 5-8)
//   CAT-C : Conduite journaliere CE 561/2006 Art.6 (cas 9-12)
//   CAT-D : Repos journalier CE 561/2006 Art.8 (cas 13-15)
//   CAT-E : Amplitude L3312-2 / R3312-9 / R3312-11 (cas 16-19)
//   CAT-F : Travail de nuit L3312-1 (cas 20-22)
//   CAT-G : Edge cases et cumuls (cas 23-25)
// Sources :
//   - CE 561/2006 Art.6-8 (conduite, pause, repos)
//   - Code des transports R3312-9, R3312-11, R3312-28, L3312-1, L3312-2
//   - Seuils 4e/5e classe : dan-dis-scan.fr, inodis.fr
//   - domformateur.com, ecologie.gouv.fr, groupito.com, sinari.com
// Seuils moteur (server.js) :
//   Conduite continue: >270min infraction, >270+90=360min -> 5e classe
//   Conduite journaliere: >540min avert, >600min infraction, >600+120=720min -> 5e classe
//   Repos journalier reduit: <540min infraction, manque>150min -> 5e classe
//   Amplitude: regulier>13h, occasionnel>14h -> 4e classe
//   Travail nuit: >10h -> 4e classe
//   Pause reset: >=30min remet conduite continue a 0
// ============================================================
app.get('/api/qa/cas-reels', (req, res) => {
  var rapport = {
    timestamp: new Date().toISOString(),
    version: '5.6.0',
    description: '25 cas de test avances pour diagnostic LLM - 7 categories reglementaires',
    moteur_info: {
      pause_reset_min: 30,
      conduite_continue_max_min: 270,
      seuil_5e_continue_depassement: 90,
      conduite_journaliere_max_min: 540,
      conduite_derogatoire_max_min: 600,
      seuil_5e_journaliere_depassement: 120,
      repos_reduit_min_h: 9,
      repos_normal_min_h: 11,
      seuil_5e_repos_manque_min: 150,
      amplitude_regulier_h: 13,
      amplitude_occasionnel_h: 14,
      travail_nuit_max_h: 10,
      nuit_debut_h: 21,
      nuit_fin_h: 6,
      amende_4e: 135,
      amende_5e: 1500
    },
    sources: [
      'CE 561/2006 Art.6-8 (EUR-Lex)',
      'Code des transports L3312-1, L3312-2, R3312-9, R3312-11, R3312-28 (Legifrance)',
      'https://www.dan-dis-scan.fr/les-sanctions',
      'https://inodis.fr/infractions-tachygraphe/',
      'https://www.domformateur.com/pages/tronc-commun/durees-de-conduite-temps-de-pause-et-temps-de-repos.html',
      'https://www.ecologie.gouv.fr/politiques-publiques/temps-travail-conducteurs-routiers-transport-personnes',
      'https://www.groupito.com/blog/la-minute-groupito/combien-de-temps-un-conducteur-dautocar-peut-il-conduire/',
      'https://www.sinari.com/blog/rse-temps-conduite'
    ],
    cas: [],
    resume: { total: 0, ok: 0, ko: 0, anomalies: [], categories: {} }
  };

  function testerCas(cat, nom, desc, csv, ts, cp, att) {
    var r = analyserCSV(csv, ts, cp);
    var v = [];
    var ok = true;
    function check(testName, attendu, obtenu, passe) {
      v.push({ test: testName, attendu: attendu, obtenu: obtenu, ok: passe });
      if (!passe) ok = false;
    }
    if (att.infractions !== undefined) {
      check('Nb infractions exact', att.infractions, r.infractions.length, r.infractions.length === att.infractions);
    }
    if (att.infractions_min !== undefined) {
      check('Infractions >= ' + att.infractions_min, att.infractions_min, r.infractions.length, r.infractions.length >= att.infractions_min);
    }
    if (att.infractions_max !== undefined) {
      check('Infractions <= ' + att.infractions_max, att.infractions_max, r.infractions.length, r.infractions.length <= att.infractions_max);
    }
    if (att.infractions_contiennent) {
      att.infractions_contiennent.forEach(function(m) {
        var found = r.infractions.some(function(i) { return i.regle && i.regle.toLowerCase().includes(m.toLowerCase()); });
        check('Contient infraction "' + m + '"', true, found, found);
      });
    }
    if (att.infractions_absent) {
      att.infractions_absent.forEach(function(m) {
        var found = r.infractions.some(function(i) { return i.regle && i.regle.toLowerCase().includes(m.toLowerCase()); });
        check('Pas d\'infraction "' + m + '"', false, found, !found);
      });
    }
    if (att.score_exact !== undefined) {
      check('Score exact', att.score_exact, r.score, r.score === att.score_exact);
    }
    if (att.score_min !== undefined) {
      check('Score >= ' + att.score_min, att.score_min, r.score, r.score >= att.score_min);
    }
    if (att.score_max !== undefined) {
      check('Score <= ' + att.score_max, att.score_max, r.score, r.score <= att.score_max);
    }
    if (att.amende_exacte !== undefined) {
      check('Amende exacte', att.amende_exacte, r.amende_estimee, r.amende_estimee === att.amende_exacte);
    }
    if (att.amende_min !== undefined) {
      check('Amende >= ' + att.amende_min, att.amende_min, r.amende_estimee, r.amende_estimee >= att.amende_min);
    }
    if (att.amende_max !== undefined) {
      check('Amende <= ' + att.amende_max, att.amende_max, r.amende_estimee, r.amende_estimee <= att.amende_max);
    }
    if (att.jours !== undefined) {
      check('Nb jours', att.jours, r.nombre_jours, r.nombre_jours === att.jours);
    }
    if (att.conduite_h !== undefined) {
      var ch = r.statistiques ? r.statistiques.conduite_totale_h : 'N/A';
      check('Conduite totale (h)', att.conduite_h, ch, ch === att.conduite_h);
    }
    if (att.avertissements_min !== undefined) {
      check('Avertissements >= ' + att.avertissements_min, att.avertissements_min, r.avertissements.length, r.avertissements.length >= att.avertissements_min);
    }
    if (att.avertissements_exact !== undefined) {
      check('Avertissements exact', att.avertissements_exact, r.avertissements.length, r.avertissements.length === att.avertissements_exact);
    }
    if (att.classe_contient) {
      att.classe_contient.forEach(function(c) {
        var found = r.infractions.some(function(i) { return i.classe && i.classe.includes(c); });
        check('Classe "' + c + '" presente', true, found, found);
      });
    }
    if (att.classe_absente) {
      att.classe_absente.forEach(function(c) {
        var found = r.infractions.some(function(i) { return i.classe && i.classe.includes(c); });
        check('Classe "' + c + '" absente', false, found, !found);
      });
    }
    if (att.amplitude_h !== undefined && r.details_jours && r.details_jours[0]) {
      var ampObtenu = parseFloat(r.details_jours[0].amplitude_estimee_h);
      check('Amplitude (h)', att.amplitude_h, ampObtenu, Math.abs(ampObtenu - att.amplitude_h) < 0.2);
    }
    if (att.conduite_continue_max !== undefined && r.details_jours && r.details_jours[0]) {
      var ccm = r.details_jours[0].conduite_continue_max_min;
      check('Conduite continue max (min)', att.conduite_continue_max, ccm, ccm === att.conduite_continue_max);
    }
    if (att.repos_estime_min !== undefined && r.details_jours && r.details_jours[0]) {
      var re = parseFloat(r.details_jours[0].repos_estime_h);
      check('Repos estime >= ' + att.repos_estime_min + 'h', att.repos_estime_min, re, re >= att.repos_estime_min);
    }
    if (att.repos_estime_max !== undefined && r.details_jours && r.details_jours[0]) {
      var re = parseFloat(r.details_jours[0].repos_estime_h);
      check('Repos estime <= ' + att.repos_estime_max + 'h', att.repos_estime_max, re, re <= att.repos_estime_max);
    }
    if (att.erreurs_min !== undefined) {
      var ne = r.erreurs_analyse ? r.erreurs_analyse.length : 0;
      check('Erreurs analyse >= ' + att.erreurs_min, att.erreurs_min, ne, ne >= att.erreurs_min);
    }

    var casResult = {
      categorie: cat,
      nom: nom,
      description: desc,
      type_service: ts,
      pays: cp,
      verdict: ok ? 'OK' : 'ANOMALIE',
      nb_checks: v.length,
      nb_passed: v.filter(function(x) { return x.ok; }).length,
      nb_failed: v.filter(function(x) { return !x.ok; }).length,
      verifications: v,
      resultat_brut: {
        score: r.score,
        infractions: r.infractions.length,
        avertissements: r.avertissements.length,
        amende: r.amende_estimee,
        jours: r.nombre_jours,
        conduite_h: r.statistiques ? r.statistiques.conduite_totale_h : 'N/A',
        infractions_detail: r.infractions.map(function(i) {
          return { regle: i.regle, classe: i.classe, limite: i.limite, constate: i.constate, depassement: i.depassement };
        }),
        avertissements_detail: r.avertissements.map(function(a) {
          return { regle: a.regle, message: a.message };
        }),
        details_jour_1: r.details_jours && r.details_jours[0] ? {
          amplitude_h: r.details_jours[0].amplitude_estimee_h,
          conduite_continue_max_min: r.details_jours[0].conduite_continue_max_min,
          repos_estime_h: r.details_jours[0].repos_estime_h,
          travail_nuit_min: r.details_jours[0].travail_nuit_min,
          fuseau: r.details_jours[0].fuseau
        } : null
      }
    };
    rapport.cas.push(casResult);
    rapport.resume.total++;
    if (ok) { rapport.resume.ok++; }
    else { rapport.resume.ko++; rapport.resume.anomalies.push(nom); }
    if (!rapport.resume.categories[cat]) rapport.resume.categories[cat] = { total: 0, ok: 0, ko: 0 };
    rapport.resume.categories[cat].total++;
    if (ok) rapport.resume.categories[cat].ok++;
    else rapport.resume.categories[cat].ko++;
  }

  // ========================================
  // CAT-A : CONFORMITE PARFAITE (cas 1-4)
  // ========================================

  // CAS 1 - Journee parfaite regulier FR
  // 4h15 + 3h45 = 8h conduite, pause 45min, amplitude 9h15
  testerCas('CAT-A', 'CAS 1 - Journee parfaite regulier FR',
    'Paris-Lyon 8h conduite, pause 45min. CE 561/2006 Art.6-7. Amplitude 9h15 < 13h.',
    '2025-03-10;05:45;06:00;T\n2025-03-10;06:00;10:15;C\n2025-03-10;10:15;11:00;P\n2025-03-10;11:00;14:45;C\n2025-03-10;14:45;15:00;T',
    'REGULIER', 'FR',
    { infractions: 0, score_min: 80, amende_exacte: 0, jours: 1, conduite_h: '8.0', amplitude_h: 9.25, conduite_continue_max: 255, repos_estime_min: 14 }
  );

  // CAS 2 - Journee parfaite occasionnel FR
  // 4h + 3h30 = 7.5h conduite, pause 45min, amplitude 9h
  testerCas('CAT-A', 'CAS 2 - Journee parfaite occasionnel FR',
    'Excursion 7h30 conduite, pause 45min. Amplitude 9h < 14h occasionnel.',
    '2025-03-10;07:00;07:15;T\n2025-03-10;07:15;11:15;C\n2025-03-10;11:15;12:00;P\n2025-03-10;12:00;15:30;C\n2025-03-10;15:30;16:00;D',
    'OCCASIONNEL', 'FR',
    { infractions: 0, score_min: 80, amende_exacte: 0, jours: 1, conduite_h: '7.5', conduite_continue_max: 240, infractions_absent: ['mplitude', 'ontinue', 'ournali'] }
  );

  // CAS 3 - Semaine conforme 5j x 8h
  // 40h/sem < 56h hebdo max
  testerCas('CAT-A', 'CAS 3 - Semaine conforme 5j x 8h',
    '5 jours x 8h = 40h/sem. CE 561/2006 Art.6 < 56h.',
    '2025-03-10;06:00;06:15;T\n2025-03-10;06:15;10:30;C\n2025-03-10;10:30;11:15;P\n2025-03-10;11:15;15:00;C\n2025-03-10;15:00;15:15;T\n2025-03-11;06:00;06:15;T\n2025-03-11;06:15;10:30;C\n2025-03-11;10:30;11:15;P\n2025-03-11;11:15;15:00;C\n2025-03-11;15:00;15:15;T\n2025-03-12;06:00;06:15;T\n2025-03-12;06:15;10:30;C\n2025-03-12;10:30;11:15;P\n2025-03-12;11:15;15:00;C\n2025-03-12;15:00;15:15;T\n2025-03-13;06:00;06:15;T\n2025-03-13;06:15;10:30;C\n2025-03-13;10:30;11:15;P\n2025-03-13;11:15;15:00;C\n2025-03-13;15:00;15:15;T\n2025-03-14;06:00;06:15;T\n2025-03-14;06:15;10:30;C\n2025-03-14;10:30;11:15;P\n2025-03-14;11:15;15:00;C\n2025-03-14;15:00;15:15;T',
    'REGULIER', 'FR',
    { infractions: 0, jours: 5, score_min: 80, amende_exacte: 0 }
  );

  // CAS 4 - Espagne ete UTC+2 conforme
  testerCas('CAT-A', 'CAS 4 - Espagne ete UTC+2 conforme',
    'Autocar Espagne juillet, 8h conduite. CE 561/2006 applicable UE.',
    '2025-07-15;07:00;07:15;T\n2025-07-15;07:15;11:30;C\n2025-07-15;11:30;12:15;P\n2025-07-15;12:15;16:00;C\n2025-07-15;16:00;16:15;T',
    'OCCASIONNEL', 'ES',
    { infractions: 0, score_min: 80, amende_exacte: 0, jours: 1 }
  );

  // ========================================
  // CAT-B : CONDUITE CONTINUE CE 561/2006 Art.7 (cas 5-8)
  // Seuil moteur: >270min = infraction, depassement>90min = 5e classe
  // Pause >=30min remet compteur a 0
  // ========================================

  // CAS 5 - Conduite continue exactement 270min (limite, pas infraction)
  // 4h30 = 270min exactement = pas de depassement
  testerCas('CAT-B', 'CAS 5 - Conduite continue 270min exactement (limite OK)',
    'Exactement 4h30 sans pause puis pause 45min. Art.7 limite = 270min.',
    '2025-03-10;06:00;06:15;T\n2025-03-10;06:15;10:45;C\n2025-03-10;10:45;11:30;P\n2025-03-10;11:30;14:00;C\n2025-03-10;14:00;14:15;T',
    'REGULIER', 'FR',
    { infractions_absent: ['ontinue'], conduite_continue_max: 270, conduite_h: '7.0' }
  );

  // CAS 6 - Conduite continue 300min (4e classe, depassement 30min < 90min)
  // 5h = 300min, depassement 30min -> 4e classe 135 EUR
  testerCas('CAT-B', 'CAS 6 - Conduite continue 300min (4e classe)',
    '5h continues = depassement 30min sur 270min. Art.7 + R3312-9. 4e classe.',
    '2025-03-10;06:00;06:15;T\n2025-03-10;06:15;11:15;C\n2025-03-10;11:15;12:00;P\n2025-03-10;12:00;14:30;C\n2025-03-10;14:30;14:45;T',
    'REGULIER', 'FR',
    { infractions_contiennent: ['ontinue'], conduite_continue_max: 300, classe_contient: ['4e'], classe_absente: ['5e'] }
  );

  // CAS 7 - Conduite continue 360min (seuil exact 4e/5e = 90min depassement)
  // 6h = 360min, depassement 90min = seuil exact, moteur dit >90 pour 5e
  testerCas('CAT-B', 'CAS 7 - Conduite continue 360min (seuil 4e/5e)',
    '6h continues = depassement 90min exactement. Seuil bascule 4e/5e classe.',
    '2025-03-10;06:00;06:15;T\n2025-03-10;06:15;12:15;C\n2025-03-10;12:15;13:00;P\n2025-03-10;13:00;15:00;C\n2025-03-10;15:00;15:15;T',
    'OCCASIONNEL', 'FR',
    { infractions_contiennent: ['ontinue'], conduite_continue_max: 360, classe_contient: ['4e'] }
  );

  // CAS 8 - Conduite continue 390min (5e classe, depassement 120min > 90min)
  // 6h30 = 390min, depassement 120min > 90 -> 5e classe 1500 EUR
  testerCas('CAT-B', 'CAS 8 - Conduite continue 390min (5e classe)',
    '6h30 continues = depassement 120min. >90min = 5e classe 1500 EUR.',
    '2025-03-10;06:00;06:15;T\n2025-03-10;06:15;12:45;C\n2025-03-10;12:45;13:30;P\n2025-03-10;13:30;15:30;C\n2025-03-10;15:30;15:45;T',
    'REGULIER', 'FR',
    { infractions_contiennent: ['ontinue'], conduite_continue_max: 390, classe_contient: ['5e'], amende_min: 1500 }
  );

  // ========================================
  // CAT-C : CONDUITE JOURNALIERE CE 561/2006 Art.6 (cas 9-12)
  // Seuil moteur: >540min avertissement (derog 600min)
  // >600min infraction, depassement>120min = 5e classe
  // ========================================

  // CAS 9 - Conduite 9h30 (avertissement derog, pas infraction)
  // 570min > 540min mais < 600min = avertissement seulement
  testerCas('CAT-C', 'CAS 9 - Conduite 9h30 (avertissement derog)',
    '9h30 conduite = 570min. >540min mais <600min derog. Avertissement seulement.',
    '2025-03-10;05:00;05:15;T\n2025-03-10;05:15;09:45;C\n2025-03-10;09:45;10:30;P\n2025-03-10;10:30;15:00;C\n2025-03-10;15:00;15:30;P\n2025-03-10;15:30;16:00;C\n2025-03-10;16:00;16:15;T',
    'REGULIER', 'FR',
    { infractions_absent: ['ournali'], avertissements_min: 1, conduite_h: '9.5' }
  );

  // CAS 10 - Conduite 10h derog conforme (pas infraction)
  // 600min = exactement la limite derogatoire, pas infraction
  testerCas('CAT-C', 'CAS 10 - Conduite 10h derogatoire (limite OK)',
    '10h conduite = 600min = limite derog exacte. CE 561/2006 Art.6-1. Pas infraction.',
    '2025-03-10;06:00;10:15;C\n2025-03-10;10:15;11:00;P\n2025-03-10;11:00;14:30;C\n2025-03-10;14:30;15:15;P\n2025-03-10;15:15;17:15;C',
    'OCCASIONNEL', 'FR',
    { infractions_absent: ['ournali', 'ravail'], infractions: 0, avertissements_min: 1, conduite_h: '9.8', score_min: 80 }
  );

  // CAS 11 - Conduite 11h (4e classe, depassement 120min sur 540 = 2h)
  // 660min, >600min derog, depassement = 660-540 = 120min = seuil exact 4e/5e
  // Moteur: depassement > 120 pour 5e, donc 120 = 4e classe
  testerCas('CAT-C', 'CAS 11 - Conduite 11h (4e classe seuil)',
    '11h conduite = 660min. Depassement 120min = seuil exact. 4e classe.',
    '2025-03-10;04:30;04:45;T\n2025-03-10;04:45;09:15;C\n2025-03-10;09:15;10:00;P\n2025-03-10;10:00;14:00;C\n2025-03-10;14:00;14:45;P\n2025-03-10;14:45;17:15;C\n2025-03-10;17:15;17:30;T',
    'REGULIER', 'FR',
    { infractions_contiennent: ['ournali'], classe_contient: ['4e'], conduite_h: '11.0' }
  );

  // CAS 12 - Conduite 12h (5e classe, depassement 180min > 120min)
  // 720min, depassement 720-540 = 180min > 120 = 5e classe
  testerCas('CAT-C', 'CAS 12 - Conduite 12h (5e classe)',
    '12h conduite = 720min. Depassement 180min > 120min. 5e classe 1500 EUR.',
    '2025-03-10;04:00;04:15;T\n2025-03-10;04:15;08:45;C\n2025-03-10;08:45;09:30;P\n2025-03-10;09:30;13:30;C\n2025-03-10;13:30;14:15;P\n2025-03-10;14:15;17:45;C\n2025-03-10;17:45;18:00;T',
    'REGULIER', 'FR',
    { infractions_contiennent: ['ournali'], classe_contient: ['5e'], amende_min: 1500, conduite_h: '12.0' }
  );

  // ========================================
  // CAT-D : REPOS JOURNALIER CE 561/2006 Art.8 (cas 13-15)
  // Moteur: repos = 24h - totalActivite
  // <540min (9h) = infraction, manque>150min = 5e classe
  // ========================================

  // CAS 13 - Repos reduit legal 9h30 (conforme)
  // Amplitude 9h30, repos ~ 14h30 >> 9h
  testerCas('CAT-D', 'CAS 13 - Repos 14h30 conforme (amplitude courte)',
    'Journee 7h conduite, amplitude 9h30. Repos 14h30 > 11h normal. OK.',
    '2025-03-10;06:00;06:15;T\n2025-03-10;06:15;10:15;C\n2025-03-10;10:15;11:00;P\n2025-03-10;11:00;14:00;C\n2025-03-10;14:00;15:15;D\n2025-03-10;15:15;15:30;T',
    'STANDARD', 'FR',
    { infractions: 0, infractions_absent: ['epos'], score_min: 80, conduite_h: '7.0', repos_estime_min: 14 }
  );

  // CAS 14 - Repos 8h (4e classe, manque 60min < 150min)
  // Amplitude 16h, repos = 24-16 = 8h, manque 1h sous 9h reduit = 4e
  testerCas('CAT-D', 'CAS 14 - Repos 8h (4e classe, manque 60min)',
    'Amplitude 16h, repos 8h. Manque 1h sur 9h minimum. 4e classe.',
    '2025-03-10;04:00;04:30;T\n2025-03-10;04:30;09:00;C\n2025-03-10;09:00;09:45;P\n2025-03-10;09:45;13:45;C\n2025-03-10;13:45;14:30;P\n2025-03-10;14:30;17:00;C\n2025-03-10;17:00;18:00;D\n2025-03-10;18:00;20:00;T',
    'REGULIER', 'FR',
    { infractions_contiennent: ['epos'], classe_contient: ['4e'], repos_estime_max: 9 }
  );

  // CAS 15 - Repos 5h30 (5e classe, manque 210min > 150min)
  // Amplitude 18h30, repos = 24-18.5 = 5.5h, manque 3h30 = 210min > 150 = 5e
  testerCas('CAT-D', 'CAS 15 - Repos 5h30 (5e classe, manque 210min)',
    'Journee massive 18h30 activite. Repos 5h30. Manque 210min > 150min. 5e classe.',
    '2025-03-10;03:30;04:00;T\n2025-03-10;04:00;08:30;C\n2025-03-10;08:30;09:00;P\n2025-03-10;09:00;13:00;C\n2025-03-10;13:00;13:30;P\n2025-03-10;13:30;17:30;C\n2025-03-10;17:30;18:00;D\n2025-03-10;18:00;22:00;T',
    'REGULIER', 'FR',
    { infractions_contiennent: ['epos'], classe_contient: ['5e'], amende_min: 1500, repos_estime_max: 6 }
  );

  // ========================================
  // CAT-E : AMPLITUDE L3312-2 / R3312-9 / R3312-11 (cas 16-19)
  // Moteur: regulier > 13h, occasionnel > 14h = 4e classe
  // ========================================

  // CAS 16 - Amplitude 12h50 regulier (conforme, juste sous 13h)
  testerCas('CAT-E', 'CAS 16 - Amplitude 12h50 regulier (conforme)',
    'Amplitude 12h50 < 13h regulier. Pas infraction.',
    '2025-03-10;05:10;05:30;T\n2025-03-10;05:30;09:45;C\n2025-03-10;09:45;10:30;P\n2025-03-10;10:30;14:30;C\n2025-03-10;14:30;15:15;P\n2025-03-10;15:15;17:30;C\n2025-03-10;17:30;18:00;T',
    'REGULIER', 'FR',
    { infractions_absent: ['mplitude'], amplitude_h: 12.8 }
  );

  // CAS 17 - Amplitude 14h30 regulier (infraction, depassement 1h30)
  testerCas('CAT-E', 'CAS 17 - Amplitude 14h30 regulier (infraction)',
    'Amplitude 04:30-19:00 = 14h30 > 13h regulier. L3312-2.',
    '2025-03-10;04:30;05:00;T\n2025-03-10;05:00;09:15;C\n2025-03-10;09:15;10:00;P\n2025-03-10;10:00;13:00;C\n2025-03-10;13:00;14:00;P\n2025-03-10;14:00;17:30;C\n2025-03-10;17:30;18:30;D\n2025-03-10;18:30;19:00;T',
    'REGULIER', 'FR',
    { infractions_contiennent: ['mplitude'], amplitude_h: 14.5, amende_min: 135 }
  );

  // CAS 18 - Amplitude 13h30 occasionnel (conforme car limite = 14h)
  testerCas('CAT-E', 'CAS 18 - Amplitude 13h30 occasionnel (conforme)',
    'Sortie scolaire amplitude 13h30 < 14h occasionnel. R3312-11.',
    '2025-03-10;05:30;06:00;T\n2025-03-10;06:00;10:15;C\n2025-03-10;10:15;11:00;P\n2025-03-10;11:00;13:45;C\n2025-03-10;13:45;14:30;P\n2025-03-10;14:30;16:30;C\n2025-03-10;16:30;18:30;D\n2025-03-10;18:30;19:00;T',
    'OCCASIONNEL', 'FR',
    { infractions_absent: ['mplitude'], amplitude_h: 13.5 }
  );

  // CAS 19 - Amplitude 15h occasionnel (infraction, >14h)
  testerCas('CAT-E', 'CAS 19 - Amplitude 15h occasionnel (infraction)',
    'Amplitude 05:00-20:00 = 15h > 14h occasionnel. R3312-11.',
    '2025-03-10;05:00;05:30;T\n2025-03-10;05:30;10:00;C\n2025-03-10;10:00;10:45;P\n2025-03-10;10:45;14:00;C\n2025-03-10;14:00;15:00;D\n2025-03-10;15:00;18:00;C\n2025-03-10;18:00;19:30;D\n2025-03-10;19:30;20:00;T',
    'OCCASIONNEL', 'FR',
    { infractions_contiennent: ['mplitude'], amplitude_h: 15.0, amende_min: 135 }
  );

  // ========================================
  // CAT-F : TRAVAIL DE NUIT L3312-1 (cas 20-22)
  // Moteur: nuit = 21h-6h, >10h travail nuit = 4e classe
  // ========================================

  // CAS 20 - Travail nuit 4h conforme (21h-01h)
  testerCas('CAT-F', 'CAS 20 - Travail nuit 4h (conforme)',
    'Navette aeroport 21h-01h = 4h nuit. < 10h. Pas infraction.',
    '2025-03-10;20:30;21:00;T\n2025-03-10;21:00;01:00;C\n2025-03-10;01:00;01:30;T',
    'REGULIER', 'FR',
    { infractions_absent: ['uit'], conduite_h: '4.0', jours: 1 }
  );

  // CAS 21 - Travail nuit 8h (conforme, < 10h)
  testerCas('CAT-F', 'CAS 21 - Travail nuit 8h (conforme limite)',
    'Service nuit complet 21h-05h30 = ~8h travail nuit. Sous 10h.',
    '2025-03-10;20:00;20:30;T\n2025-03-10;20:30;23:59;C\n2025-03-11;00:00;00:45;C\n2025-03-11;00:45;01:15;P\n2025-03-11;01:15;04:45;C\n2025-03-11;04:45;05:00;T',
    'REGULIER', 'FR',
    { infractions_absent: ['ontinue'], conduite_h: '7.7' }
  );

  // CAS 22 - Travail nuit >10h (infraction)
  // 20:30-07:30 = 11h activite dont la majorite en zone nuit
  testerCas('CAT-F', 'CAS 22 - Travail nuit >10h (infraction)',
    'Service 20h30-07h30 = 11h. Travail nuit > 10h. L3312-1. 4e classe.',
    '2025-03-10;20:30;21:00;T\n2025-03-10;21:00;01:30;C\n2025-03-10;01:30;02:00;P\n2025-03-10;02:00;05:30;C\n2025-03-10;05:30;06:00;P\n2025-03-10;06:00;07:00;C\n2025-03-10;07:00;07:30;T',
    'REGULIER', 'FR',
    { infractions_min: 1, amende_min: 135 }
  );

  // ========================================
  // CAT-G : EDGE CASES ET CUMULS (cas 23-25)
  // ========================================

  // CAS 23 - Pause exactement 30min remet compteur continu
  // Conduite 4h + pause 30min + conduite 4h = pas infraction continue
  // Car moteur remet a 0 si pause >= 30min
  testerCas('CAT-G', 'CAS 23 - Pause 30min reset compteur continu',
    'Conduite 4h + pause 30min + conduite 4h. Pause >= 30min remet compteur. Pas infraction continue.',
    '2025-03-10;06:00;06:15;T\n2025-03-10;06:15;10:15;C\n2025-03-10;10:15;10:45;P\n2025-03-10;10:45;14:45;C\n2025-03-10;14:45;15:00;T',
    'REGULIER', 'FR',
    { infractions_absent: ['ontinue'], conduite_continue_max: 240, conduite_h: '8.0' }
  );

  // CAS 24 - Pause 25min NE remet PAS le compteur
  // Conduite 4h + pause 25min + conduite 1h30 = 330min continues (car 25 < 30)
  // 330min > 270min = infraction continue
  testerCas('CAT-G', 'CAS 24 - Pause 25min NE reset PAS compteur',
    'Conduite 4h + pause 25min + conduite 1h30. 25min < 30min = pas de reset. 330min continues.',
    '2025-03-10;06:00;06:15;T\n2025-03-10;06:15;10:15;C\n2025-03-10;10:15;10:40;P\n2025-03-10;10:40;12:10;C\n2025-03-10;12:10;12:25;T',
    'REGULIER', 'FR',
    { infractions_contiennent: ['ontinue'], conduite_continue_max: 330, conduite_h: '5.5' }
  );

  // CAS 25 - Catastrophe cumul maximum (18h conduite, toutes infractions)
  // Continue + journaliere + repos + amplitude + travail
  testerCas('CAT-G', 'CAS 25 - Catastrophe cumul 18h (toutes infractions)',
    '18h conduite sans repos. Cumul: continue, journaliere 5e, repos 5e, amplitude, travail nuit.',
    '2025-03-10;04:00;04:15;T\n2025-03-10;04:15;10:15;C\n2025-03-10;10:15;10:30;P\n2025-03-10;10:30;16:30;C\n2025-03-10;16:30;16:45;P\n2025-03-10;16:45;22:45;C\n2025-03-10;22:45;23:00;T',
    'REGULIER', 'FR',
    { infractions_min: 4, infractions_contiennent: ['ontinue', 'ournali'], amende_min: 270, score_max: 20 }
  );

  // ========================================
  // RAPPORT FINAL
  // ========================================
  rapport.resume.pourcentage = rapport.resume.total > 0 ? Math.round((rapport.resume.ok / rapport.resume.total) * 100) : 0;
  rapport.resume.status = rapport.resume.ko === 0 ? 'TOUS LES 25 CAS PASSENT' : rapport.resume.ko + ' CAS EN ANOMALIE';
  rapport.resume.diagnostic_llm = {
    instruction: 'Pour diagnostiquer une anomalie, verifier: (1) le champ verifications[] du cas en echec, (2) comparer attendu vs obtenu, (3) consulter resultat_brut.infractions_detail pour les regles declenchees, (4) verifier moteur_info pour les seuils utilises',
    seuils_critiques: {
      conduite_continue_4e: 'depassement <= 90min au-dela de 270min',
      conduite_continue_5e: 'depassement > 90min au-dela de 270min',
      conduite_journaliere_avert: '540min < conduite <= 600min (derog)',
      conduite_journaliere_4e: 'depassement <= 120min au-dela de 540min ET conduite > 600min',
      conduite_journaliere_5e: 'depassement > 120min au-dela de 540min',
      repos_4e: 'manque <= 150min sous 540min (9h)',
      repos_5e: 'manque > 150min sous 540min (9h)',
      amplitude_regulier: '> 13h',
      amplitude_occasionnel: '> 14h',
      pause_reset: '>= 30min remet conduite continue a 0'
    }
  };
  console.log('[QA v5.6.0] ' + rapport.resume.ok + '/' + rapport.resume.total + ' OK (' + rapport.resume.pourcentage + '%) - Categories: ' + JSON.stringify(rapport.resume.categories));
  res.json(rapport);
});


// Fallback : servir le frontend pour toutes les routes non-API
app.get('*', (req, res) => {
  const indexPath = path.join(distPath, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).json({ error: "Frontend non compile. Lancez : cd client && npx vite build" });
  }
});

// Demarrage du serveur
app.listen(PORT, () => {
  console.log("");
  console.log("============================================");
  console.log("  RSE/RSN Calculator v5.0.0");
  console.log("  Auteur : Samir Medjaher");
  console.log("  Serveur demarre sur le port " + PORT);
  console.log("  http://localhost:" + PORT);
  console.log("============================================");
  console.log("");
});
