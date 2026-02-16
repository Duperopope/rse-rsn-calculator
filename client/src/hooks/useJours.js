// FIMO Check — useJours.js
// Hook unifie pour gestion des jours (solo + duo)
// Remplace: jours/jours2/joursActifs + 8 fonctions doublees + window.__
// Source: ARCHITECTURE-V8.md section 3a

import { useState, useEffect, useMemo } from "react";
import { calculerStatsJour } from "../utils/stats.js";

const STORAGE_KEYS = { solo: "rse_jours", duo1: "rse_jours", duo2: "rse_jours2" };

function loadJours(key) {
  try {
    var saved = localStorage.getItem(key);
    if (saved) return JSON.parse(saved);
  } catch (e) { /* ignore */ }
  return [{ date: new Date().toISOString().slice(0, 10), activites: [] }];
}

function saveJours(key, jours) {
  try { localStorage.setItem(key, JSON.stringify(jours)); } catch (e) { /* ignore */ }
}

export function useJours(equipage, typeService) {
  // === State principal ===
  var [jours1, setJours1] = useState(function() { return loadJours(STORAGE_KEYS.solo); });
  var [jours2, setJours2] = useState(function() { return loadJours(STORAGE_KEYS.duo2); });
  var [jourActifIndex, setJourActifIndex] = useState(0);
  var [conducteurActif, setConducteurActif] = useState(1);

  // === Jours actifs = pointeur vers le bon tableau ===
  var jours = equipage === "double" && conducteurActif === 2 ? jours2 : jours1;
  var setJours = equipage === "double" && conducteurActif === 2 ? setJours2 : setJours1;

  // === Persistence localStorage ===
  useEffect(function() { saveJours(STORAGE_KEYS.solo, jours1); }, [jours1]);
  useEffect(function() { saveJours(STORAGE_KEYS.duo2, jours2); }, [jours2]);

  // === Index safe ===
  var safeIndex = Math.min(jourActifIndex, jours.length - 1);
  if (safeIndex < 0) safeIndex = 0;

  // === CRUD jours (une seule version, plus de doublon) ===
  function updateJour(index, newJour) {
    setJours(function(prev) { return prev.map(function(j, i) { return i === index ? newJour : j; }); });
  }

  function ajouterJour() {
    var lastDate = jours[jours.length - 1] ? jours[jours.length - 1].date : new Date().toISOString().slice(0, 10);
    var d = new Date(lastDate);
    d.setDate(d.getDate() + 1);
    setJours(function(prev) {
      return prev.concat([{ date: d.toISOString().slice(0, 10), activites: [{ debut: "06:00", fin: "06:15", type: "T" }] }]);
    });
  }

  function supprimerJour(index) {
    if (jours.length <= 1) return;
    setJours(function(prev) { return prev.filter(function(_, i) { return i !== index; }); });
    if (safeIndex >= jours.length - 1) setJourActifIndex(Math.max(0, jours.length - 2));
  }

  function dupliquerJour(index) {
    var src = jours[index];
    var d = new Date(src.date);
    d.setDate(d.getDate() + 1);
    var copy = { date: d.toISOString().slice(0, 10), activites: src.activites.map(function(a) { return Object.assign({}, a); }) };
    setJours(function(prev) { var arr = prev.slice(); arr.splice(index + 1, 0, copy); return arr; });
  }

  // === Calculs derogations (remplace window.__) ===
  var derogations = useMemo(function() {
    var nbDerogConduite = 0;
    for (var di = 0; di < jours.length; di++) {
      if (di === safeIndex) continue;
      var jourStats = calculerStatsJour(jours[di].activites);
      if (jourStats && jourStats.conduiteTotale > 540) nbDerogConduite++;
    }
    nbDerogConduite = Math.min(nbDerogConduite, 2);

    var isSLO = typeService === "OCCASIONNEL" || typeService === "SLO" || typeService === "INTERURBAIN" || typeService === "MARCHANDISES";
    var amplNormal = isSLO ? 720 : 660;
    var amplDerog = isSLO ? 840 : 780;
    var statsAmpl = jours[safeIndex] ? calculerStatsJour(jours[safeIndex].activites) : null;
    var amplActuelle = statsAmpl ? statsAmpl.amplitude : 0;
    var amplMax = amplActuelle > amplNormal ? amplDerog : amplNormal;

    return {
      nbDerogConduite: nbDerogConduite,
      amplNormal: amplNormal,
      amplMax: amplMax
    };
  }, [jours, safeIndex, typeService]);

  // === Stats jour actif ===
  var statsJour = useMemo(function() {
    if (!jours[safeIndex] || !jours[safeIndex].activites) return null;
    return calculerStatsJour(jours[safeIndex].activites);
  }, [jours, safeIndex]);

  // === Reset quand on change de mode ===
  function reset() {
    setJours1([{ date: new Date().toISOString().slice(0, 10), activites: [] }]);
    setJours2([{ date: new Date().toISOString().slice(0, 10), activites: [] }]);
    setJourActifIndex(0);
  }

  return {
    jours: jours,
    jours1: jours1,
    jours2: jours2,
    jourActifIndex: safeIndex,
    setJourActifIndex: setJourActifIndex,
    conducteurActif: conducteurActif,
    setConducteurActif: setConducteurActif,
    updateJour: updateJour,
    ajouterJour: ajouterJour,
    supprimerJour: supprimerJour,
    dupliquerJour: dupliquerJour,
    statsJour: statsJour,
    derogations: derogations,
    reset: reset
  };
}