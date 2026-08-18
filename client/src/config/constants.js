// FIMO Check - Configuration et constantes
// Source: CE 561/2006, L3312-1, C. transports R3312-9
// Extrait de App.jsx v5.6.0 -> v6.0.0

// URL API backend
export const API_URL = '/api';

// Nom de l'application (la version est recuperee du backend via /api/health)
export const APP_NAME = 'FIMO Check';
export const APP_SUBTITLE = 'Préparer un service conforme avant le départ';

// Symbole euro (evite problemes encodage)
export const EURO = '€';

// Types d'activite tachygraphe
export const TYPES_ACTIVITE = [
  { code: 'C', label: 'Conduite', couleur: '#18794e', icone: 'conduite' },
  { code: 'T', label: 'Autre tache', couleur: '#356a84', icone: 'tache' },
  { code: 'D', label: 'Disponibilite', couleur: '#a96310', icone: 'disponibilite' },
  { code: 'P', label: 'Pause / Repos', couleur: '#735a86', icone: 'pause' },
  { code: 'R', label: 'Repos', couleur: '#607372', icone: 'repos' },
  { code: 'O', label: 'Hors champ (OUT)', couleur: '#765f51', icone: 'out' },
  { code: 'F', label: 'Ferry / Train', couleur: '#277b82', icone: 'ferry' }
];

// Types de service (CE 561/2006 Art.4)
export const TYPES_SERVICE = [
  { code: 'REGULIER', label: 'Ligne urbaine', short: 'Urbain', detail: 'Trajets en ville, arrets fixes' },
  { code: 'OCCASIONNEL', label: 'Tourisme / Occasionnel', short: 'Tourisme', detail: 'Sorties, voyages, evenements' },
  { code: 'MARCHANDISES', label: 'Poids lourd', short: 'Poids lourd', detail: 'Transport de marchandises' },
  { code: 'INTERURBAIN', label: 'Longue distance', short: 'Long trajet', detail: 'Lignes entre villes' },
  { code: 'SLO', label: 'Librement organise', short: 'Libre', detail: 'Service librement organise (SLO)' }
];

// Pays supportes
export const PAYS_LISTE = [
  { code: 'FR', label: 'France', drapeau: '🇫🇷' },
  { code: 'BE', label: 'Belgique', drapeau: '🇧🇪' },
  { code: 'DE', label: 'Allemagne', drapeau: '🇩🇪' },
  { code: 'ES', label: 'Espagne', drapeau: '🇪🇸' },
  { code: 'IT', label: 'Italie', drapeau: '🇮🇹' },
  { code: 'LU', label: 'Luxembourg', drapeau: '🇱🇺' },
  { code: 'NL', label: 'Pays-Bas', drapeau: '🇳🇱' },
  { code: 'CH', label: 'Suisse', drapeau: '🇨🇭' },
  { code: 'PT', label: 'Portugal', drapeau: '🇵🇹' },
  { code: 'GB', label: 'Royaume-Uni', drapeau: '🇬🇧' }
];

// Templates de journees types (pre-remplissage formulaire)
export const TEMPLATES = {
  journeeType: {
    label: 'Journee type (8h)',
    activites: [
      { debut: '06:00', fin: '06:15', type: 'T' },
      { debut: '06:15', fin: '10:45', type: 'C' },
      { debut: '10:45', fin: '11:30', type: 'P' },
      { debut: '11:30', fin: '14:30', type: 'C' },
      { debut: '14:30', fin: '14:45', type: 'T' }
    ]
  },
  journeeLongue: {
    label: 'Journee longue (10h derog)',
    activites: [
      { debut: '05:00', fin: '05:15', type: 'T' },
      { debut: '05:15', fin: '09:45', type: 'C' },
      { debut: '09:45', fin: '10:30', type: 'P' },
      { debut: '10:30', fin: '15:30', type: 'C' },
      { debut: '15:30', fin: '15:45', type: 'T' }
    ]
  },
  serviceNuit: {
    label: 'Service de nuit',
    activites: [
      { debut: '22:00', fin: '22:15', type: 'T' },
      { debut: '22:15', fin: '01:45', type: 'C' },
      { debut: '01:45', fin: '02:30', type: 'P' },
      { debut: '02:30', fin: '05:00', type: 'C' },
      { debut: '05:00', fin: '05:15', type: 'T' }
    ]
  }
};

// Limites reglementaires (pour affichage jauges temps reel)
// Source: CE 561/2006 Art.6-8 + L3312-1
export const LIMITES = {
  CONDUITE_CONTINUE_MAX: 270,       // 4h30 en minutes
  CONDUITE_JOURNALIERE_MAX: 540,    // 9h en minutes
  CONDUITE_JOURNALIERE_DEROG: 600,  // 10h en minutes (2x/semaine)
  AMPLITUDE_REGULIER_NORMAL: 660,   // 11h en minutes (C. transports R3312-9)
  AMPLITUDE_REGULIER_DEROG: 780,     // 13h en minutes (R3312-28 derogation)
  AMPLITUDE_OCCASIONNEL_NORMAL: 720, // 12h en minutes (CE 561/2006 + R3312-11)
  AMPLITUDE_OCCASIONNEL_DEROG: 840,  // 14h en minutes (R3312-11 derogation)
  REPOS_JOURNALIER_MIN: 540,        // 9h en minutes (reduit)
  REPOS_JOURNALIER_NORMAL: 660,     // 11h en minutes
  TRAVAIL_NUIT_MAX: 600,            // 10h en minutes
  PAUSE_OBLIGATOIRE: 45,            // 45 min apres 4h30
  TRAVAIL_JOURNALIER_MAX: 720,
  // Double equipage (CE 561/2006 Art.8 par.5)
  MULTI_REPOS_JOURNALIER_MIN: 540,   // 9h en minutes
  MULTI_AMPLITUDE_MAX: 1260,          // 21h en minutes (30h - 9h repos)
  MULTI_DELAI_REPOS: 1800             // 30h en minutes
};

// Couleurs du theme (utilisees par les composants)
export const THEME_COLORS = {
  dark: {
    bg: '#101719',
    bgCard: '#172124',
    bgInput: '#1d2a2e',
    text: '#eef5f3',
    textSecondary: '#a8b8b5',
    border: '#33474a',
    accent: '#56b3ad',
    accentGreen: '#52c98b',
    accentRed: '#f07067',
    accentOrange: '#efa74a',
    accentPurple: '#8ea8c7',
    gradientStart: '#166b69',
    gradientEnd: '#124f58'
  },
  light: {
    bg: '#edf2f1',
    bgCard: '#fbfdfc',
    bgInput: '#f1f5f4',
    text: '#172426',
    textSecondary: '#5b6c6c',
    border: '#c9d5d3',
    accent: '#136f6c',
    accentGreen: '#18794e',
    accentRed: '#b84038',
    accentOrange: '#a96310',
    accentPurple: '#49667e',
    gradientStart: '#136f6c',
    gradientEnd: '#0f555c'
  }
};

// Cle localStorage pour l'historique
export const STORAGE_KEY = 'rse_rsn_historique';

// Nombre max d'entrees historique
export const HISTORIQUE_MAX = 50;
