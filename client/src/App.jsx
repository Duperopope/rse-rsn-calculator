import React from 'react';
import Calculator from './pages/Calculator.jsx';
import './styles/global.css';

/**
 * RSE/RSN Calculator v6.0.0
 * Shell minimal - tout le contenu est dans Calculator.jsx
 *
 * Architecture :
 *   App.jsx (shell) -> pages/Calculator.jsx -> composants modulaires
 *
 * Sources reglementaires :
 *   - CE 561/2006 (temps de conduite et repos)
 *   - L3312-1 / L3312-2 (travail de nuit)
 *   - Decret 2010-855 (amplitude)
 *
 * @author Samir Medjaher
 */
export default function App() {
  return <Calculator />;
}