import React from 'react';
import Calculator from './pages/Calculator.jsx';
import './styles/global.css';

/**
 * FIMO Check v7.11.0
 * Shell minimal - tout le contenu est dans Calculator.jsx
 *
 * Architecture :
 *   App.jsx (shell) -> pages/Calculator.jsx -> composants modulaires
 *
 * Sources reglementaires :
 *   - CE 561/2006 (temps de conduite et repos)
 *   - L3312-1 / L3312-2 (travail de nuit)
 *   - C. transports R3312-9 (amplitude)
 *
 * @author Samir Medjaher
 */
export default function App() {
  return <Calculator />;
}