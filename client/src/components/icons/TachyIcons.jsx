import React from 'react';

/**
 * Icones tachygraphe officielles - Symboles normalises
 * Source: Reglement CE 3821/85 Annexe IB, Reglement 165/2014
 * Ref: https://fleetgo.fr/tachygraphe/les-symboles-et-pictogrammes-chronotachygraphe/
 */

// CONDUITE - Volant de direction (cercle + cercle interieur + rayons)
export function IconeConduite({ size = 24, color = '#4CAF50' }) {
  return (
    <svg width={size} height={size} viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
      <circle cx='12' cy='12' r='10' stroke={color} strokeWidth='2' />
      <circle cx='12' cy='12' r='3' fill={color} />
      <line x1='12' y1='2' x2='12' y2='9' stroke={color} strokeWidth='2' />
      <line x1='3.5' y1='17' x2='9.5' y2='13.5' stroke={color} strokeWidth='2' />
      <line x1='20.5' y1='17' x2='14.5' y2='13.5' stroke={color} strokeWidth='2' />
    </svg>
  );
}

// AUTRE TACHE - Marteaux croises (outils de travail)
// Source: Reglement 165/2014 Art.34 par.5b(ii), CE 3821/85 Annexe IB
// Ref: https://fleetgo.com/kb/manuals/tachograph-symbols/
// Ref: https://stoneridge-tachographs.com/fr/actualites-et-evenements/symboles-du-tachygraphe-et-significations
export function IconeAutreTache({ size = 24, color = '#2196F3' }) {
  return (
    <svg width={size} height={size} viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
      <rect x='2' y='2' width='20' height='20' rx='2' stroke={color} strokeWidth='2' />
      {/* Marteau gauche : manche du bas-gauche vers haut-droite, tete en haut-droite */}
      <line x1='7' y1='17' x2='14' y2='7' stroke={color} strokeWidth='2' strokeLinecap='round' />
      <rect x='13' y='5' width='5' height='3' rx='1' fill={color} transform='rotate(25 15.5 6.5)' />
      {/* Marteau droit : manche du bas-droite vers haut-gauche, tete en haut-gauche */}
      <line x1='17' y1='17' x2='10' y2='7' stroke={color} strokeWidth='2' strokeLinecap='round' />
      <rect x='6' y='5' width='5' height='3' rx='1' fill={color} transform='rotate(-25 8.5 6.5)' />
    </svg>
  );
}
// DISPONIBILITE - Carre avec une diagonale (barre oblique /)
export function IconeDisponibilite({ size = 24, color = '#FF9800' }) {
  return (
    <svg width={size} height={size} viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
      <rect x='2' y='2' width='20' height='20' rx='2' stroke={color} strokeWidth='2' />
      <line x1='18' y1='4' x2='6' y2='20' stroke={color} strokeWidth='2.5' strokeLinecap='round' />
    </svg>
  );
}

// PAUSE / REPOS - Lit (rectangle + cercle oreiller)
export function IconePause({ size = 24, color = '#9C27B0' }) {
  return (
    <svg width={size} height={size} viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
      <rect x='2' y='10' width='20' height='10' rx='2' stroke={color} strokeWidth='2' />
      <line x1='2' y1='14' x2='22' y2='14' stroke={color} strokeWidth='2' />
      <circle cx='7' cy='8' r='3' stroke={color} strokeWidth='2' />
      <rect x='13' y='10' width='7' height='4' rx='1' fill={color} fillOpacity='0.3' />
    </svg>
  );
}

// REPOS (long) - Lit plein
export function IconeRepos({ size = 24, color = '#607D8B' }) {
  return (
    <svg width={size} height={size} viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
      <rect x='2' y='10' width='20' height='10' rx='2' fill={color} fillOpacity='0.2' stroke={color} strokeWidth='2' />
      <line x1='2' y1='14' x2='22' y2='14' stroke={color} strokeWidth='2' />
      <circle cx='7' cy='8' r='3' fill={color} fillOpacity='0.3' stroke={color} strokeWidth='2' />
      <rect x='13' y='10' width='7' height='4' rx='1' fill={color} fillOpacity='0.5' />
    </svg>
  );
}

// OUT (Hors champ) - Cercle barre (interdit)
// Source: Art.6 par.5 + Art.9 par.3 CE 561/2006
export function IconeOut({ size = 24, color = '#795548' }) {
  return (
    <svg width={size} height={size} viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
      <circle cx='12' cy='12' r='10' stroke={color} strokeWidth='2' />
      <line x1='5' y1='5' x2='19' y2='19' stroke={color} strokeWidth='2.5' strokeLinecap='round' />
      <text x='12' y='13' textAnchor='middle' fontSize='6' fontWeight='bold' fill={color} dominantBaseline='middle'>OUT</text>
    </svg>
  );
}

// FERRY / TRAIN - Ancre / bateau
// Source: Art.9 par.1 CE 561/2006 (version 2020/1054)
export function IconeFerry({ size = 24, color = '#00BCD4' }) {
  return (
    <svg width={size} height={size} viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
      <path d='M4 18 Q8 14 12 16 Q16 18 20 14' stroke={color} strokeWidth='2' strokeLinecap='round' fill='none' />
      <path d='M4 21 Q8 17 12 19 Q16 21 20 17' stroke={color} strokeWidth='2' strokeLinecap='round' fill='none' />
      <rect x='8' y='6' width='8' height='10' rx='1' stroke={color} strokeWidth='2' fill={color} fillOpacity='0.1' />
      <line x1='12' y1='3' x2='12' y2='6' stroke={color} strokeWidth='2' />
      <line x1='9' y1='3' x2='15' y2='3' stroke={color} strokeWidth='2' strokeLinecap='round' />
    </svg>
  );
}

/**
 * Composant generique - retourne l'icone selon le code activite
 * Codes: C=Conduite, T=Autre tache, D=Disponibilite, P=Pause, R=Repos, O=Out, F=Ferry
 */
export function IconeActivite({ type, size = 24, color }) {
  switch (type) {
    case 'C': return <IconeConduite size={size} color={color || '#4CAF50'} />;
    case 'T': return <IconeAutreTache size={size} color={color || '#2196F3'} />;
    case 'D': return <IconeDisponibilite size={size} color={color || '#FF9800'} />;
    case 'P': return <IconePause size={size} color={color || '#9C27B0'} />;
    case 'R': return <IconeRepos size={size} color={color || '#607D8B'} />;
    case 'O': return <IconeOut size={size} color={color || '#795548'} />;
    case 'F': return <IconeFerry size={size} color={color || '#00BCD4'} />;
    default: return null;
  }
}