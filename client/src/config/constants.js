// FIMO Check - Configuration et constantes
// Source: CE 561/2006, L3312-1, Decret 2010-855
// Extrait de App.jsx v5.6.0 -> v6.0.0

// URL API backend
export const API_URL = '/api';

// Nom de l'application (la version est recuperee du backend via /api/health)
export const APP_NAME = 'FIMO Check';
export const APP_SUBTITLE = 'Driver CPC Compliance Tool';

// Symbole euro (evite problemes encodage)
export const EURO = '€';

// Types d'activite tachygraphe
export const TYPES_ACTIVITE = [
  { code: 'C', label: 'Conduite', couleur: '#4CAF50', icone: 'conduite' },
  { code: 'T', label: 'Autre tache', couleur: '#2196F3', icone: 'tache' },
  { code: 'D', label: 'Disponibilite', couleur: '#FF9800', icone: 'disponibilite' },
  { code: 'P', label: 'Pause / Repos', couleur: '#9C27B0', icone: 'pause' },
  { code: 'R', label: 'Repos', couleur: '#607D8B', icone: 'repos' },
  { code: 'O', label: 'Hors champ (OUT)', couleur: '#795548', icone: 'out' },
  { code: 'F', label: 'Ferry / Train', couleur: '#00BCD4', icone: 'ferry' }
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
  AMPLITUDE_REGULIER_MAX: 780,      // 13h en minutes
  AMPLITUDE_OCCASIONNEL_MAX: 840,   // 14h en minutes
  REPOS_JOURNALIER_MIN: 540,        // 9h en minutes (reduit)
  REPOS_JOURNALIER_NORMAL: 660,     // 11h en minutes
  TRAVAIL_NUIT_MAX: 600,            // 10h en minutes
  PAUSE_OBLIGATOIRE: 45,            // 45 min apres 4h30
  TRAVAIL_JOURNALIER_MAX: 720       // 12h en minutes
};

// Couleurs du theme (utilisees par les composants)
export const THEME_COLORS = {
  dark: {
    bg: '#0a0a0f',
    bgCard: '#12121a',
    bgInput: '#1a1a2e',
    text: '#e0e0e0',
    textSecondary: '#888',
    border: '#2a2a3e',
    accent: '#00d4ff',
    accentGreen: '#00ff88',
    accentRed: '#ff4444',
    accentOrange: '#ffaa00',
    accentPurple: '#aa44ff',
    gradientStart: '#667eea',
    gradientEnd: '#764ba2'
  },
  light: {
    bg: '#f5f5f5',
    bgCard: '#ffffff',
    bgInput: '#f0f0f0',
    text: '#1a1a2e',
    textSecondary: '#666',
    border: '#ddd',
    accent: '#0088cc',
    accentGreen: '#00aa55',
    accentRed: '#cc0000',
    accentOrange: '#cc8800',
    accentPurple: '#7733cc',
    gradientStart: '#667eea',
    gradientEnd: '#764ba2'
  }
};

// Cle localStorage pour l'historique
export const STORAGE_KEY = 'rse_rsn_historique';

// Nombre max d'entrees historique
export const HISTORIQUE_MAX = 50;
