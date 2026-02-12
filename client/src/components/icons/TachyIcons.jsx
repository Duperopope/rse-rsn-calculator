import React from 'react';

/**
 * Icones tachygraphe SVG pour les types d'activite
 * Source: symboles standard chronotachygraphe numerique
 */

export function IconeConduite({ size = 20, color = '#4CAF50' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="10" stroke={color} strokeWidth="2" />
      <path d="M12 6 L12 12 L16 14" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconeAutreTache({ size = 20, color = '#2196F3' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="3" y="3" width="18" height="18" rx="2" stroke={color} strokeWidth="2" />
      <line x1="3" y1="9" x2="21" y2="9" stroke={color} strokeWidth="2" />
      <line x1="9" y1="3" x2="9" y2="21" stroke={color} strokeWidth="2" />
    </svg>
  );
}

export function IconeDisponibilite({ size = 20, color = '#FF9800' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="3" y="3" width="18" height="18" rx="2" stroke={color} strokeWidth="2" />
      <line x1="3" y1="12" x2="21" y2="12" stroke={color} strokeWidth="2" />
    </svg>
  );
}

export function IconeRepos({ size = 20, color = '#9C27B0' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="4" y="4" width="16" height="16" rx="2" fill={color} fillOpacity="0.2" stroke={color} strokeWidth="2" />
    </svg>
  );
}

/**
 * Retourne le composant icone correspondant au type d'activite
 * @param {string} type - Code activite (C, T, D, P, R)
 * @param {Object} props - Props transmises a l'icone (size, color)
 * @returns {React.Element}
 */
export function IconeActivite({ type, size = 20, color }) {
  switch (type) {
    case 'C': return <IconeConduite size={size} color={color || '#4CAF50'} />;
    case 'T': return <IconeAutreTache size={size} color={color || '#2196F3'} />;
    case 'D': return <IconeDisponibilite size={size} color={color || '#FF9800'} />;
    case 'P': return <IconeRepos size={size} color={color || '#9C27B0'} />;
    case 'R': return <IconeRepos size={size} color={color || '#607D8B'} />;
    default: return null;
  }
}
