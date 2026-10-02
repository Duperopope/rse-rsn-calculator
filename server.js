// ============================================================
// FIMO Check - Serveur Backend (version synchronisee avec package.json)
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
//     https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000046177522
//     https://www.sinari.com/blog/infractions-transport-routier
// ============================================================

const express = require('express');
const multer = require('multer');
const cors = require('cors');
const helmet = require('helmet');
const { rateLimit } = require('express-rate-limit');
const path = require('path');
const registerDiagnosticRoutes = require('./server/diagnostic-routes');
const fs = require('fs');
const { version: APP_VERSION } = require('./package.json');

const app = express();

// === FIX-ENGINE v7.6.10.1 - Correcteur post-traitement ===
const { corrigerResultat } = require('./fix-engine.js');
const { genererRapportPDF } = require('./pdf-generator.js');
// === FIN FIX-ENGINE IMPORT ===
const PORT = process.env.PORT || 3001;

if (process.env.NODE_ENV === 'production') {
  // Render et les reverse proxies transmettent l'IP via X-Forwarded-For.
  app.set('trust proxy', 1);
}
app.disable('x-powered-by');

const allowedOrigins = new Set(
  (process.env.CORS_ORIGINS || 'http://localhost:5173,http://127.0.0.1:5173')
    .split(',')
    .map(function(origin) { return origin.trim(); })
    .filter(Boolean)
);

app.use(helmet({
  crossOriginResourcePolicy: { policy: 'same-origin' },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      baseUri: ["'self'"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'", 'data:'],
      formAction: ["'self'"],
      frameAncestors: ["'none'"],
      imgSrc: ["'self'", 'data:'],
      objectSrc: ["'none'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"]
    }
  }
}));

app.use(function(req, res, next) {
  return cors({
    origin: function(origin, callback) {
      // Autoriser les clients serveur, les origines explicites et le host courant
      // (Render ou futur domaine custom) sans ouvrir CORS a tout Internet.
      if (!origin || allowedOrigins.has(origin)) return callback(null, true);
      try {
        var originUrl = new URL(origin);
        var requestHost = req.get('x-forwarded-host') || req.get('host');
        if (requestHost && originUrl.host === requestHost) return callback(null, true);
      } catch (parseErr) {
        // Une Origin invalide est refusee ci-dessous.
      }
      var err = new Error('Origin CORS non autorisee');
      err.status = 403;
      return callback(err);
    },
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type'],
    maxAge: 86400
  })(req, res, next);
});

app.use(express.json({ limit: '2mb', strict: true }));

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 120,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'Trop de requetes. Reessayez dans une minute.' }
});
const expensiveLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'Trop d analyses ou exports. Reessayez dans une minute.' }
});

app.use('/api', apiLimiter);

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
const upload = multer({
  dest: uploadsDir,
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: function(req, file, callback) {
    var name = String(file.originalname || '').toLowerCase();
    var mime = String(file.mimetype || '').toLowerCase();
    var validName = name.endsWith('.csv') || name.endsWith('.txt');
    var validMime = !mime || mime.indexOf('text/') === 0 || mime === 'application/csv' || mime === 'application/vnd.ms-excel';
    if (!validName || !validMime) {
      var err = new Error('Seuls les fichiers CSV/TXT sont acceptes.');
      err.status = 415;
      return callback(err);
    }
    return callback(null, true);
  }
});

// ============================================================
// CONSTANTES REGLEMENTAIRES
// ============================================================
// ============================================================
// REGLES PAR TYPE DE SERVICE v7.6.0
// ============================================================
// REGULIER <=50km : Decret 2006-925, 2000-118, R3312-28, R3312-11, D3312-6
//   https://www.legifrance.gouv.fr/loda/id/JORFTEXT000000423284/
//   https://www.domformateur.com/pages/transport-de-voyageurs/duree-de-travail-du-transport-urbain.html
// SLO >50km : CE 561/2006, R3312-9, R3312-11
//   https://eur-lex.europa.eu/FR/legal-content/summary/driving-time-and-rest-periods-in-the-road-transport-sector.html
//   https://www.domformateur.com/pages/tronc-commun/durees-de-conduite-temps-de-pause-et-temps-de-repos.html
// OCCASIONNEL : CE 561/2006 + 2024/1258
//   https://eur-lex.europa.eu/eli/reg/2024/1258/oj
// ============================================================

const REGLES_COMMUN = {
  NUIT_DEBUT_H: 21,
  NUIT_FIN_H: 6,
  TRAVAIL_NUIT_MAX_H: 10,
  CONDUITE_NUIT_CONTINUE_MAX_MIN: 240,
  NUIT_CONDUITE_DEBUT_H: 21,
  NUIT_CONDUITE_FIN_H: 6,
  REPOS_JOURNALIER_FRACTIONNE_PART1_MIN_H: 3,
  REPOS_JOURNALIER_FRACTIONNE_PART2_MIN_H: 9,
  REPOS_JOURNALIER_FRACTIONNE_TOTAL_H: 12,
  DEPASSEMENT_EXCEPTIONNEL_1H_MIN: 60,
  DEPASSEMENT_EXCEPTIONNEL_2H_MIN: 120,
  REPOS_HEBDO_RETARD_SEUIL_4E_CLASSE_H: 12,
  COMPENSATION_ECHEANCE_SEMAINES: 3,
  RETOUR_DOMICILE_MAX_SEMAINES: 4,
  DEROG_12_JOURS_MAX_PERIODES: 12,                // Regle 12 jours occasionnel - Art.8 para.6bis
};

// REGULIER <=50km — EXEMPT CE 561/2006 Art.3 par.1(a)
const REGLES_REGULIER = {
  ID: "REGULIER",
  LABEL: "Service regulier (<=50 km) - Droit national FR",
  EXEMPTION_CE_561: true,
  // Amplitude (Decret 2006-925 art.6 + R3312-28)
  AMPLITUDE_MAX_H: 11,
  AMPLITUDE_DEROGATOIRE_MAX_H: 13,
  // Travail quotidien (R3312-11 + D3312-6)
  TRAVAIL_JOURNALIER_MAX_H: 9,
  TRAVAIL_JOURNALIER_DEROGATOIRE_MAX_H: 10,
  TRAVAIL_DEROG_MAX_PAR_SEMAINE: 2,
  // Pause (Decret 2006-925 art.9)
  PAUSE_APRES_TRAVAIL_CONTINU_MIN: 360,
  PAUSE_MINIMALE_APRES_6H_MIN: 20,
  PAUSE_FRACTIONNEMENT_MIN: 5,
  PAUSE_REPAS_MIN: 45,
  PAUSE_REPAS_DEBUT_H: 11.5,
  PAUSE_REPAS_FIN_H: 14,
  MAX_COUPURES_COMPTEES: 2,
  COUPURE_MAX_COMPTEE_MIN: 30,
  // PAS de conduite continue/journaliere/hebdo CE 561 (exempt)
  CONDUITE_CONTINUE_MAX_MIN: null,
  PAUSE_OBLIGATOIRE_MIN: null,
  CONDUITE_JOURNALIERE_MAX_MIN: null,
  CONDUITE_JOURNALIERE_DEROGATOIRE_MAX_MIN: null,
  CONDUITE_HEBDOMADAIRE_MAX_MIN: null,
  CONDUITE_BIHEBDO_MAX_MIN: null,
  CONDUITE_DEROG_MAX_PAR_SEMAINE: null,
  // Repos journalier (Decret 2006-925 art.7)
  REPOS_JOURNALIER_NORMAL_H: 11,
  REPOS_JOURNALIER_REDUIT_H: 10,
  REPOS_JOURNALIER_3x8_H: 9,
  REPOS_REDUIT_MAX_ENTRE_HEBDO: 3,
  // Repos hebdo (Decret 2006-925 art.8)
  REPOS_HEBDO_NORMAL_H: 35,
  REPOS_HEBDO_REDUIT_H: 24,
  // Hebdo travail (Decret 2000-118)
  TRAVAIL_HEBDO_MAX_H: 46,
  TRAVAIL_HEBDO_MOYENNE_MAX_H: 42,
  TRAVAIL_HEBDO_MOYENNE_SEMAINES: 12,
  // Multi-equipage
  MULTI_REPOS_JOURNALIER_MIN_H: 9,
  MULTI_DELAI_REPOS_H: 30
};

// SLO >50km — CE 561/2006 complet
const REGLES_SLO = {
  ID: "SLO",
  LABEL: "Service Librement Organise (>50 km) - CE 561/2006",
  EXEMPTION_CE_561: false,
  // Amplitude (R3312-9 + R3312-11)
  AMPLITUDE_MAX_H: 12,
  AMPLITUDE_DEROGATOIRE_MAX_H: 14,
  SLO_COUPURE_12_13_MIN: 150,
  SLO_COUPURE_13_14_MIN: 180,
  // Travail quotidien (D3312-6)
  TRAVAIL_JOURNALIER_MAX_H: 10,
  TRAVAIL_JOURNALIER_DEROGATOIRE_MAX_H: 12,
  TRAVAIL_DEROG_MAX_PAR_SEMAINE: 2,
  // Pause conduite continue (CE 561/2006 Art.7)
  PAUSE_APRES_TRAVAIL_CONTINU_MIN: null,
  PAUSE_MINIMALE_APRES_6H_MIN: null,
  PAUSE_FRACTIONNEMENT_MIN: null,
  PAUSE_REPAS_MIN: null,
  PAUSE_REPAS_DEBUT_H: null,
  PAUSE_REPAS_FIN_H: null,
  MAX_COUPURES_COMPTEES: null,
  COUPURE_MAX_COMPTEE_MIN: null,
  // Conduite continue (CE 561/2006 Art.7)
  CONDUITE_CONTINUE_MAX_MIN: 270,
  PAUSE_OBLIGATOIRE_MIN: 45,
  // Conduite journaliere (CE 561/2006 Art.6)
  CONDUITE_JOURNALIERE_MAX_MIN: 540,
  CONDUITE_JOURNALIERE_DEROGATOIRE_MAX_MIN: 600,
  CONDUITE_DEROG_MAX_PAR_SEMAINE: 2,
  // Conduite hebdomadaire (CE 561/2006 Art.6)
  CONDUITE_HEBDOMADAIRE_MAX_MIN: 3360,
  CONDUITE_BIHEBDO_MAX_MIN: 5400,
  // Repos journalier (CE 561/2006 Art.8)
  REPOS_JOURNALIER_NORMAL_H: 11,
  REPOS_JOURNALIER_REDUIT_H: 9,
  REPOS_JOURNALIER_3x8_H: null,
  REPOS_REDUIT_MAX_ENTRE_HEBDO: 3,
  // Repos hebdo (CE 561/2006 Art.8)
  REPOS_HEBDO_NORMAL_H: 45,
  REPOS_HEBDO_REDUIT_H: 24,
  // Travail hebdo (Code du travail)
  TRAVAIL_HEBDO_MAX_H: 48,
  TRAVAIL_HEBDO_MOYENNE_MAX_H: 44,
  TRAVAIL_HEBDO_MOYENNE_SEMAINES: 12,
  // Multi-equipage (Art.8 par.5)
  MULTI_REPOS_JOURNALIER_MIN_H: 9,
  MULTI_DELAI_REPOS_H: 30
};

// OCCASIONNEL — CE 561/2006 + Regl. 2024/1258
const REGLES_OCCASIONNEL = Object.assign({}, REGLES_SLO, {
  ID: "OCCASIONNEL",
  LABEL: "Service occasionnel - CE 561/2006 + 2024/1258",
  // Amplitude (R3312-28)
  AMPLITUDE_MAX_H: 12,
  AMPLITUDE_DEROGATOIRE_MAX_H: 14,
  // Pause fractionnee 2x15min (Art.7 - 2024/1258)
  PAUSE_FRACTIONNEE_OCCASIONNEL_MIN: 15,
  // Report 12 jours (Art.8 par.6bis)
  DEROG_12_JOURS_MAX_PERIODES: 12
});
// ============================================================
// [PATCH v7.6.8] HELPER : Calcul repos journalier inter-jour
// Source : CE 561/2006 Art.8§2, Art.4§g
// Repos normal >= 11h, repos reduit >= 9h (max 3 reduits entre 2 hebdo)
// Ref: https://eur-lex.europa.eu/legal-content/FR/TXT/HTML/?uri=CELEX:02006R0561-20240522
// ============================================================
function calculerReposJournalier(jourPrecedent, jourCourant) {
  // jourPrecedent = { derniere_fin_minutes: Number } (minutes depuis 00:00)
  // jourCourant   = { premier_debut_minutes: Number } (minutes depuis 00:00)
  // Retourne le repos en heures (float)
  
  if (!jourPrecedent || jourPrecedent.derniere_fin_minutes === undefined) {
    return 24; // Premier jour => pas de contrainte
  }
  if (!jourCourant || jourCourant.premier_debut_minutes === undefined) {
    return 24; // Jour de repos complet => 24h
  }
  
  // Gap = (24h - fin jour precedent) + debut jour courant
  const finPrecedentMin = jourPrecedent.derniere_fin_minutes;
  const debutCourantMin = jourCourant.premier_debut_minutes;
  const gapMinutes = (1440 - finPrecedentMin) + debutCourantMin;
  const gapHeures = gapMinutes / 60;
  
  console.log(`[v7.6.8] Repos inter-jour: fin=${finPrecedentMin}min -> debut=${debutCourantMin}min = ${gapHeures.toFixed(1)}h`);
  return gapHeures;
}

// [PATCH v7.6.8] HELPER : Detecter jours de repos complets
function estJourReposComplet(activitesJour) {
  if (!activitesJour || activitesJour.length === 0) return true;
  // Si la seule activite est "Repos" couvrant 00:00-24:00
  if (activitesJour.length === 1 && activitesJour[0].type === 'Repos') {
    return true;
  }
  // Aucune conduite ni travail
  const aConduite = activitesJour.some(a => a.type === 'Conduite');
  const aTravail = activitesJour.some(a => a.type === 'Travail' || a.type === 'Autre tache');
  return !aConduite && !aTravail;
}
// ============================================================
// [PATCH v7.6.8] HELPER : Grouper les jours par semaine ISO
// CE 561/2006 Art.4§i : semaine = lundi 00:00 -> dimanche 24:00
// Art.6§2 : conduite hebdo <= 56h
// Art.6§3 : conduite bi-hebdo <= 90h
// ============================================================
function getISOWeekNumber(dateStr) {
  const d = new Date(dateStr);
  const dayNum = d.getUTCDay() || 7; // Lundi = 1, Dimanche = 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
}

function grouperParSemaineISO(detailsJours) {
  const semaines = {};
  for (const jour of detailsJours) {
    const weekNum = getISOWeekNumber(jour.date);
    const yearWeekKey = `${new Date(jour.date).getUTCFullYear()}-W${String(weekNum).padStart(2, '0')}`;
    if (!semaines[yearWeekKey]) {
      semaines[yearWeekKey] = {
        semaine: yearWeekKey,
        jours: [],
        totalConduiteMinutes: 0,
        totalTravailMinutes: 0
      };
    }
    semaines[yearWeekKey].jours.push(jour);
    semaines[yearWeekKey].totalConduiteMinutes += (jour.conduite_minutes || 0);
    semaines[yearWeekKey].totalTravailMinutes += (jour.travail_minutes || 0);
  }
  return Object.values(semaines);
}

// [PATCH v7.6.8] HELPER : Verification conduite hebdo + bi-hebdo
function verifierConduiteHebdomadaire(semaines) {
  const infractions = [];
  const LIMITE_HEBDO_H = 56;
  const LIMITE_BIHEBDO_H = 90;
  
  for (let i = 0; i < semaines.length; i++) {
    const sem = semaines[i];
    const conduiteH = sem.totalConduiteMinutes / 60;
    
    // Conduite hebdomadaire > 56h (CE 561/2006 Art.6§2)
    if (conduiteH > LIMITE_HEBDO_H) {
      const depassement = conduiteH - LIMITE_HEBDO_H;
      const classe = depassement < 14 ? '4e' : '5e';
      infractions.push({
        regle: 'Conduite hebdomadaire',
        semaine: sem.semaine,
        limite: `${LIMITE_HEBDO_H}h`,
        constate: `${conduiteH.toFixed(1)}h`,
        depassement: `${depassement.toFixed(1)}h`,
        classe: classe,
        amende: classe === '4e' ? { forfaitaire: 135, maximale: 750 } : { forfaitaire: 1500, maximale: 3000 },
        ref_legale: 'CE 561/2006 Art.6§2 + Code transports R3315-10/R3315-11',
        url_legale: 'https://eur-lex.europa.eu/legal-content/FR/TXT/HTML/?uri=CELEX:02006R0561-20240522#d1e888-1-1'
      });
    }
    
    // Conduite bi-hebdomadaire > 90h (CE 561/2006 Art.6§3)
    if (i > 0) {
      const totalBiHebdo = (semaines[i-1].totalConduiteMinutes + sem.totalConduiteMinutes) / 60;
      if (totalBiHebdo > LIMITE_BIHEBDO_H) {
        const depassement = totalBiHebdo - LIMITE_BIHEBDO_H;
        const classe = depassement < 22.5 ? '4e' : '5e';
        infractions.push({
          regle: 'Conduite bi-hebdomadaire',
          semaines: `${semaines[i-1].semaine} + ${sem.semaine}`,
          limite: `${LIMITE_BIHEBDO_H}h`,
          constate: `${totalBiHebdo.toFixed(1)}h`,
          depassement: `${depassement.toFixed(1)}h`,
          classe: classe,
          amende: classe === '4e' ? { forfaitaire: 135, maximale: 750 } : { forfaitaire: 1500, maximale: 3000 },
          ref_legale: 'CE 561/2006 Art.6§3',
          url_legale: 'https://eur-lex.europa.eu/legal-content/FR/TXT/HTML/?uri=CELEX:02006R0561-20240522#d1e888-1-1'
        });
      }
    }
  }
  return infractions;
}

// [PATCH v7.6.8] HELPER : Verification repos hebdomadaire
// CE 561/2006 Art.8§6 : au moins 2 repos hebdo normaux (45h) OU 1 normal + 1 reduit (24h)
// Repos hebdo doit commencer au plus tard apres 6 periodes de 24h (= 144h)
function verifierReposHebdomadaire(detailsJours, typeService) {
  const infractions = [];
  let dernierReposHebdo = null;
  let joursDepuisDernierRepos = 0;
  
  for (let i = 0; i < detailsJours.length; i++) {
    const jour = detailsJours[i];
    
    // Detecter un bloc de repos >= 24h (repos hebdo reduit) ou >= 45h (normal)
    if (jour.repos_cumule_heures && jour.repos_cumule_heures >= 24) {
      dernierReposHebdo = jour;
      joursDepuisDernierRepos = 0;
    } else {
      joursDepuisDernierRepos++;
    }
    
    // Apres 6 periodes de 24h sans repos hebdo => infraction
    // [PATCH UE 2024/1258] Art.8(6a) - 12 jours si occasionnel
      const isOcc = (typeService === 'SLO' || typeService === 'OCCASIONNEL');
      const seuilMax = isOcc ? 12 : 6;
      if (joursDepuisDernierRepos > seuilMax) {
      const depassementH = (joursDepuisDernierRepos - seuilMax) * 24;
      const classe = depassementH < 12 ? '4e' : '5e';
      infractions.push({
        regle: 'Repos hebdomadaire insuffisant',
        date: jour.date,
        message: `${joursDepuisDernierRepos} jours sans repos hebdomadaire (max ${seuilMax} periodes de 24h${isOcc ? " - derogation occasionnel Art.8§6a" : ""})`,
        classe: classe,
        amende: classe === '4e' ? { forfaitaire: 135, maximale: 750 } : { forfaitaire: 1500, maximale: 3000 },
        ref_legale: isOcc ? 'CE 561/2006 Art.8§6a (UE 2024/1258)' : 'CE 561/2006 Art.8§6 + Code transports R3315-10§5',
        url_legale: 'https://eur-lex.europa.eu/legal-content/FR/TXT/HTML/?uri=CELEX:02006R0561-20240522#d1e982-1-1'
      });
    }
  }
  return infractions;
}


function getRegles(typeService) {
  // v7.20: Support de tous les types de service
  switch (typeService) {
    case "REGULIER": return REGLES_REGULIER;
    case "SLO": return REGLES_SLO;
    case "OCCASIONNEL": return REGLES_OCCASIONNEL;
    case "INTERURBAIN": return REGLES_SLO; // CE 561/2006 complet (lignes >50km entre villes)
    case "MARCHANDISES": return REGLES_SLO; // CE 561/2006 complet (transport marchandises)
    case "STANDARD": return REGLES_SLO; // Fallback
  }
}

// Alias retro-compatible : REGLES pointe vers SLO par defaut
// pour ne pas casser les references existantes hors analyserCSV
const REGLES = Object.assign({}, REGLES_COMMUN, REGLES_SLO);


// ============================================================
// ================================================================
// LIENS LEGAUX : URLs officielles pour chaque reference juridique
// Utilises automatiquement dans infractions et avertissements
// ================================================================
const LIENS_LEGAUX = {
  // ===== REGLEMENT EUROPEEN CE 561/2006 (texte consolidé) =====
  'CE 561/2006': 'https://eur-lex.europa.eu/legal-content/FR/TXT/HTML/?uri=CELEX:32006R0561',
  'CE 561/2006 Art.6': 'https://eur-lex.europa.eu/legal-content/FR/TXT/HTML/?uri=CELEX:32006R0561#d1e888-1-1',
  'CE 561/2006 Art.7': 'https://eur-lex.europa.eu/legal-content/FR/TXT/HTML/?uri=CELEX:32006R0561#d1e940-1-1',
  'CE 561/2006 Art.8': 'https://eur-lex.europa.eu/legal-content/FR/TXT/HTML/?uri=CELEX:32006R0561#d1e982-1-1',
  'CE 561/2006 Art.12': 'https://eur-lex.europa.eu/legal-content/FR/TXT/HTML/?uri=CELEX:32006R0561#d1e1157-1-1',

  // ===== REGLEMENT 2020/1054 (modification paquet mobilité) =====
  'Reglement 2020/1054': 'https://eur-lex.europa.eu/legal-content/FR/ALL/?uri=CELEX:32020R1054',

  // ===== REGLEMENT 2024/1258 (extension tachygraphe) =====
  'Reglement 2024/1258': 'https://eur-lex.europa.eu/eli/reg/2024/1258/oj',

  // ===== DECRET 2006-925 (transport urbain voyageurs) =====
  'Decret 2006-925': 'https://www.legifrance.gouv.fr/loda/id/JORFTEXT000000423284/',
  'Decret 2006-925 Art.9': 'https://www.legifrance.gouv.fr/jorf/article_jo/JORFARTI000002439868',
  'Décret 2006-925 art.6 + R3312-28': 'https://www.legifrance.gouv.fr/loda/id/JORFTEXT000000423284/',
  'C. transports R3312-9 / R3312-11': 'https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000043651232',

  // ===== DECRET 2010-855 (sanctions tachygraphe communautaire) =====
  'Decret 2010-855': 'https://www.legifrance.gouv.fr/loda/id/JORFTEXT000022512271',

  // ===== CODE DES TRANSPORTS - Partie legislative =====
  'L3312-1': 'https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000033021297',
  'L3312-2': 'https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000026054561',
  'L3313-3': 'https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000029234271',
  'L3315-4': 'https://www.legifrance.gouv.fr/codes/section_lc/LEGITEXT000023086525/LEGISCTA000023071312/',

  // ===== CODE DES TRANSPORTS - Partie réglementaire =====
  'R3312-9': 'https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000043651238',
  'R3312-11': 'https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000043651232',
  'R3312-13': 'https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000033450247',
  'R3312-28': 'https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000043651204',
  'R3315-4': 'https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000033450503',
  'R3315-10': 'https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000046177522',
  'R3315-11': 'https://www.legifrance.gouv.fr/codes/section_lc/LEGITEXT000023086525/LEGISCTA000033450515/'
};

// Fonction utilitaire : trouver l'URL pour une reference dans un texte
function trouverLienLegal(texteRegle) {
  if (!texteRegle) return null;
  // Chercher la reference la plus specifique d'abord (plus longue)
  var keys = Object.keys(LIENS_LEGAUX).sort(function(a, b) { return b.length - a.length; });
  for (var i = 0; i < keys.length; i++) {
    if (texteRegle.indexOf(keys[i]) !== -1) {
      return { ref: keys[i], url: LIENS_LEGAUX[keys[i]] };
    }
  }
  return null;
}

// BAREME DES SANCTIONS
// Source : R3315-10 (contravention 4e classe)
//          R3315-11 (contravention 5e classe)
//          https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000046177522
// ============================================================
const SANCTIONS = {
  classe_4: {
    intitule: "Contravention de 4e classe",
    amende_max: 750,
    amende_forfaitaire: 135, amende_minoree: 90, amende_majoree: 375,
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

// Helper: construit un objet amende structure pour chaque infraction (v7.4.5)
function amendeObj(classe) {
  if (classe === "5e classe") {
    return {
      amende_forfaitaire: SANCTIONS.classe_5.amende_max,
      amende_minoree: null,
      amende_majoree: null,
      amende_max: SANCTIONS.classe_5.amende_max,
      amende_recidive: SANCTIONS.classe_5.amende_recidive,
      classe: "5e classe",
      texte: SANCTIONS.classe_5.amende_max + " EUR (max), " + SANCTIONS.classe_5.amende_recidive + " EUR en recidive"
    };
  }
  return {
    amende_forfaitaire: SANCTIONS.classe_4.amende_forfaitaire,
    amende_minoree: SANCTIONS.classe_4.amende_minoree,
    amende_majoree: SANCTIONS.classe_4.amende_majoree,
    amende_max: SANCTIONS.classe_4.amende_max,
    amende_recidive: null,
    classe: "4e classe",
    texte: SANCTIONS.classe_4.amende_forfaitaire + " EUR (forfaitaire), minoree " + SANCTIONS.classe_4.amende_minoree + " EUR, majoree " + SANCTIONS.classe_4.amende_majoree + " EUR, max " + SANCTIONS.classe_4.amende_max + " EUR"
  };
}

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
 * Calcule le dernier dimanche d\'un mois donne
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
    // Normalisation des types : accepter codes courts ET noms complets
    const typeRaw = parts[3].trim().toUpperCase();
    const NOMS_VERS_CODES = {
      'CONDUITE': 'C', 'CONDUCT': 'C', 'DRIVING': 'C',
      'AUTRE TACHE': 'T', 'AUTRE_TACHE': 'T', 'TRAVAIL': 'T', 'OTHER WORK': 'T', 'TACHE': 'T',
      'DISPONIBILITE': 'D', 'DISPONIBLE': 'D', 'DISPO': 'D', 'AVAILABILITY': 'D',
      'PAUSE': 'P', 'REPOS': 'P', 'PAUSE / REPOS': 'P', 'PAUSE/REPOS': 'P', 'REST': 'P', 'BREAK': 'P', 'PAUSE REPOS': 'P',
      'FERRY': 'F', 'TRAVERSEE': 'F',
      'HORS CHAMP': 'O', 'OUT OF SCOPE': 'O',
      'C': 'C', 'T': 'T', 'D': 'D', 'P': 'P', 'R': 'R', 'O': 'O', 'F': 'F'
    };
    const typeCode = NOMS_VERS_CODES[typeRaw] || typeRaw;

  // Validation du type
  const typesValides = { C: 'conduite', T: 'autre_tache', D: 'disponibilite', P: 'pause', R: 'repos', O: 'hors_champ', F: 'ferry' };
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
 * Analyse complete d\'un CSV
 */


// ============================================================
// ANALYSE MULTI-SEMAINES v7.0.0
// Sources :
//   CE 561/2006 Art.4§g, Art.7, Art.8§4, Art.8§6, Art.8§6bis, Art.8§8, Art.8§8bis, Art.12
//   Reglement 2020/1054 (modifications repos hebdo, retour domicile, Art.12)
//   Reglement 2024/1258 (pause 2x15 occasionnel, derogation 12j voyageurs)
//   Decret 2010-855 et Decret 2020-1088 (sanctions repos hebdo)
//   https://www.domformateur.com/pages/tronc-commun/durees-de-conduite-temps-de-pause-et-temps-de-repos.html
// ============================================================
function analyseMultiSemaines(detailsJours, joursMap, joursTries, typeService, equipage, infractions, avertissements) {
  // v7.6.0 : Selection des regles par type de service
  const R_MULTI = getRegles(typeService);
  const RC_MULTI = REGLES_COMMUN;
  const tracking = {
    repos_reduits_journaliers: { compteur: 0, max: R_MULTI.REPOS_REDUIT_MAX_ENTRE_HEBDO, details: [] },
    repos_hebdomadaires: [],
    dette_compensation: { total_h: 0, details: [] },
    repos_journaliers_fractionnes: [],
    conduite_nuit_21h_6h: [],
    derogations: {
      art12_depassement_exceptionnel: [],
      art8_6bis_12_jours: null,
      art8_6_2_reduits_consecutifs: false,
      pause_2x15_occasionnel: false
    },
    rappels: []
  };

  // --- A) REPOS JOURNALIER FRACTIONNE 3h+9h (Art.4§g) ---
  // Detecte si dans une periode de 24h, le conducteur a pris 2 blocs de repos
  // dont le premier >= 3h et le second >= 9h (total >= 12h)
  // Dans ce cas, c'est un repos journalier NORMAL valide (pas reduit)
  joursTries.forEach(dateJour => {
    const activitesJour = joursMap[dateJour] || [];
    const blocsRepos = [];
    activitesJour.forEach(a => {
      if ((a.type === 'pause' || a.type === 'repos') && a.duree_min >= 60) {
        blocsRepos.push({ debut: a.heure_debut, fin: a.heure_fin, duree_h: a.duree_min / 60 });
      }
    });
    if (blocsRepos.length >= 2) {
      // Trier par heure de debut
      blocsRepos.sort((a, b) => a.debut.localeCompare(b.debut));
      for (let i = 0; i < blocsRepos.length - 1; i++) {
        const part1 = blocsRepos[i];
        const part2 = blocsRepos[i + 1];
        if (part1.duree_h >= RC_MULTI.REPOS_JOURNALIER_FRACTIONNE_PART1_MIN_H &&
            part2.duree_h >= RC_MULTI.REPOS_JOURNALIER_FRACTIONNE_PART2_MIN_H) {
          tracking.repos_journaliers_fractionnes.push({
            date: dateJour,
            partie1_h: parseFloat(part1.duree_h.toFixed(1)),
            partie2_h: parseFloat(part2.duree_h.toFixed(1)),
            total_h: parseFloat((part1.duree_h + part2.duree_h).toFixed(1)),
            statut: 'valide',
            source: 'CE 561/2006 Art.4 par.g'
          });
          // Corriger: ce jour ne doit PAS etre compte comme repos reduit
          // On cherche l'avertissement correspondant et on le supprime
          const idxWarn = avertissements.findIndex(w =>
            w.regle && w.regle.includes('Repos journalier en mode reduit') &&
            detailsJours.find(d => d.date === dateJour && d.avertissements.includes(w))
          );
          if (idxWarn >= 0) {
            avertissements.splice(idxWarn, 1);
            // Aussi retirer du detail du jour
            const dj = detailsJours.find(d => d.date === dateJour);
            if (dj) {
              dj.avertissements = dj.avertissements.filter(w =>
                !w.regle || !w.regle.includes('Repos journalier en mode reduit'));
            }
          }
          break; // Un seul fractionne par jour
        }
      }
    }
  });

  // --- B) COMPTEUR REPOS JOURNALIERS REDUITS (Art.8§4) ---
  // Max 3 repos reduits entre 2 repos hebdomadaires
  let compteurReduits = 0;
  let dernierReposHebdo = null;
  const datesAvecReposReduit = [];

  joursTries.forEach(dateJour => {
    const dj = detailsJours.find(d => d.date === dateJour);
    if (!dj) return;
    const reposH = parseFloat(dj.repos_estime_h);
    if (isNaN(reposH)) return;

    // Est-ce un repos fractionne valide ? (ne compte pas comme reduit)
    const estFractionneValide = tracking.repos_journaliers_fractionnes.some(f => f.date === dateJour);

    // Detecter repos hebdomadaire (>= 24h de repos estimees sur la journee)
    // En realite, un repos hebdo s'etend sur plusieurs jours consecutifs sans activite
    // Approximation : si repos_estime >= 24h OU si pas d'activite de conduite/travail
    const conduiteJour = dj.conduite_min || 0;
    const travailJour = dj.travail_min || 0;
    const estJourReposHebdo = (conduiteJour === 0 && travailJour === 0);

    if (estJourReposHebdo) {
      // Reset compteur repos reduits
      if (compteurReduits > R_MULTI.REPOS_REDUIT_MAX_ENTRE_HEBDO) {
        infractions.push({
          regle: 'Trop de repos journaliers reduits (CE 561/2006 Art.8 par.4)',
          limite: R_MULTI.REPOS_REDUIT_MAX_ENTRE_HEBDO + ' repos reduits max entre 2 repos hebdomadaires',
          constate: compteurReduits + ' repos reduits detectes',
          depassement: (compteurReduits - R_MULTI.REPOS_REDUIT_MAX_ENTRE_HEBDO) + ' de trop',
          classe: '4e classe',
          amende: amendeObj('4e classe'),
          dates_concernees: [...datesAvecReposReduit]
        });
      }
      compteurReduits = 0;
      datesAvecReposReduit.length = 0;
      dernierReposHebdo = dateJour;
      return;
    }

    // Repos journalier reduit : entre 9h et 11h
    if (reposH >= R_MULTI.REPOS_JOURNALIER_REDUIT_H && reposH < R_MULTI.REPOS_JOURNALIER_NORMAL_H && !estFractionneValide) {
      compteurReduits++;
      datesAvecReposReduit.push(dateJour);
      tracking.repos_reduits_journaliers.details.push({
        date: dateJour,
        duree_h: reposH,
        numero: compteurReduits
      });
    }
  });
  // Verifier le dernier segment aussi
  if (compteurReduits > R_MULTI.REPOS_REDUIT_MAX_ENTRE_HEBDO) {
    infractions.push({
      regle: 'Trop de repos journaliers reduits (CE 561/2006 Art.8 par.4)',
      limite: R_MULTI.REPOS_REDUIT_MAX_ENTRE_HEBDO + ' repos reduits max entre 2 repos hebdomadaires',
      constate: compteurReduits + ' repos reduits detectes',
      depassement: (compteurReduits - R_MULTI.REPOS_REDUIT_MAX_ENTRE_HEBDO) + ' de trop',
      classe: '4e classe',
      amende: amendeObj('4e classe'),
      dates_concernees: [...datesAvecReposReduit]
    });
  }
  tracking.repos_reduits_journaliers.compteur = compteurReduits;

  // --- C) REPOS HEBDOMADAIRES : REGLE DES 2 SEMAINES + DETTE (Art.8§6) ---
  // Dans toute periode de 2 semaines consecutives, au moins 2 repos hebdo
  // dont au moins 1 normal (>= 45h)
  // Repos reduit : compensation dans les 3 semaines suivantes
  // Exception transport international marchandises : 2 reduits consecutifs possibles
  // --- v7.20.3 FIX-08 : Repos hebdo = residuel veille + jours R + residuel lendemain ---
  // Le repos hebdomadaire commence a la fin du dernier service avant le repos
  // et finit au debut du premier service apres le repos.
  // Exemple : fin 31/12 a 14:45 + R 01/01 24h + debut 02/01 a 06:00 = 39.25h
  const reposHebdoDetectes = [];
  let joursConsecutifsSansRepos = 0;
  const joursReposConsommes = new Set();

  // Helper : trouver la fin de derniere activite d'un jour (en heures depuis 00:00)
  function finDerniereActivite(dateStr) {
    const dj = detailsJours.find(d => d.date === dateStr);
    if (!dj) return 24;
    const acts = (joursMap[dateStr] || []).filter(a => a.type_normalise !== 'repos' && a.type_normalise !== 'pause');
    if (acts.length === 0) return 0; // jour sans activite de travail/conduite
    let maxFin = 0;
    acts.forEach(a => {
      const parts = a.heure_fin.split(':');
      const finH = parseInt(parts[0]) + parseInt(parts[1]) / 60;
      if (finH > maxFin) maxFin = finH;
    });
    return maxFin;
  }

  // Helper : trouver le debut de premiere activite d'un jour (en heures depuis 00:00)
  function debutPremiereActivite(dateStr) {
    const acts = (joursMap[dateStr] || []).filter(a => a.type_normalise !== 'repos' && a.type_normalise !== 'pause');
    if (acts.length === 0) return 24; // jour sans activite
    let minDeb = 24;
    acts.forEach(a => {
      const parts = a.heure_debut.split(':');
      const debH = parseInt(parts[0]) + parseInt(parts[1]) / 60;
      if (debH < minDeb) minDeb = debH;
    });
    return minDeb;
  }

  joursTries.forEach((dateJour, idx) => {
    if (joursReposConsommes.has(dateJour)) return;

    const dj = detailsJours.find(d => d.date === dateJour);
    if (!dj) return;
    const conduiteJour = dj.conduite_min || 0;
    const travailJour = dj.travail_min || 0;
    const estJourTravail = (conduiteJour > 0 || travailJour > 0);

    if (estJourTravail) {
      joursConsecutifsSansRepos++;
    } else {
      joursReposConsommes.add(dateJour);
      let joursInclusDansBloc = 1;

      // Cumuler les jours suivants sans travail
      let dernierJourRepos = dateJour;
      for (let j = idx + 1; j < joursTries.length; j++) {
        const dateNext = joursTries[j];
        const djNext = detailsJours.find(d => d.date === dateNext);
        if (!djNext) break;
        const cNext = djNext.conduite_min || 0;
        const tNext = djNext.travail_min || 0;
        if (cNext === 0 && tNext === 0) {
          joursReposConsommes.add(dateNext);
          joursInclusDansBloc++;
          dernierJourRepos = dateNext;
        } else {
          break;
        }
      }

      // Calculer le repos REEL :
      // = repos residuel du jour precedent (24h - fin derniere activite)
      // + 24h * nombre de jours R complets
      // + repos residuel du jour suivant (debut premiere activite)
      let reposResiduelAvant = 0;
      if (idx > 0) {
        const jourAvant = joursTries[idx - 1];
        const djAvant = detailsJours.find(d => d.date === jourAvant);
        if (djAvant && (djAvant.conduite_min > 0 || djAvant.travail_min > 0)) {
          const finH = finDerniereActivite(jourAvant);
          reposResiduelAvant = 24 - finH; // heures de repos entre fin service et minuit
        }
      }

      let reposResiduelApres = 0;
      // Trouver le premier jour travaille APRES le bloc de repos
      const idxDernierRepos = joursTries.indexOf(dernierJourRepos);
      if (idxDernierRepos >= 0 && idxDernierRepos + 1 < joursTries.length) {
        const jourApres = joursTries[idxDernierRepos + 1];
        const djApres = detailsJours.find(d => d.date === jourApres);
        if (djApres && (djApres.conduite_min > 0 || djApres.travail_min > 0)) {
          reposResiduelApres = debutPremiereActivite(jourApres); // heures entre minuit et debut service
        }
      }

      const dureeReposTotal = reposResiduelAvant + (joursInclusDansBloc * 24) + reposResiduelApres;

      const typeRepos = dureeReposTotal >= R_MULTI.REPOS_HEBDO_NORMAL_H ? 'normal' :
                        dureeReposTotal >= R_MULTI.REPOS_HEBDO_REDUIT_H ? 'reduit' : 'insuffisant';

      const entry = {
        date_debut: dateJour,
        duree_h: parseFloat(dureeReposTotal.toFixed(1)),
        type: typeRepos,
        jours_travail_avant: joursConsecutifsSansRepos,
        jours_repos_bloc: joursInclusDansBloc,
        repos_avant_h: parseFloat(reposResiduelAvant.toFixed(1)),
        repos_apres_h: parseFloat(reposResiduelApres.toFixed(1))
      };

      if (typeRepos === 'reduit') {
        const dette = R_MULTI.REPOS_HEBDO_NORMAL_H - dureeReposTotal;
        entry.dette_h = parseFloat(dette.toFixed(1));
        entry.echeance_compensation = 'avant fin semaine +' + REGLES.COMPENSATION_ECHEANCE_SEMAINES;
        entry.statut_compensation = 'en_cours';
        tracking.dette_compensation.total_h += dette;
        tracking.dette_compensation.details.push({
          date_repos: dateJour,
          dette_h: parseFloat(dette.toFixed(1)),
          echeance: entry.echeance_compensation,
          statut: 'en_cours'
        });
        avertissements.push({
          regle: 'Dette compensation repos hebdomadaire (Art.8 par.6)',
          message: 'Repos hebdo reduit de ' + dureeReposTotal.toFixed(1) + 'h le ' + dateJour + '. Dette: ' + dette.toFixed(1) + 'h a compenser en bloc (rattache a un repos >= 9h) avant la fin de la 3e semaine suivante.'
        });
      }

      if (typeRepos === 'insuffisant' && joursConsecutifsSansRepos >= 6) {
        infractions.push({
          regle: 'Repos hebdomadaire insuffisant (CE 561/2006 Art.8 par.6)',
          limite: R_MULTI.REPOS_HEBDO_REDUIT_H + 'h minimum (reduit)',
          constate: dureeReposTotal.toFixed(1) + 'h apres ' + joursConsecutifsSansRepos + ' jours de travail',
          depassement: 'Manque ' + (R_MULTI.REPOS_HEBDO_REDUIT_H - dureeReposTotal).toFixed(1) + 'h',
          classe: '5e classe',
          amende: amendeObj('5e classe'),
          ref_legale: 'CE 561/2006 Art.8 par.6',
          url_legale: 'https://eur-lex.europa.eu/legal-content/FR/TXT/HTML/?uri=CELEX:32006R0561#d1e1007-1-1'
        });
      }

      reposHebdoDetectes.push(entry);
      joursConsecutifsSansRepos = 0;
    }
  });

  tracking.repos_hebdomadaires = reposHebdoDetectes;

  // Verifier la regle des 2 semaines : au moins 1 repos normal sur 2 consecutives
  if (reposHebdoDetectes.length >= 2) {
    for (let i = 0; i < reposHebdoDetectes.length - 1; i++) {
      const r1 = reposHebdoDetectes[i];
      const r2 = reposHebdoDetectes[i + 1];
      if (r1.type === 'reduit' && r2.type === 'reduit') {
        // 2 repos reduits consecutifs
        if (typeService === 'MARCHANDISES') {
          // Autorise en transport international de marchandises (2020/1054)
          // A condition : 4 repos sur 4 semaines dont 2 normaux
          tracking.derogations.art8_6_2_reduits_consecutifs = true;
          avertissements.push({
            regle: 'Deux repos hebdo reduits consecutifs (Art.8 par.6 - 2020/1054)',
            message: '2 repos reduits consecutifs detectes. Autorise en transport international de marchandises a condition de prendre au moins 4 repos hebdo sur 4 semaines dont 2 normaux (>= 45h). Verifiez que les repos reduits sont pris hors Etat d\'etablissement.'
          });
        } else {
          infractions.push({
            regle: 'Deux repos hebdo reduits consecutifs interdits (CE 561/2006 Art.8 par.6)',
            limite: '1 repos normal minimum sur 2 semaines consecutives',
            constate: 'Repos reduit ' + r1.duree_h + 'h (' + r1.date_debut + ') suivi de repos reduit ' + r2.duree_h + 'h (' + r2.date_debut + ')',
            depassement: 'N/A',
            classe: '4e classe',
            amende: amendeObj('4e classe')
          });
        }
      }
    }
  }

  // --- D) CONDUITE DE NUIT CONTINUE 4h MAX (21h-6h) ---
  joursTries.forEach(dateJour => {
    const activitesJour = joursMap[dateJour] || [];
    let conduiteNuitContinue = 0;
    let maxConduiteNuit = 0;

    activitesJour.forEach(a => {
      if (a.type !== 'conduite') {
        if (a.type === 'pause' && a.duree_min >= 30) conduiteNuitContinue = 0;
        return;
      }
      const hDebut = parseInt(a.heure_debut.split(':')[0]);
      const mDebut = parseInt(a.heure_debut.split(':')[1]);
      const hFin = parseInt(a.heure_fin.split(':')[0]);
      const mFin = parseInt(a.heure_fin.split(':')[1]);

      // Calculer combien de minutes de cette conduite tombent dans 21h-6h
      let minutesDansNuit = 0;
      const debutMin = hDebut * 60 + mDebut;
      let finMin = hFin * 60 + mFin;
      if (finMin <= debutMin) finMin += 24 * 60; // traverse minuit

      // Fenetre nuit : 21*60=1260 a 30*60=1800 (6h du lendemain = 1260+540=1800)
      const nuitDebut = 21 * 60;
      const nuitFin = 30 * 60; // 6h le lendemain

      // Aussi 0-6h = 0 a 360
      const nuit2Debut = 0;
      const nuit2Fin = 6 * 60;

      // Intersection avec 21h-30h (minuit+6h)
      const overlapStart1 = Math.max(debutMin, nuitDebut);
      const overlapEnd1 = Math.min(finMin, nuitFin);
      if (overlapEnd1 > overlapStart1) minutesDansNuit += overlapEnd1 - overlapStart1;

      // Intersection avec 0h-6h
      const overlapStart2 = Math.max(debutMin, nuit2Debut);
      const overlapEnd2 = Math.min(finMin, nuit2Fin);
      if (overlapEnd2 > overlapStart2) minutesDansNuit += overlapEnd2 - overlapStart2;

      if (minutesDansNuit > 0) {
        conduiteNuitContinue += minutesDansNuit;
        if (conduiteNuitContinue > maxConduiteNuit) maxConduiteNuit = conduiteNuitContinue;
      }
    });

    tracking.conduite_nuit_21h_6h.push({
      date: dateJour,
      duree_continue_max_min: maxConduiteNuit,
      limite_min: REGLES.CONDUITE_NUIT_CONTINUE_MAX_MIN
    });

    if (maxConduiteNuit > REGLES.CONDUITE_NUIT_CONTINUE_MAX_MIN) {
      avertissements.push({
        regle: 'Conduite continue de nuit > 4h (21h-6h) (RSE pratique)',
        message: 'Conduite continue de ' + maxConduiteNuit + ' min dans la fenetre 21h-6h le ' + dateJour + '. Limite recommandee: ' + REGLES.CONDUITE_NUIT_CONTINUE_MAX_MIN + ' min (4h). Cette regle est une pratique RSE, pas une infraction codifiee dans le decret 2010-855.'
      });
    }
  });

  // --- E) DEROGATION 12 JOURS TRANSPORT OCCASIONNEL VOYAGEURS (Art.8§6bis) ---
  if (typeService === 'OCCASIONNEL' && joursTries.length > 6) {
    // Le conducteur peut reporter son repos hebdo jusqu a 12 periodes de 24h
    // Conditions : service dans un autre Etat, conduite nuit solo max 3h
    if (joursConsecutifsSansRepos > 6 && joursConsecutifsSansRepos <= REGLES.DEROG_12_JOURS_MAX_PERIODES) {
      tracking.derogations.art8_6bis_12_jours = {
        jours_consecutifs: joursConsecutifsSansRepos,
        max_autorise: REGLES.DEROG_12_JOURS_MAX_PERIODES,
        conditions: [
          'Service dans un Etat membre different de celui de depart',
          'Conduite nuit solo (22h-6h) max 3h sans pause',
          'A l\'arrivee : 2 repos normaux OU 1 normal + 1 reduit (avec compensation)'
        ]
      };
      avertissements.push({
        regle: 'Derogation 12 jours transport occasionnel (Art.8 par.6bis - 2024/1258)',
        message: joursConsecutifsSansRepos + ' jours consecutifs sans repos hebdomadaire. Autorise jusqu\'a 12 jours en transport occasionnel de voyageurs sous conditions strictes. Verifiez : (1) service dans un autre Etat, (2) conduite nuit solo max 3h, (3) a l\'arrivee 2 repos normaux ou 1 normal + 1 reduit avec compensation.'
      });
    }
  }

  // --- F) PAUSE FRACTIONNEE 2x15 MIN OCCASIONNEL (Art.7 - 2024/1258) ---
  if (typeService === 'OCCASIONNEL') {
    tracking.derogations.pause_2x15_occasionnel = true;
    // Note informative : en transport occasionnel, la pause de 45 min
    // peut etre fractionnee en 2 pauses de 15 min minimum chacune
    // (au lieu du schema classique 15+30)
    tracking.rappels.push(
      'Transport occasionnel : la pause de 45 min peut etre fractionnee en 2x15 min minimum (Art.7 - Reglement 2024/1258)'
    );
  }

  // --- G) RAPPELS REGLEMENTAIRES ---
  // Repos >= 45h interdit dans le vehicule (Art.8§8 - 2020/1054)
  if (reposHebdoDetectes.some(r => r.type === 'normal')) {
    tracking.rappels.push(
      'RAPPEL : Le repos hebdomadaire normal (>= 45h) est interdit a bord du vehicule depuis le 20/08/2020 (Art.8 par.8). L\'employeur doit fournir un hebergement adapte.'
    );
  }

  // Retour domicile 4 semaines (Art.8§8bis - 2020/1054)
  if (joursTries.length >= 28) {
    tracking.rappels.push(
      'RAPPEL : L\'entreprise doit organiser le retour du conducteur a son domicile ou centre operationnel pour un repos hebdomadaire normal dans chaque periode de ' + REGLES.RETOUR_DOMICILE_MAX_SEMAINES + ' semaines consecutives (Art.8 par.8bis - 2020/1054).'
    );
  }

  // Repos hebdo retard > 6 jours (Decret 2020-1088)
  const seuilReposHebdo1006 = (typeService === 'SLO' || typeService === 'OCCASIONNEL') ? 12 : 6;
  if (joursConsecutifsSansRepos > seuilReposHebdo1006) {
    const retardH = (joursConsecutifsSansRepos - seuilReposHebdo1006) * 24;
    const classeRetard = retardH >= REGLES.REPOS_HEBDO_RETARD_SEUIL_4E_CLASSE_H ? '5e classe' : '4e classe';
    // Deja gere par le code existant (repos hebdo), mais on enrichit le tracking
    tracking.rappels.push(
      'Retard repos hebdomadaire : ' + joursConsecutifsSansRepos + ' jours sans repos hebdo. Decret 2020-1088 : retard < 12h = 4e classe (135 EUR), retard >= 12h = 5e classe (1500 EUR).'
    );
  }

  // --- H) DEPASSEMENT EXCEPTIONNEL ART.12 ---
  // Detecte les depassements de conduite journaliere/hebdo de 1h ou 2h
  // et les qualifie comme potentiellement exceptionnels au lieu d'infraction directe
  // Note: le code existant traite deja les depassements comme infractions
  // On ajoute un tracking pour les depassements <= 2h
  detailsJours.forEach(dj => {
    if (dj.conduite_min > REGLES.CONDUITE_JOURNALIERE_DEROGATOIRE_MAX_MIN &&
        dj.conduite_min <= REGLES.CONDUITE_JOURNALIERE_DEROGATOIRE_MAX_MIN + REGLES.DEPASSEMENT_EXCEPTIONNEL_2H_MIN) {
      const depassement = dj.conduite_min - REGLES.CONDUITE_JOURNALIERE_DEROGATOIRE_MAX_MIN;
      tracking.derogations.art12_depassement_exceptionnel.push({
        date: dj.date,
        depassement_min: depassement,
        type: depassement <= REGLES.DEPASSEMENT_EXCEPTIONNEL_1H_MIN ? '1h' : '2h',
        conditions: depassement <= REGLES.DEPASSEMENT_EXCEPTIONNEL_1H_MIN
          ? ['Repos hebdomadaire (normal ou reduit) a prendre ensuite', 'Motif exceptionnel a documenter']
          : ['Pause 30 min avant le depassement supplementaire', 'Repos hebdomadaire NORMAL (45h) obligatoire ensuite', 'Motif exceptionnel a documenter'],
        compensation: 'Repos equivalent a prendre en bloc avant fin semaine +3',
        source: 'CE 561/2006 Art.12 modifie par 2020/1054'
      });
    }
  });

  return tracking;
}

function analyserCSV(csvTexte, typeService, codePays, equipage) {
  // v7.6.0 : Selection des regles par type de service
  const R = getRegles(typeService);
  const RC = REGLES_COMMUN;
  equipage = equipage || 'solo';
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
  joursTries.forEach((dateJour, idxJour) => {
    // Tri intelligent : detecte si le service traverse minuit
    // Si activites avant ET apres 12h sur le meme jour = service de nuit
    // Dans ce cas, les heures >= 12h passent en premier (debut de service)
    const activitesJourBrut = joursMap[dateJour];
    // Detection service de nuit : une activite traverse minuit (heure_fin <= heure_debut en string)
    // Ex: 20:30 -> 00:30 a heure_fin "00:30" < heure_debut "20:30"
    // Cela ne se declenche PAS pour un jour normal (04:30->19:00) car heure_fin > heure_debut
    // Source: CE 561/2006 Art.8 - repos journalier dans les 24h suivant le debut de service
    // Detection service de nuit v7.20 :
    // Cas 1: une activite traverse minuit (heure_fin < heure_debut en string)
    // Cas 2: activites APRES 20h ET activites AVANT 8h sur le meme jour (ex: 21:00->24:00 + 00:00->07:30)
    const aActiviteApres20h = activitesJourBrut.some(a => parseInt(a.heure_debut.split(':')[0]) >= 20);
    const aActiviteAvant8h = activitesJourBrut.some(a => parseInt(a.heure_debut.split(':')[0]) < 8 && a.heure_debut !== '00:00' || (a.heure_debut === '00:00' && a.heure_fin !== '24:00'));
    const traverseMinuit = activitesJourBrut.some(a => a.heure_fin.localeCompare(a.heure_debut) < 0);
    const estServiceNuit = traverseMinuit || (aActiviteApres20h && aActiviteAvant8h);

    const activitesJour = activitesJourBrut.sort((a, b) => {
      if (estServiceNuit) {
        // Service de nuit : les heures >= 12h viennent en premier
        const hA = parseInt(a.heure_debut.split(':')[0]);
        const hB = parseInt(b.heure_debut.split(':')[0]);
        const aEstAprem = hA >= 12 ? 0 : 1;
        const bEstAprem = hB >= 12 ? 0 : 1;
        if (aEstAprem !== bEstAprem) return aEstAprem - bEstAprem;
      }
      return a.heure_debut.localeCompare(b.heure_debut);
    });

    let conduiteJour = 0;
    let travailJour = 0;
    let pauseJour = 0;
    let dispoJour = 0;
    let conduiteContinue = 0;
    let maxConduiteContinue = 0;
    // v7.5.0 : Accumulateur pause fractionnee (CE 561/2006 Art.7)
    // Regle: 45min bloc OU 15min puis 30min (ordre obligatoire)
    // Source: eur-lex.europa.eu/legal-content/EN/TXT/PDF/?uri=CELEX:02006R0561-20200820
    let pausePhase1Done = false;
    let conduiteAvantPhase1 = 0;
    let travailNuitMin = 0;
    let ferryJour = 0;
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
          // v7.5.0 : Gestion pause fractionnee CE 561/2006 Art.7
          if (a.duree_min >= 45) {
            // Cas 1 : Pause complete >= 45min = reset immediat
            conduiteContinue = 0;
            pausePhase1Done = false;
            conduiteAvantPhase1 = 0;
          } else if (a.duree_min >= 30 && pausePhase1Done) {
            // Cas 2 : Phase 2 du split (30min apres 15min) = reset
            conduiteContinue = 0;
            pausePhase1Done = false;
            conduiteAvantPhase1 = 0;
          } else if (a.duree_min >= 15 && !pausePhase1Done) {
            // Cas 3 : Phase 1 du split (15min) = marquer
            pausePhase1Done = true;
            conduiteAvantPhase1 = conduiteContinue;
          }
          // Cas 4 : Pause < 15min = aucun effet
          break;
        case 'repos':
          pauseJour += a.duree_min;
          // v7.5.0 : Pause fractionnee repos
          if (a.duree_min >= 45) {
            conduiteContinue = 0;
            pausePhase1Done = false;
            conduiteAvantPhase1 = 0;
          } else if (a.duree_min >= 30 && pausePhase1Done) {
            conduiteContinue = 0;
            pausePhase1Done = false;
            conduiteAvantPhase1 = 0;
          } else if (a.duree_min >= 15 && !pausePhase1Done) {
            pausePhase1Done = true;
            conduiteAvantPhase1 = conduiteContinue;
          }
          break;
        case 'hors_champ':
          // OUT - Art.9 par.3 CE 561/2006
          // Temps hors champ d'application : ne compte ni en conduite,
          // ni en travail effectif, ni en repos. Suspend le calcul.
          // Note: conduire un vehicule hors scope pour rejoindre un vehicule
          // soumis au CE 561 = 'autre tache' (Art.9 par.3)
          dispoJour += a.duree_min; // Comptabilise comme dispo pour le suivi
          break;
        case 'ferry':
          // FERRY/TRAIN - Art.9 par.1 CE 561/2006 (version 2020/1054)
          // Le repos peut etre interrompu max 2 fois, total max 1h
          // Conditions: acces couchette/cabine
          // Pour repos hebdo: ferry programme >= 8h + acces couchette
          // Le temps ferry avec couchette = repos (pas travail/dispo)
          pauseJour += a.duree_min;
          ferryJour += a.duree_min;
          if (a.duree_min >= 45) {
            conduiteContinue = 0;
            pausePhase1Done = false;
            conduiteAvantPhase1 = 0;
          } else if (a.duree_min >= 30 && pausePhase1Done) {
            conduiteContinue = 0;
            pausePhase1Done = false;
            conduiteAvantPhase1 = 0;
          } else if (a.duree_min >= 15 && !pausePhase1Done) {
            pausePhase1Done = true;
            conduiteAvantPhase1 = conduiteContinue;
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

    // Amplitude journaliere - v7.20 FIX service de nuit
    if (activitesJour.length >= 2) {
      const premiere = activitesJour[0];
      const derniere = activitesJour[activitesJour.length - 1];
      let debutMin = parseInt(premiere.heure_debut.split(":")[0]) * 60 + parseInt(premiere.heure_debut.split(":")[1]);
      let finMin = parseInt(derniere.heure_fin.split(":")[0]) * 60 + parseInt(derniere.heure_fin.split(":")[1]);
      // Pour service de nuit: calculer amplitude reelle entre premiere et derniere activite
      // en tenant compte que les activites >=12h sont triees avant les <12h
      let amplitudeMin;
      if (estServiceNuit) {
        // En mode nuit, debutMin est >= 12h (ex: 21:00=1260) et finMin est <12h (ex: 08:00=480)
        // Amplitude reelle = (1440 - debutMin) + finMin
        if (debutMin > finMin) {
          amplitudeMin = (1440 - debutMin) + finMin;
        } else {
          amplitudeMin = finMin - debutMin;
        }
      } else {
        amplitudeMin = finMin - debutMin;
        if (amplitudeMin < 0) amplitudeMin += 1440;
      }
      const amplitudeH = amplitudeMin / 60;
      const amplitudeMax = R.AMPLITUDE_DEROGATOIRE_MAX_H; // Derog max: REGULIER=13h(R3312-28), SLO/OCCASIONNEL=14h(R3312-11) // v7.6.0: utilise R
      if (amplitudeH > amplitudeMax) {
        const depassement = (amplitudeH - amplitudeMax).toFixed(1);
        infractionsJour.push({
          regle: "Amplitude journalière (" + (R.EXEMPTION_CE_561 ? "Décret 2006-925 art.6 + R3312-28" : "C. transports R3312-9 / R3312-11") + ")",
          limite: amplitudeMax + "h",
          constate: amplitudeH.toFixed(1) + "h",
          depassement: depassement + "h",
          classe: "4e classe",
          amende: amendeObj("4e classe")
        });
        amendeEstimee += SANCTIONS.classe_4.amende_forfaitaire;
      }

      // === CHECK COUPURES SLO (Code des transports R3312-11) ===
      // Source: https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000043651232
      if (typeService === 'SLO' && amplitudeH > 12) {
        const coupuresSLO = activitesJour.filter(a => (a.type === 'pause' || a.type === 'repos') && a.duree_min >= 90);
        const coupuresLongues = activitesJour.filter(a => (a.type === 'pause' || a.type === 'repos') && a.duree_min >= 120);
        if (amplitudeH > 13) {
          const aCoupure3h = activitesJour.some(a => (a.type === 'pause' || a.type === 'repos') && a.duree_min >= 180);
          const a2x2h = coupuresLongues.length >= 2;
          if (!aCoupure3h && !a2x2h) {
            infractionsJour.push({
              regle: 'Amplitude SLO > 13h sans coupure suffisante (R3312-11 al.2b)',
              limite: 'Coupure 3h continues ou 2x2h obligatoire',
              constate: 'Amplitude ' + amplitudeH.toFixed(1) + 'h, coupure insuffisante',
              depassement: 'Coupure manquante',
              classe: '4e classe',
              amende: amendeObj('4e classe')
            });
            amendeEstimee += SANCTIONS.classe_4.amende_forfaitaire;
          }
        } else {
          const aCoupure2h30 = activitesJour.some(a => (a.type === 'pause' || a.type === 'repos') && a.duree_min >= 150);
          const a2x1h30 = coupuresSLO.length >= 2;
          if (!aCoupure2h30 && !a2x1h30) {
            avertissementsJour.push({
              regle: 'Amplitude SLO > 12h sans coupure suffisante (R3312-11 al.2a)',
              message: 'Amplitude ' + amplitudeH.toFixed(1) + 'h. En SLO, amplitude > 12h necessite coupure 2h30 continue ou 2x1h30. Source: R3312-11.'
            });
          }
        }
      }
    }

        // v7.6.0 : Conduite continue CE 561/2006 — NON applicable en REGULIER <=50km (exempt Art.3§1a)
    if (!R.EXEMPTION_CE_561) {
// Verification conduite continue (CE 561/2006 Art.7 + R3312-9)
    if (maxConduiteContinue > REGLES.CONDUITE_CONTINUE_MAX_MIN) {
      const depassement = maxConduiteContinue - REGLES.CONDUITE_CONTINUE_MAX_MIN;
      const classe = depassement > 90 ? "5e classe" : "4e classe";
      // [v7.4.5] ancien calcul amende string supprime
      infractionsJour.push({
        regle: "Conduite continue (CE 561/2006 Art.7 + R3312-9)",
        limite: "4h30 (" + REGLES.CONDUITE_CONTINUE_MAX_MIN + " min)",
        constate: maxConduiteContinue + " min",
        depassement: depassement + " min",
        classe: classe,
        amende: amendeObj(classe)
      });
      amendeEstimee += depassement > 90 ? SANCTIONS.classe_5.amende_max : SANCTIONS.classe_4.amende_forfaitaire;
    }
    } // fin garde CE 561 conduite continue

    // [PATCH UE 2024/1258] Art.7 al.3 - Pause fractionnee 15+15 pour service occasionnel
    // "For a driver engaged in an occasional passenger service, the break referred
    //  to in the first paragraph may also be replaced by two breaks, of at least
    //  15 minutes each" - CE 561/2006 Art.7 al.3 (consolide 31/12/2024)
    // Ref: https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:02006R0561-20241231
    if (typeService === 'SLO' || typeService === 'OCCASIONNEL') {
      // Collecter toutes les pauses de la journee
      const pausesJour = activitesJour.filter(a => a.type === 'pause');
      const pausesDurees = pausesJour.map(a => a.duree_min);

      // Verifier si le pattern 15+15 (total >= 45) est respecte
      // Condition: au moins 2 pauses de >= 15min chacune, total >= 45min
      const pausesSup15 = pausesDurees.filter(d => d >= 15);
      const totalPausesSup15 = pausesSup15.reduce((s, d) => s + d, 0);
      const pause1515Valide = pausesSup15.length >= 2 && totalPausesSup15 >= 45;

      if (pause1515Valide) {
        // Retirer les infractions "Conduite continue" qui sont des faux positifs
        // car la pause 15+15 est legale en service occasionnel
        const nbAvant = infractionsJour.length;
        for (let idx = infractionsJour.length - 1; idx >= 0; idx--) {
          if (infractionsJour[idx].regle && infractionsJour[idx].regle.includes('Conduite continue')) {
            infractionsJour.splice(idx, 1);
          }
        }
        const nbRetires = nbAvant - infractionsJour.length;
        if (nbRetires > 0) {
          avertissementsJour.push({
            regle: 'Pause fractionnee 15+15 occasionnel (Art.7 al.3 - UE 2024/1258)',
            message: 'Pauses de ' + pausesSup15.join('+') + ' min = ' + totalPausesSup15 + ' min (>= 45min, chaque pause >= 15min). Conforme UE 2024/1258 Art.7 al.3.'
          });
        }
      }

      // [PATCH UE 2024/1258] Verification: en occasionnel, chaque pause fractionnee
      // doit faire AU MOINS 15 minutes. Une pause de 10min ne compte pas.
      if (pausesDurees.length >= 2 && !pause1515Valide) {
        const pausesTropCourtes = pausesDurees.filter(d => d > 0 && d < 15);
        if (pausesTropCourtes.length > 0 && totalPausesSup15 < 45) {
          infractionsJour.push({
            regle: 'Pause insuffisante - fractionnement occasionnel (Art.7 al.3 UE 2024/1258)',
            limite: '2 pauses >= 15min chacune, total >= 45min',
            constate: 'Pauses: ' + pausesDurees.join(', ') + ' min (pauses < 15min: ' + pausesTropCourtes.join(', ') + ' min)',
            depassement: 'Pause(s) < 15min non conforme',
            classe: '4e classe',
            amende: amendeObj('4e classe'),
            ref_legale: 'CE 561/2006 Art.7 al.3 (UE 2024/1258)',
            url_legale: 'https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:02006R0561-20241231'
          });
          amendeEstimee += SANCTIONS.classe_4.amende_forfaitaire;
        }
      }
    }


        // v7.6.0 : Conduite journaliere CE 561/2006 — NON applicable en REGULIER <=50km
    if (!R.EXEMPTION_CE_561) {
// Verification conduite journaliere (CE 561/2006 Art.6 + R3312-11)
    if (conduiteJour > REGLES.CONDUITE_JOURNALIERE_MAX_MIN) {
      const depassement = conduiteJour - REGLES.CONDUITE_JOURNALIERE_MAX_MIN;
      if (conduiteJour > REGLES.CONDUITE_JOURNALIERE_DEROGATOIRE_MAX_MIN) {
        const classe = depassement > 120 ? "5e classe" : "4e classe";
        // [v7.4.5] ancien calcul amende string supprime
        infractionsJour.push({
          regle: "Conduite journaliere (CE 561/2006 Art.6 + R3312-11)",
          limite: "9h (10h derogatoire, 2x/semaine)",
          constate: (conduiteJour / 60).toFixed(1) + "h (" + conduiteJour + " min)",
          depassement: depassement + " min",
          classe: classe,
          amende: amendeObj(classe)
        });
        amendeEstimee += depassement > 120 ? SANCTIONS.classe_5.amende_max : SANCTIONS.classe_4.amende_forfaitaire;
      } else {
        avertissementsJour.push({
          regle: "Conduite journaliere proche du maximum derogatoire",
          message: "Conduite de " + (conduiteJour / 60).toFixed(1) + "h - depasse 9h mais dans la limite derogatoire de 10h (2x/semaine max)"
        });
      }
    }

        } // fin garde CE 561 conduite journaliere

    // Verification travail de nuit (L3312-1)
    // Source: ecologie.gouv.fr/politiques-publiques/temps-travail-conducteurs-routiers-transport-marchandises
    // "La duree quotidienne du travail d un travailleur de nuit ou d un salarie
    //  qui accomplit sur une periode de 24h une partie de son travail dans
    //  l intervalle compris entre 24h et 5h ne peut exceder 10 heures"
    // => Ce n est PAS le temps en zone nuit qui est limite a 10h,
    //    c est le TRAVAIL TOTAL DE LA JOURNEE qui est limite a 10h
    //    des que le conducteur a travaille entre 0h et 5h.
    const aTravailleEntreMinuitEt5h = activitesJour.some(a => {
      if (a.type === "pause") return false;
      const h = parseInt(a.heure_debut.split(":")[0]);
      return h >= 0 && h < 5;
    });
    const travailTotalNuitJour = conduiteJour + travailJour;
    if (aTravailleEntreMinuitEt5h && travailTotalNuitJour > REGLES_COMMUN.TRAVAIL_NUIT_MAX_H * 60) {
      infractionsJour.push({
        regle: "Travail de nuit - duree totale journee (L3312-1)",
        limite: REGLES_COMMUN.TRAVAIL_NUIT_MAX_H + "h de travail total",
        constate: (travailTotalNuitJour / 60).toFixed(1) + "h",
        depassement: ((travailTotalNuitJour / 60) - REGLES_COMMUN.TRAVAIL_NUIT_MAX_H).toFixed(1) + "h",
        classe: "4e classe",
        amende: amendeObj("4e classe")
      });
      amendeEstimee += SANCTIONS.classe_4.amende_forfaitaire;
    }

    // Verification travail journalier total (conduite + autre tache)
    // Guard : ne pas doubler si infraction travail de nuit déjà comptée (même limite 10h)
    const dejaInfractionNuit = infractionsJour.some(inf => inf.regle && inf.regle.includes('nuit'));
    const travailTotalJour = conduiteJour + travailJour;
    if (!R.EXEMPTION_CE_561 && travailTotalJour > R.TRAVAIL_JOURNALIER_MAX_H * 60 && !dejaInfractionNuit) {
      infractionsJour.push({
        regle: "Durée maximale de travail journalier (Code du travail)",
        limite: R.TRAVAIL_JOURNALIER_MAX_H + "h",
        constate: (travailTotalJour / 60).toFixed(1) + "h",
        depassement: ((travailTotalJour / 60) - R.TRAVAIL_JOURNALIER_MAX_H).toFixed(1) + "h",
        classe: "4e classe",
        amende: amendeObj("4e classe")
      });
      amendeEstimee += SANCTIONS.classe_4.amende_forfaitaire;
    }

    
    // ============================================================
    // v7.6.0 — CHECKS SPECIFIQUES REGULIER <=50km
    // Decret 2006-925 + R3312-28 + R3312-11 + D3312-6
    // ============================================================
    if (R.EXEMPTION_CE_561) {
      // CHECK R1 : Amplitude <=11h (Decret 2006-925 art.6)
      // Note: le check amplitude general (ligne ~914) utilise deja amplitudeMax via typeService
      // Ici on ajoute un avertissement specifique si >11h et <=13h (derogation possible)
      if (typeof amplitudeH !== 'undefined' && amplitudeH > R.AMPLITUDE_MAX_H && amplitudeH <= R.AMPLITUDE_DEROGATOIRE_MAX_H) {
        avertissementsJour.push({
          regle: "Amplitude > " + R.AMPLITUDE_MAX_H + "h en service regulier (Decret 2006-925 art.6)",
          message: "Amplitude " + amplitudeH.toFixed(1) + "h. Derogation 13h possible si <5j/semaine et conditions justifiees. Verifier accord d entreprise."
        });
      }

      // CHECK R3 : Duree de travail quotidienne <=9h (R3312-11 §1)
      const travailTotalRegulier = conduiteJour + travailJour;
      const travailRegulierH = travailTotalRegulier / 60;
      if (travailRegulierH > R.TRAVAIL_JOURNALIER_DEROGATOIRE_MAX_H) {
        infractionsJour.push({
          regle: "Duree de travail quotidienne (R3312-11 + D3312-6)",
          limite: R.TRAVAIL_JOURNALIER_MAX_H + "h (derogatoire " + R.TRAVAIL_JOURNALIER_DEROGATOIRE_MAX_H + "h, 2x/semaine)",
          constate: travailRegulierH.toFixed(1) + "h",
          depassement: (travailRegulierH - R.TRAVAIL_JOURNALIER_DEROGATOIRE_MAX_H).toFixed(1) + "h",
          classe: "4e classe",
          amende: amendeObj("4e classe")
        });
        amendeEstimee += SANCTIONS.classe_4.amende_forfaitaire;
      } else if (travailRegulierH > R.TRAVAIL_JOURNALIER_MAX_H) {
        avertissementsJour.push({
          regle: "Travail quotidien > " + R.TRAVAIL_JOURNALIER_MAX_H + "h (R3312-11)",
          message: "Travail de " + travailRegulierH.toFixed(1) + "h. Depassement 9h admis jusqu a " + R.TRAVAIL_JOURNALIER_DEROGATOIRE_MAX_H + "h max 2x/semaine (D3312-6). Verifier le compteur hebdo."
        });
      }

      // CHECK R4 : Pause apres 6h de travail continu (Decret 2006-925 art.9)
      let travailContinu = 0;
      let maxTravailContinu = 0;
      activitesJour.forEach(function(act) {
        if (act.type === 'conduite' || act.type === 'autre_tache') {
          travailContinu += act.duree_min;
          if (travailContinu > maxTravailContinu) maxTravailContinu = travailContinu;
        } else if (act.type === 'pause' || act.type === 'repos') {
          if (act.duree_min >= R.PAUSE_MINIMALE_APRES_6H_MIN) {
            travailContinu = 0;
          }
        }
      });
      if (maxTravailContinu > R.PAUSE_APRES_TRAVAIL_CONTINU_MIN) {
        infractionsJour.push({
          regle: "Pause apres 6h de travail continu (Decret 2006-925 Art.9)",
          limite: "6h (" + R.PAUSE_APRES_TRAVAIL_CONTINU_MIN + " min) de travail continu, puis pause >= " + R.PAUSE_MINIMALE_APRES_6H_MIN + " min",
          constate: maxTravailContinu + " min de travail continu sans pause >= " + R.PAUSE_MINIMALE_APRES_6H_MIN + " min",
          depassement: (maxTravailContinu - R.PAUSE_APRES_TRAVAIL_CONTINU_MIN) + " min",
          classe: "4e classe",
          amende: amendeObj("4e classe")
        });
        amendeEstimee += SANCTIONS.classe_4.amende_forfaitaire;
      }

      // CHECK R5 : Pause repas 45 min entre 11h30-14h00 (Decret 2006-925 art.9)
      var aPauseRepas = false;
      activitesJour.forEach(function(act) {
        if (act.type === 'pause' || act.type === 'repos') {
          var debutH = parseInt(act.heure_debut.split(':')[0]) + parseInt(act.heure_debut.split(':')[1]) / 60;
          var finH = parseInt(act.heure_fin.split(':')[0]) + parseInt(act.heure_fin.split(':')[1]) / 60;
          // La pause chevauche la plage 11h30-14h et dure >= 45 min
          if (debutH < R.PAUSE_REPAS_FIN_H && finH >= R.PAUSE_REPAS_DEBUT_H && act.duree_min >= R.PAUSE_REPAS_MIN) {
            aPauseRepas = true;
          }
        }
      });
      // Verifier qu'il y a du travail effectif dans la plage repas
      var travailDansPlageRepas = false;
      activitesJour.forEach(function(act) {
        if (act.type === 'conduite' || act.type === 'travail') {
          var debutH = parseInt(act.heure_debut.split(':')[0]) + parseInt(act.heure_debut.split(':')[1]) / 60;
          var finH = parseInt(act.heure_fin.split(':')[0]) + parseInt(act.heure_fin.split(':')[1]) / 60;
          if (debutH < R.PAUSE_REPAS_FIN_H && finH > R.PAUSE_REPAS_DEBUT_H) {
            travailDansPlageRepas = true;
          }
        }
      });
      if (!aPauseRepas && travailDansPlageRepas) {
        avertissementsJour.push({
          regle: "Pause repas (Decret 2006-925 art.9)",
          message: "Aucune pause >= " + R.PAUSE_REPAS_MIN + " min detectee entre " + R.PAUSE_REPAS_DEBUT_H + "h et " + R.PAUSE_REPAS_FIN_H + "h. Droit a contrepartie selon accord."
        });
      }
    }

// Repos journalier — v7.21 FIX: calcul inter-journalier reel
    // CE 561/2006 Art.8: repos = periode consecutive sans conduite/travail/dispo
    // Sur tachygraphe, pause et repos = meme symbole. Distinction par duree et contexte:
    //   < 3h entre activites = pause (Art.7)
    //   >= 3h (part1) + >= 9h (part2) = repos fractionne (Art.4 par.g)
    //   >= 9h consecutives = repos reduit (Art.8 par.2)
    //   >= 11h consecutives = repos normal (Art.8 par.2)
    const estJourReposCompletCSV = activitesJour.length === 1 && (activitesJour[0].type === 'repos' || activitesJour[0].type === 'pause') && activitesJour[0].heure_debut === '00:00' && (activitesJour[0].heure_fin === '24:00' || activitesJour[0].heure_fin === '23:59');

    // Calcul du repos inter-journalier REEL:
    // = (24h - heure fin derniere activite conduite/travail du jour)
    //   + (heure debut premiere activite conduite/travail du jour suivant)
    // Les pauses/repos < 3h entre activites NE COMPTENT PAS comme repos journalier
    const totalActiviteHorsPause = estJourReposCompletCSV ? 0 : (conduiteJour + travailJour + dispoJour);
    const totalActiviteJour = estJourReposCompletCSV ? 0 : (conduiteJour + travailJour + dispoJour + pauseJour);

    let reposInterJourH = 24; // Par defaut (premier jour ou jour de repos complet)
    if (!estJourReposCompletCSV && totalActiviteHorsPause > 0) {
      // Heure de fin de la derniere activite de travail/conduite de CE jour
      const finJourH = (function() {
        var maxFin = 0;
        activitesJour.forEach(function(a) {
          if (a.type !== 'pause' && a.type !== 'repos' && a.type !== 'ferry') {
            var parts = a.heure_fin.split(':');
            var fH = parseInt(parts[0]) + parseInt(parts[1]) / 60;
            if (fH > maxFin) maxFin = fH;
          }
        });
        return maxFin;
      })();

      // Heure de debut de la premiere activite de travail/conduite du jour SUIVANT
      var debutSuivantH = -1; // -1 = pas de jour suivant connu
      if (idxJour + 1 < joursTries.length) {
        var dateSuivant = joursTries[idxJour + 1];
        var actsSuivant = joursMap[dateSuivant] || [];
        var minDeb = 24;
        actsSuivant.forEach(function(a) {
          if (a.type !== 'pause' && a.type !== 'repos' && a.type !== 'ferry') {
            var parts = a.heure_debut.split(':');
            var dH = parseInt(parts[0]) + parseInt(parts[1]) / 60;
            if (dH < minDeb) minDeb = dH;
          }
        });
        debutSuivantH = minDeb;
      }

      // Repos inter-journalier reel (fin jour N -> debut jour N+1)
      var reposInterJourBrut;
      if (debutSuivantH >= 0) {
        reposInterJourBrut = (24 - finJourH) + debutSuivantH;
      } else {
        reposInterJourBrut = 24 - finJourH;
      }
      // Repos intra-periode 24h (CE 561/2006 Art.8 + Art.4 par.g)
      // = 24h - (conduite + travail + dispo). Pause exclue (meme symbole tachy)
      var reposIntraPeriodeH = (24 * 60 - totalActiviteHorsPause) / 60;
      // Prendre le MAX des deux estimations
      reposInterJourH = Math.max(reposInterJourBrut, reposIntraPeriodeH);

      // Verifier aussi le plus long bloc consecutif INTRA-jour
      // (pour detecter les repos fractionnes 3h+9h)
      var blocsReposIntra = [];
      var triees = activitesJour.slice().sort(function(a, b) { return a.heure_debut.localeCompare(b.heure_debut); });
      for (var bi = 0; bi < triees.length - 1; bi++) {
        var finAct = parseInt(triees[bi].heure_fin.split(':')[0]) * 60 + parseInt(triees[bi].heure_fin.split(':')[1]);
        var debNext = parseInt(triees[bi + 1].heure_debut.split(':')[0]) * 60 + parseInt(triees[bi + 1].heure_debut.split(':')[1]);
        var gap = debNext - finAct;
        if (gap > 0) blocsReposIntra.push(gap);
      }
      // Ajouter le bloc de fin de journee (apres derniere activite)
      var dernFinMin = parseInt(triees[triees.length - 1].heure_fin.split(':')[0]) * 60 + parseInt(triees[triees.length - 1].heure_fin.split(':')[1]);
      var blocFinJour = 1440 - dernFinMin;
      if (blocFinJour > 0) blocsReposIntra.push(blocFinJour);
      // Ajouter le bloc de debut de journee (avant premiere activite)
      var premDebMin = parseInt(triees[0].heure_debut.split(':')[0]) * 60 + parseInt(triees[0].heure_debut.split(':')[1]);
      if (premDebMin > 0) blocsReposIntra.push(premDebMin);

      // Le plus long bloc intra-jour (en heures)
      var maxBlocIntraH = blocsReposIntra.length > 0 ? Math.max.apply(null, blocsReposIntra) / 60 : 0;

      // Utiliser le MAX entre repos inter-jour et plus long bloc intra-jour
      // Car un repos de 11h en milieu de journee (ex: 08:00-19:00 libre) est valide
      if (maxBlocIntraH > reposInterJourH) reposInterJourH = maxBlocIntraH;
    }

    const reposEstimeMin = reposInterJourH * 60;
    const reposEstime = reposEstimeMin; // Compat avec le reste du code
    const seuilReposIntraJourH = equipage === "double" ? R.MULTI_REPOS_JOURNALIER_MIN_H : REGLES_SLO.REPOS_JOURNALIER_REDUIT_H;

    if (!estJourReposCompletCSV && totalActiviteHorsPause > 0 && reposInterJourH < seuilReposIntraJourH) {
      const manqueH = seuilReposIntraJourH - reposInterJourH;
      if (manqueH > 2.5) { // > 2h30 sous le minimum = classe 5
        infractionsJour.push({
          regle: "Repos journalier insuffisant (CE 561/2006 Art.8 + R3312-28)",
          limite: seuilReposIntraJourH + "h minimum (reduit)",
          constate: reposInterJourH.toFixed(1) + "h (fin " + Math.floor(24 - ((24 - (totalActiviteHorsPause/60)))) + "h -> debut J+1)",
          depassement: "Manque " + manqueH.toFixed(1) + "h",
          classe: "5e classe",
          amende: amendeObj('5e classe')
        });
        amendeEstimee += SANCTIONS.classe_5.amende_max;
      } else {
        infractionsJour.push({
          regle: "Repos journalier insuffisant (CE 561/2006 Art.8 + R3312-28)",
          limite: seuilReposIntraJourH + "h minimum (reduit)",
          constate: reposInterJourH.toFixed(1) + "h (inter-journalier)",
          depassement: "Manque " + manqueH.toFixed(1) + "h",
          classe: "4e classe",
          amende: amendeObj("4e classe")
        });
        amendeEstimee += SANCTIONS.classe_4.amende_forfaitaire;
      }
    } else if (!estJourReposCompletCSV && totalActiviteHorsPause > 0 && reposInterJourH < REGLES_SLO.REPOS_JOURNALIER_NORMAL_H && reposInterJourH >= seuilReposIntraJourH) {
      avertissementsJour.push({
        regle: "Repos journalier en mode reduit",
        message: "Repos estime de " + reposInterJourH.toFixed(1) + "h (norme = " + REGLES_SLO.REPOS_JOURNALIER_NORMAL_H + "h, reduit admis = " + seuilReposIntraJourH + "h, max 3x entre 2 repos hebdo)" + (equipage === "double" ? " [Multi-equipage: delai 30h au lieu de 24h, Art.8 par.5]" : "")
      });
    }

    
    // Verification ferry Art.9 CE 561/2006
    if (ferryJour > 0) {
      // Compter les segments ferry (interruptions potentielles du repos)
      const segmentsFerry = activitesJour.filter(a => a.type === 'ferry');
      const interruptionsFerry = segmentsFerry.length;
      const totalInterruptionMin = activitesJour
        .filter(a => a.type !== 'ferry' && a.type !== 'pause' && a.type !== 'repos')
        .reduce((sum, a) => {
          // Verifier si l'activite est entre deux segments ferry
          const isEntreDeuxFerry = segmentsFerry.some((f, i) => {
            const next = segmentsFerry[i + 1];
            return next && a.heure_debut >= f.heure_fin && a.heure_fin <= next.heure_debut;
          });
          return isEntreDeuxFerry ? sum + a.duree_min : sum;
        }, 0);
      
      if (totalInterruptionMin > 60) {
        infractionsJour.push({
          regle: 'Interruption repos ferry (CE 561/2006 Art.9 par.1)',
          limite: 'Max 1h d\'interruption totale pendant repos sur ferry/train',
          constate: totalInterruptionMin + ' min d\'interruption',
          depassement: (totalInterruptionMin - 60) + ' min',
          classe: '4e classe',
          amende: amendeObj('4e classe')
        });
        amendeEstimee += SANCTIONS.classe_4.amende_forfaitaire;
      }
      if (interruptionsFerry > 1) {
        avertissementsJour.push({
          regle: 'Segments ferry multiples (Art.9)',
          message: interruptionsFerry + ' segments ferry detectes. Le repos peut etre interrompu max 2 fois.'
        });
      }
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
      amplitude_estimee_h: (activitesJour.length >= 2 && activitesJour[0] && activitesJour[0].heure_debut)
        ? (function () {
           const d = parseInt(activitesJour[0].heure_debut.split(":")[0]) * 60 + parseInt(activitesJour[0].heure_debut.split(":")[1]);
           const f = parseInt(activitesJour[activitesJour.length-1].heure_fin.split(":")[0]) * 60 + parseInt(activitesJour[activitesJour.length-1].heure_fin.split(":")[1]);
           let a = estServiceNuit && d > f ? (1440 - d) + f : f - d;
           if (a < 0) a += 1440;
           return (a / 60).toFixed(1);
         })()
        : "N/A",
      conduite_continue_max_min: maxConduiteContinue,
      repos_estime_h: estJourReposCompletCSV ? "24.0" : (totalActiviteHorsPause > 0 ? reposInterJourH.toFixed(1) : "24.0"),
      repos_cumule_heures: totalActiviteJour === 0 ? 24 : (totalActiviteJour <= pauseJour ? 24 : Math.max(0, (24 * 60 - totalActiviteJour) / 60)),
      travail_nuit_min: travailNuitMin,
      ferry_min: ferryJour,
      ferry_h: (ferryJour / 60).toFixed(1),
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
        amende: amendeObj(classe)
      });
      amendeEstimee += classe === "5e classe" ? SANCTIONS.classe_5.amende_max : SANCTIONS.classe_4.amende_forfaitaire;
    }
  }

  
  // Verification conduite bi-hebdomadaire 90h (CE 561/2006 Art.6 par.3)
  // Total conduite sur 2 semaines consecutives ne doit pas depasser 90h
  if (joursTries.length >= 10) {
    // Calculer la conduite des 2 semaines
    const conduiteParJour = detailsJours.map(j => j.conduite_min);
    // Verifier chaque fenetre de 14 jours glissante
    for (let i = 0; i <= conduiteParJour.length - 10; i++) {
      const fenetre = conduiteParJour.slice(i, Math.min(i + 14, conduiteParJour.length));
      const totalFenetre = fenetre.reduce((a, b) => a + b, 0);
      if (totalFenetre > REGLES.CONDUITE_BIHEBDO_MAX_MIN) {
        const depassement = totalFenetre - REGLES.CONDUITE_BIHEBDO_MAX_MIN;
        const classe = depassement > (22.5 * 60) ? '5e classe' : '4e classe';
        infractions.push({
          regle: 'Conduite bi-hebdomadaire (CE 561/2006 Art.6 par.3)',
          limite: '90h (' + REGLES.CONDUITE_BIHEBDO_MAX_MIN + ' min) sur 2 semaines consecutives',
          constate: (totalFenetre / 60).toFixed(1) + 'h sur ' + fenetre.length + ' jours',
          depassement: (depassement / 60).toFixed(1) + 'h',
          classe: classe,
          amende: amendeObj(classe)
        });
        amendeEstimee += classe === '5e classe' ? SANCTIONS.classe_5.amende_max : SANCTIONS.classe_4.amende_forfaitaire;
        break; // Une seule infraction bi-hebdo suffit
      }
    }
  }


  // ============================================================
  // Verification repos hebdomadaire (CE 561/2006 Art.8 par.6)
  // ============================================================

  // ============================================================
  // ============================================================
  // v7.20.1 : Verification repos JOURNALIER inter-jours REFACTOREE
  // Calcule le repos reel entre chaque paire de jours TRAVAILLES consecutifs
  // Les jours de repos complets (00:00-24:00 R/P) sont INCLUS dans le repos
  // Source: CE 561/2006 Art.8
  // ============================================================
  const joursTravailles = [];
  for (let i = 0; i < detailsJours.length; i++) {
    const dj = detailsJours[i];
    const acts = joursMap[dj.date] || [];
    const estReposComplet = acts.length === 1 && (acts[0].type === "repos" || acts[0].type === "pause") && acts[0].heure_debut === "00:00" && (acts[0].heure_fin === "24:00" || acts[0].heure_fin === "23:59");
    if (!estReposComplet && acts.length > 0) {
      joursTravailles.push({ date: dj.date, activites: acts, detail: dj });
    }
  }
  console.log("[v7.20.1] Jours travailles: " + joursTravailles.length + "/" + detailsJours.length);

  if (joursTravailles.length >= 2) {
    const reposInterJours = [];
    for (let i = 0; i < joursTravailles.length - 1; i++) {
      const jourActuel = joursTravailles[i];
      const jourSuivant = joursTravailles[i + 1];

      const finActuel = jourActuel.activites.slice().sort(function(a, b) { return a.heure_fin.localeCompare(b.heure_fin); }).pop();
      const debutSuivant = jourActuel.activites.slice().sort(function(a, b) { return a.heure_debut.localeCompare(b.heure_debut); })[0];
      // Correction: debutSuivant doit venir du jour SUIVANT, pas actuel
      const debutSuivantCorr = jourSuivant.activites.slice().sort(function(a, b) { return a.heure_debut.localeCompare(b.heure_debut); })[0];
      if (!finActuel || !debutSuivantCorr) continue;

      const finH = parseInt(finActuel.heure_fin.split(":")[0]) * 60 + parseInt(finActuel.heure_fin.split(":")[1]);
      const debutH = parseInt(debutSuivantCorr.heure_debut.split(":")[0]) * 60 + parseInt(debutSuivantCorr.heure_debut.split(":")[1]);

      const d1 = new Date(jourActuel.date + "T00:00:00");
      const d2 = new Date(jourSuivant.date + "T00:00:00");
      const joursEcart = Math.round((d2 - d1) / (24 * 60 * 60 * 1000));

      const reposMin = (joursEcart * 24 * 60) - finH + debutH;
      const reposH = reposMin / 60;

      reposInterJours.push({
        entre: jourActuel.date + " -> " + jourSuivant.date,
        repos_h: reposH,
        repos_min: reposMin,
        jours_ecart: joursEcart
      });

      // Verifier repos journalier minimum
      const seuilReposMinH = equipage === "double" ? R.MULTI_REPOS_JOURNALIER_MIN_H : REGLES_SLO.REPOS_JOURNALIER_REDUIT_H;
      if (reposH < seuilReposMinH && joursEcart <= 1) {
        // Repos insuffisant seulement entre jours CONSECUTIFS (pas entre ven->lun)
        const manqueH = seuilReposMinH - reposH;
        const manqueMin = manqueH * 60;
        if (manqueMin > 150) {
          infractions.push({
            regle: "Repos journalier insuffisant (CE 561/2006 Art.8 + R3312-28)",
            limite: seuilReposMinH + "h minimum (reduit)",
            constate: reposH.toFixed(1) + "h entre " + jourActuel.date + " et " + jourSuivant.date,
            depassement: "Manque " + manqueH.toFixed(1) + "h",
            classe: "5e classe",
            amende: amendeObj("5e classe")
          });
          amendeEstimee += SANCTIONS.classe_5.amende_max;
        } else {
          infractions.push({
            regle: "Repos journalier insuffisant (CE 561/2006 Art.8 + R3312-28)",
            limite: seuilReposMinH + "h minimum (reduit)",
            constate: reposH.toFixed(1) + "h entre " + jourActuel.date + " et " + jourSuivant.date,
            depassement: "Manque " + manqueH.toFixed(1) + "h",
            classe: "4e classe",
            amende: amendeObj("4e classe")
          });
          amendeEstimee += SANCTIONS.classe_4.amende_forfaitaire;
        }
      } else if (reposH < REGLES_SLO.REPOS_JOURNALIER_NORMAL_H && reposH >= seuilReposMinH && joursEcart <= 1) {
        avertissements.push({
          regle: "Repos journalier reduit inter-jours",
          message: "Repos de " + reposH.toFixed(1) + "h entre " + jourActuel.date + " et " + jourSuivant.date + " (norme " + REGLES_SLO.REPOS_JOURNALIER_NORMAL_H + "h, reduit admis " + seuilReposMinH + "h, max 3x entre 2 repos hebdo)"
        });
      }
    }
  }

  // ============================================================
  // v7.20.1 : Verification repos HEBDOMADAIRE refactoree
  // Utilise joursTravailles pour calculer les vrais repos entre jours de travail
  // Les weekends (R 00:00-24:00) sont inclus dans le calcul du repos
  // Source: CE 561/2006 Art.8 par.6
  // ============================================================
  if (joursTravailles && joursTravailles.length >= 3) {
    const reposEntreJoursTrav = [];
    for (let i = 0; i < joursTravailles.length - 1; i++) {
      const jA = joursTravailles[i];
      const jS = joursTravailles[i + 1];
      const finA = jA.activites.slice().sort(function(a, b) { return a.heure_fin.localeCompare(b.heure_fin); }).pop();
      const debS = jS.activites.slice().sort(function(a, b) { return a.heure_debut.localeCompare(b.heure_debut); })[0];
      if (!finA || !debS) continue;
      const finMin = parseInt(finA.heure_fin.split(":")[0]) * 60 + parseInt(finA.heure_fin.split(":")[1]);
      const debMin = parseInt(debS.heure_debut.split(":")[0]) * 60 + parseInt(debS.heure_debut.split(":")[1]);
      const d1 = new Date(jA.date + "T00:00:00");
      const d2 = new Date(jS.date + "T00:00:00");
      const joursEcart = Math.round((d2 - d1) / (24 * 60 * 60 * 1000));
      const reposMin = (joursEcart * 24 * 60) - finMin + debMin;
      const reposH = reposMin / 60;
      reposEntreJoursTrav.push({
        entre: jA.date + " -> " + jS.date,
        repos_h: reposH,
        repos_min: reposMin,
        jours_ecart: joursEcart
      });
    }

    const reposHebdosDetectes = reposEntreJoursTrav.filter(function(r) { return r.repos_h >= R.REPOS_HEBDO_REDUIT_H; });
    const reposHebdoNormaux = reposEntreJoursTrav.filter(function(r) { return r.repos_h >= R.REPOS_HEBDO_NORMAL_H; });
    const reposHebdoReduits = reposEntreJoursTrav.filter(function(r) { return r.repos_h >= R.REPOS_HEBDO_REDUIT_H && r.repos_h < R.REPOS_HEBDO_NORMAL_H; });

    // v7.20.4: ancien log desactive - voir FIX-07a ligne ~1987 pour log unifie


    // Art.8 par.6 : en 2 semaines, au moins 2 repos hebdo (1 normal + 1 reduit minimum)
    const isOcc = (typeService === "SLO" || typeService === "OCCASIONNEL");
    if (joursTries.length >= 12 && reposHebdosDetectes.length < 2 && !isOcc) {
      infractions.push({
        regle: "Repos hebdomadaire insuffisant (CE 561/2006 Art.8 par.6)",
        limite: "2 repos hebdo en 2 semaines (min 1 normal " + R.REPOS_HEBDO_NORMAL_H + "h + 1 reduit " + R.REPOS_HEBDO_REDUIT_H + "h)",
        constate: reposHebdosDetectes.length + " repos hebdo detecte(s) sur " + joursTries.length + " jours",
        depassement: "Manque " + (2 - reposHebdosDetectes.length) + " repos hebdomadaire(s)",
        classe: "4e classe",
        amende: amendeObj("4e classe")
      });
      amendeEstimee += SANCTIONS.classe_4.amende_forfaitaire;
    }

    // Verifier max jours consecutifs sans repos hebdo
    const seuilMaxHebdo = isOcc ? 12 : 6;
    let joursConsecutifsSansReposHebdo = 0;
    for (let i = 0; i < joursTravailles.length; i++) {
      joursConsecutifsSansReposHebdo++;
      if (i < reposEntreJoursTrav.length && reposEntreJoursTrav[i].repos_h >= R.REPOS_HEBDO_REDUIT_H) {
        joursConsecutifsSansReposHebdo = 0;
      }
      if (joursConsecutifsSansReposHebdo > seuilMaxHebdo) {
        infractions.push({
          regle: seuilMaxHebdo === 12 ? "Delai repos hebdomadaire depasse (CE 561/2006 Art.8 par.6a - UE 2024/1258)" : "Delai repos hebdomadaire depasse (CE 561/2006 Art.8 par.6)",
          limite: "Repos hebdo au plus tard apres " + seuilMaxHebdo + " periodes de 24h",
          constate: joursConsecutifsSansReposHebdo + " jours consecutifs sans repos hebdomadaire",
          depassement: (joursConsecutifsSansReposHebdo - seuilMaxHebdo) + " jour(s) de trop",
          classe: "5e classe",
          amende: amendeObj("5e classe")
        });
        amendeEstimee += SANCTIONS.classe_5.amende_max;
        break;
      }
    }

    // Compensation repos reduits
    if (reposHebdoReduits.length > 0) {
      reposHebdoReduits.forEach(function(r) {
        var compensation = R.REPOS_HEBDO_NORMAL_H - r.repos_h;
        avertissements.push({
          regle: "Repos hebdomadaire reduit - compensation requise (Art.8 par.6b)",
          message: "Repos de " + r.repos_h.toFixed(1) + "h detecte (" + r.entre + "). Compensation de " + compensation.toFixed(1) + "h a prendre avant fin de la 3e semaine suivante, attachee a un repos de min 9h."
        });
      });
    }
  }

  // Verification derogation 10h : max 2 jours par semaine (CE 561/2006 Art.6 par.1)
  if (joursTries.length >= 3) {
    // Regrouper par semaine ISO
    const semainesMap = {};
    detailsJours.forEach(j => {
      const d = new Date(j.date + 'T12:00:00');
      // Calcul semaine ISO simplifiee
      const jan1 = new Date(d.getFullYear(), 0, 1);
      const semaine = Math.ceil(((d - jan1) / 86400000 + jan1.getDay()) / 7);
      const cleSemaine = d.getFullYear() + '-S' + semaine;
      if (!semainesMap[cleSemaine]) semainesMap[cleSemaine] = [];
      semainesMap[cleSemaine].push(j);
    });
    Object.entries(semainesMap).forEach(([semaine, jours]) => {
      const joursDerog = jours.filter(j => j.conduite_min > REGLES.CONDUITE_JOURNALIERE_MAX_MIN);
      if (joursDerog.length > REGLES.CONDUITE_DEROG_MAX_PAR_SEMAINE) {
        infractions.push({
          regle: 'Derogation 10h depassee (CE 561/2006 Art.6 par.1)',
          message: joursDerog.length + ' jours a plus de 9h de conduite en ' + semaine + ' (max autorise: ' + REGLES.CONDUITE_DEROG_MAX_PAR_SEMAINE + ' jours/semaine)',
          classe: '4e classe',
          amende: amendeObj('4e classe')
        });
      }
    });
  }
// Calcul du score de conformite
  const nbChecks = joursTries.length * 6; // 6 verifications par jour
  // v7.5.0 : Score pondere par classe (5e=poids 3, 4e=poids 1)
  // Source: baremes R3315-4 (4e classe 750 EUR) / R3315-10 (5e classe 1500 EUR)
  let poidsInfractions = 0;
  infractions.forEach(function(inf) {
    if (inf.classe && inf.classe.includes('5')) {
      poidsInfractions += 3;
    } else {
      poidsInfractions += 1;
    }
  });
  const score = nbChecks > 0 ? Math.max(0, Math.round(((nbChecks - poidsInfractions) / nbChecks) * 100)) : 100;


  // === APPEL ANALYSE MULTI-SEMAINES v7.0.0 ===
  const tracking = analyseMultiSemaines(detailsJours, joursMap, joursTries, typeService, equipage, infractions, avertissements);
  // v7.20.2 FIX-07a : Log repos hebdo depuis tracking (post analyseMultiSemaines)
  const trackRH = (tracking && tracking.repos_hebdomadaires) || [];
  const trackN = trackRH.filter(r => r.type === 'normal').length;
  const trackR = trackRH.filter(r => r.type === 'reduit').length;
  console.log('[v7.20.2] Repos hebdo (FIX-06): ' + trackN + ' normaux, ' + trackR + ' reduits sur ' + trackRH.length + ' blocs');

  return {
    score,
    resume: infractions.length === 0
      ? "Aucune infraction detectee. Activite conforme a la reglementation."
      : infractions.length + " infraction(s) detectee(s) sur " + joursTries.length + " jour(s) analyses.",
    type_service: typeService,
    equipage: equipage || 'solo',
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
    tracking: tracking,
    bareme_sanctions: SANCTIONS
  };
}

// ============================================================
// ROUTES API
// ============================================================

// POST /api/analyze - Analyse un CSV
app.post('/api/analyze', expensiveLimiter, (req, res) => {
  try {
    const { csv, csv2, typeService, pays, equipage } = req.body || {};

    if (typeof csv !== 'string' || csv.trim().length === 0) {
      return res.status(400).json({ error: "Aucun contenu CSV fourni." });
    }
    if (csv.length > 2 * 1024 * 1024 || (typeof csv2 === 'string' && csv2.length > 2 * 1024 * 1024)) {
      return res.status(413).json({ error: "Fichier CSV trop volumineux." });
    }
    if (csv2 !== undefined && csv2 !== null && typeof csv2 !== 'string') {
      return res.status(400).json({ error: "Le CSV du conducteur 2 doit etre une chaine de caracteres." });
    }

    const typeServiceValide = ['STANDARD', 'REGULIER', 'OCCASIONNEL', 'SLO', 'INTERURBAIN', 'MARCHANDISES'].includes(typeService) ? typeService : 'SLO';
    const paysValide = PAYS[pays] ? pays : 'FR';
    const equipageValide = equipage === 'double' ? 'double' : 'solo';

    console.log("[ANALYSE] Type service: " + typeServiceValide + ", Pays: " + paysValide + ", Equipage: " + equipageValide + ", Lignes CSV: " + csv.split('\n').length);

    const resultat = corrigerResultat(analyserCSV(csv, typeServiceValide, paysValide, equipageValide));

    // Multi-conducteur: analyser CSV conducteur 2 si present
    let resultat2 = null;
    if (equipageValide === "double" && csv2 && csv2.trim().length > 0) {
      console.log("[ANALYSE] Conducteur 2 detecte, analyse separee...");
      resultat2 = corrigerResultat(analyserCSV(csv2.trim(), typeServiceValide, paysValide, equipageValide));
      resultat2.conducteur = 2;
    }
    resultat.conducteur = 1;
    if (resultat2) { resultat.conducteur2 = resultat2; }

    console.log("[RESULTAT] Score: " + resultat.score + "%, Infractions: " + resultat.infractions.length + ", Amende estimee: " + resultat.amende_estimee + " euros");

    
    // Enrichissement automatique : ajouter les liens legaux
    if (resultat.infractions) {
      resultat.infractions.forEach(function(inf) {
        var lien = trouverLienLegal(inf.regle);
        if (lien) { inf.url_legale = lien.url; inf.ref_legale = lien.ref; }
      });
    }
    if (resultat.avertissements) {
      resultat.avertissements.forEach(function(av) {
        var lien = trouverLienLegal(av.regle);
        if (lien) { av.url_legale = lien.url; av.ref_legale = lien.ref; }
      });
    }

    // v7.20.2 FIX-07b : Resume post fix-engine (nombre reel d'infractions)
    resultat.resume = resultat.infractions.length === 0
      ? 'Aucune infraction detectee. Activite conforme a la reglementation.'
      : resultat.infractions.length + ' infraction(s) detectee(s) sur ' + (resultat.details_jours ? resultat.details_jours.length : '?') + ' jour(s) analyses.';

    res.json(resultat);
  } catch (err) {
    console.error("[ERREUR ANALYSE]", err);
    res.status(500).json({ error: "Erreur lors de l'analyse." });
  }
});

// POST /api/rapport/pdf - Genere un rapport PDF
app.post('/api/rapport/pdf', expensiveLimiter, function(req, res) {
  try {
    var resultat = req.body && req.body.resultat;
    var options = (req.body && req.body.options) || {};

    if (!resultat || typeof resultat !== 'object' || typeof resultat.score !== 'number' || !Number.isFinite(resultat.score) || resultat.score < 0 || resultat.score > 100) {
      return res.status(400).json({ error: 'Donnees d analyse manquantes ou invalides' });
    }
    
    console.log('[PDF] Generation rapport - Score: ' + resultat.score + '%, Infractions: ' + (resultat.infractions || []).length);
    
    var doc = genererRapportPDF(resultat, options);
    
    var filename = 'rapport_fimo_check_' + new Date().toISOString().slice(0, 10) + '.pdf';
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="' + filename + '"');
    
    doc.pipe(res);
    doc.end();
    
    console.log('[PDF] Rapport genere: ' + filename);
  } catch (err) {
    console.error('[PDF ERREUR]', err);
    res.status(500).json({ error: 'Erreur generation PDF.' });
  }
});
// POST /api/upload - Upload un fichier CSV
app.post('/api/upload', expensiveLimiter, upload.single('fichier'), (req, res) => {
  var tempPath = req.file && req.file.path;
  try {
    if (!req.file) {
      return res.status(400).json({ error: "Aucun fichier recu." });
    }

    const contenu = fs.readFileSync(req.file.path, 'utf-8');
    res.json({ csv: contenu, nom_fichier: req.file.originalname });
  } catch (err) {
    console.error("[ERREUR UPLOAD]", err);
    res.status(500).json({ error: "Erreur lors de l'upload." });
  } finally {
    if (tempPath && fs.existsSync(tempPath)) {
      try { fs.unlinkSync(tempPath); } catch (cleanupErr) {
        console.error("[UPLOAD CLEANUP]", cleanupErr.message);
      }
    }
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
    version: APP_VERSION,
    auteur: "Samir Medjaher",
    regles_version: "v7.6.10.1 - Double moteur: REGULIER(Decret 2006-925) / SLO+OCCASIONNEL(CE 561/2006)",
    pays_supportes: Object.keys(PAYS).length,
    timestamp: new Date().toISOString()
  });
});

// GET /api/pays - Liste des pays supportes
app.get('/api/pays', (req, res) => {
  res.json(PAYS);
});

registerDiagnosticRoutes(app, {
  APP_VERSION,
  PAYS,
  PORT,
  REGLES,
  REGLES_COMMUN,
  REGLES_OCCASIONNEL,
  REGLES_REGULIER,
  REGLES_SLO,
  SANCTIONS,
  analyseMultiSemaines,
  analyserCSV,
  estHeureEteEU,
  fs,
  getDecalageUTC,
  getRegles,
  path
});

app.use('/api', function(req, res) {
  res.status(404).json({ error: 'Endpoint API inconnu.' });
});

app.use(function(err, req, res, next) {
  if (res.headersSent) return next(err);
  var status = err.status || (err.code === 'LIMIT_FILE_SIZE' ? 413 : 500);
  if (status >= 500) console.error('[HTTP ERREUR]', err);
  var message = status >= 500 ? 'Erreur interne du serveur.' : err.message;
  res.status(status).json({ error: message });
});

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
  console.log("  FIMO Check v" + APP_VERSION);
  console.log("  Auteur : Samir Medjaher");
  console.log("  Serveur demarre sur le port " + PORT);
  console.log("  http://localhost:" + PORT);
  console.log("============================================");
  console.log("");
});
