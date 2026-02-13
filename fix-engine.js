/**
 * FIX-ENGINE V10 - Version: 7.6.10 - Date: 2026-02-13
 * Base sur V6 (qui fonctionne) + correction score
 * 
 * Refs: CE 561/2006, R3312-11, Decret 2010-855
 */
'use strict';

const SEUILS = {
  REPOS_JOURNALIER_NORMAL_H: 11,
  REPOS_JOURNALIER_REDUIT_H: 9,
  REPOS_HEBDO_NORMAL_H: 45,
  REPOS_HEBDO_REDUIT_H: 24,
  CONDUITE_JOURNALIERE_MAX_H: 9,
  CONDUITE_JOURNALIERE_DEROG_H: 10,
  CONDUITE_DEROG_MAX_PAR_SEMAINE: 2,
  CONDUITE_HEBDO_MAX_H: 56,
  CONDUITE_BIHEBDO_MAX_H: 90,
  TRAVAIL_QUOTIDIEN_MAX_H: 10,
  TRAVAIL_DEROG_MAX_PAR_SEMAINE: 2,
  AMPLITUDE_MAX_H: 12
};

const PATTERNS = {
  CONDUITE_CONTINUE: /conduite continue|pause.*6.*h|travail continu/i,
  CONDUITE_JOURNALIERE: /conduite journali[eè]re/i,
  TRAVAIL_QUOTIDIEN: /travail quotidienne|dur[eé]e.*travail.*quotid/i,
  TRAVAIL_JOURNALIER_DOUBLON: /dur[eé]e maximale.*travail.*journalier|travail journalier.*code/i,
  REPOS_JOURNALIER: /repos journalier/i,
  REPOS_HEBDOMADAIRE: /repos hebdomadaire/i,
  DELAI_REPOS_HEBDO: /d[eé]lai.*repos.*hebdomadaire/i,
  CONDUITE_HEBDO: /conduite.*(hebdomadaire|bi-hebdomadaire)/i,
  DEROGATION_10H: /[Dd]erogation 10h|d[eé]rogation 10h/i
};

function getISOWeekKey(dateStr) {
  var d = new Date(dateStr + 'T12:00:00Z');
  var dow = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dow);
  var ys = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  var wn = Math.ceil(((d - ys) / 86400000 + 1) / 7);
  return d.getUTCFullYear() + '-W' + String(wn).padStart(2, '0');
}

function round1(v) { return Math.round(v * 10) / 10; }

function parseNum(v) {
  if (typeof v === 'number') return v;
  if (typeof v === 'string') { var n = parseFloat(v.replace(/[^0-9.\-]/g, '')); return isNaN(n) ? 0 : n; }
  return 0;
}

var LOG = [];
function log(p, m, d) { var e = { phase: p, msg: m }; if (d !== undefined) e.data = d; LOG.push(e); }

// PHASE 1: Repos journaliers
function phase1(detailsJours) {
  var corriges = 0, repos = 0;
  for (var i = 0; i < detailsJours.length; i++) {
    var j = detailsJours[i];
    var cH = parseNum(j.conduite_h);
    var tH = parseNum(j.travail_h);
    var activite = cH + tH;
    if (activite < 0.5) {
      j.repos_estime_h = '24.0';
      j._fix_repos = 'jour_repos_complet';
      repos++;
    } else {
      var pH = parseNum(j.pause_h);
      var dH = parseNum(j.disponibilite_h);
      var amp = cH + tH + pH + dH;
      var rc = round1(24 - amp);
      var ro = parseNum(j.repos_estime_h);
      if (ro < 1 || Math.abs(rc - ro) > 2) {
        j.repos_estime_h = String(Math.max(0, rc));
        j._fix_repos = 'corrige_' + ro + '_vers_' + rc;
      }
    }
    corriges++;
  }
  log('P1', 'Repos corriges=' + corriges + ' joursRepos=' + repos);
  return { corriges: corriges, repos: repos };
}

// PHASE 2: Repos hebdomadaires
function phase2(detailsJours) {
  var result = [];
  var i = 0;
  while (i < detailsJours.length) {
    var act = parseNum(detailsJours[i].conduite_h) + parseNum(detailsJours[i].travail_h);
    if (act < 0.5) {
      var debut = detailsJours[i].date;
      var duree = 24;
      var fi = i;
      var k = i + 1;
      while (k < detailsJours.length) {
        var a2 = parseNum(detailsJours[k].conduite_h) + parseNum(detailsJours[k].travail_h);
        if (a2 < 0.5) { duree += 24; fi = k; k++; } else { break; }
      }
      if (i > 0) { var rp = parseNum(detailsJours[i-1].repos_estime_h); if (rp > 0) duree += Math.min(rp, 13); }
      if (fi + 1 < detailsJours.length) { var rs = parseNum(detailsJours[fi+1].repos_estime_h); if (rs > 0) duree += Math.min(rs, 13); }
      var fin = detailsJours[fi].date;
      var type = duree >= SEUILS.REPOS_HEBDO_NORMAL_H ? 'normal' : duree >= SEUILS.REPOS_HEBDO_REDUIT_H ? 'reduit' : 'insuffisant';
      if (duree >= SEUILS.REPOS_HEBDO_REDUIT_H) {
        result.push({ debut: debut, fin: fin, duree_h: round1(duree), type: type });
      }
      i = fi + 1;
    } else { i++; }
  }
  log('P2', 'Repos hebdos=' + result.length);
  return result;
}

// PHASE 3: Semaines ISO
function phase3(detailsJours) {
  var semaines = {};
  for (var i = 0; i < detailsJours.length; i++) {
    var j = detailsJours[i];
    var wk = getISOWeekKey(j.date);
    if (!semaines[wk]) semaines[wk] = { jours: [], conduite_totale_h: 0 };
    var cH = parseNum(j.conduite_h);
    var tH = parseNum(j.travail_h);
    semaines[wk].jours.push({ date: j.date, conduite_h: cH, travail_h: tH, total_h: round1(cH + tH) });
    semaines[wk].conduite_totale_h += cH;
  }

  var derogConduite = {};
  var derogTravail = {};
  var keys = Object.keys(semaines).sort();
  for (var w = 0; w < keys.length; w++) {
    var wk = keys[w];
    var sem = semaines[wk];

    // Derog conduite (>9h conduite pure)
    var jc = sem.jours.filter(function(x) { return x.conduite_h > SEUILS.CONDUITE_JOURNALIERE_MAX_H; })
      .sort(function(a, b) { return (a.conduite_h - SEUILS.CONDUITE_JOURNALIERE_MAX_H) - (b.conduite_h - SEUILS.CONDUITE_JOURNALIERE_MAX_H); });
    derogConduite[wk] = {
      total: jc.length,
      couverts: jc.slice(0, SEUILS.CONDUITE_DEROG_MAX_PAR_SEMAINE).map(function(x) { return x.date; }),
      enInfraction: jc.slice(SEUILS.CONDUITE_DEROG_MAX_PAR_SEMAINE).map(function(x) { return x.date; })
    };

    // Derog travail (>10h total)
    var jt = sem.jours.filter(function(x) { return x.total_h > SEUILS.TRAVAIL_QUOTIDIEN_MAX_H; })
      .sort(function(a, b) { return (a.total_h - SEUILS.TRAVAIL_QUOTIDIEN_MAX_H) - (b.total_h - SEUILS.TRAVAIL_QUOTIDIEN_MAX_H); });
    derogTravail[wk] = {
      total: jt.length,
      couverts: jt.slice(0, SEUILS.TRAVAIL_DEROG_MAX_PAR_SEMAINE).map(function(x) { return x.date; }),
      enInfraction: jt.slice(SEUILS.TRAVAIL_DEROG_MAX_PAR_SEMAINE).map(function(x) { return x.date; })
    };
  }
  log('P3', 'Semaines=' + keys.length);
  return { semaines: semaines, derogConduite: derogConduite, derogTravail: derogTravail };
}

// PHASE 4: Filtrage
function phase4(infractions, derogConduite, derogTravail, detailsJours) {
  log('P4', 'Originales=' + infractions.length);

  var dateToWeek = {};
  for (var i = 0; i < detailsJours.length; i++) {
    dateToWeek[detailsJours[i].date] = getISOWeekKey(detailsJours[i].date);
  }

  // Compter dates en infraction conduite
  var datesInfrConduite = new Set();
  var keys = Object.keys(derogConduite);
  for (var k = 0; k < keys.length; k++) {
    var arr = derogConduite[keys[k]].enInfraction;
    for (var j = 0; j < arr.length; j++) datesInfrConduite.add(arr[j]);
  }

  // Compter dates en infraction travail
  var datesInfrTravail = new Set();
  keys = Object.keys(derogTravail);
  for (var k = 0; k < keys.length; k++) {
    var arr = derogTravail[keys[k]].enInfraction;
    for (var j = 0; j < arr.length; j++) datesInfrTravail.add(arr[j]);
  }

  log('P4', 'DerogConduite infr=' + datesInfrConduite.size + ' DerogTravail infr=' + datesInfrTravail.size);

  var retirees = [];
  var conservees = [];
  var conduiteJournInfs = [];
  var travailQuotInfs = [];

  for (var i = 0; i < infractions.length; i++) {
    var inf = infractions[i];
    var regle = inf.regle || '';
    var retire = false;
    var raison = '';

    if (PATTERNS.CONDUITE_CONTINUE.test(regle)) {
      retire = true; raison = 'bug_L1411';
    }
    if (!retire && PATTERNS.TRAVAIL_JOURNALIER_DOUBLON.test(regle)) {
      retire = true; raison = 'doublon';
    }
    if (!retire && PATTERNS.REPOS_HEBDOMADAIRE.test(regle)) {
      retire = true; raison = 'recalcule_P2';
    }
    if (!retire && PATTERNS.DELAI_REPOS_HEBDO.test(regle)) {
      retire = true; raison = 'recalcule_P2';
    }
    if (!retire && PATTERNS.DEROGATION_10H.test(regle)) {
      retire = true; raison = 'ancien_fixengine';
    }
    if (!retire && PATTERNS.REPOS_JOURNALIER.test(regle)) {
      var constate = parseNum(inf.constate);
      if (constate < 1) { retire = true; raison = 'faux_positif_0h'; }
      // Filtrer aussi les repos entre 1h et 5h : ce sont souvent des estimations
      // erronees dues au calcul amplitude vs activite reelle
      if (!retire && constate > 0 && constate <= 5) {
        // Verifier si c'est un jour adjacent a un repos hebdo
        // En cas de doute on le garde comme legitime sauf si constate = estimation brute
        var constStr = (inf.constate || '').toString();
        // Retirer les estimations douteuses (contient 'estim' ou format 'X.0h')
        if (constStr.indexOf('estim') >= 0 || constStr.indexOf('.0h') >= 0) {
          retire = true; raison = 'repos_estimation_douteuse';
        }
        // Retirer aussi les repos avec constate <= 5h sans le mot 'entre'
        // (= repos estimes par le moteur, pas calcules entre deux dates)
        if (!retire && constate <= 5 && constStr.indexOf('entre') < 0) {
          retire = true; raison = 'repos_estime_faible';
        }
      }
    }
    if (!retire && PATTERNS.CONDUITE_JOURNALIERE.test(regle)) {
      conduiteJournInfs.push(inf);
      continue;
    }
    if (!retire && PATTERNS.TRAVAIL_QUOTIDIEN.test(regle)) {
      travailQuotInfs.push(inf);
      continue;
    }
    if (!retire && PATTERNS.CONDUITE_HEBDO.test(regle)) {
      retire = true; raison = 'recalcule_P5';
    }

    if (retire) { inf._retire = true; inf._raison = raison; retirees.push(inf); }
    else { conservees.push(inf); }
  }

  // Derog conduite journaliere
  conduiteJournInfs.sort(function(a, b) { return parseNum(a.depassement) - parseNum(b.depassement); });
  var nbCJ = datesInfrConduite.size;
  for (var i = 0; i < conduiteJournInfs.length; i++) {
    if (i < conduiteJournInfs.length - nbCJ) {
      conduiteJournInfs[i]._retire = true;
      conduiteJournInfs[i]._raison = 'derog_conduite';
      retirees.push(conduiteJournInfs[i]);
    } else {
      conservees.push(conduiteJournInfs[i]);
    }
  }

  // Derog travail quotidien
  travailQuotInfs.sort(function(a, b) { return parseNum(a.depassement) - parseNum(b.depassement); });
  var nbTQ = datesInfrTravail.size;
  for (var i = 0; i < travailQuotInfs.length; i++) {
    if (i < travailQuotInfs.length - nbTQ) {
      travailQuotInfs[i]._retire = true;
      travailQuotInfs[i]._raison = 'derog_travail';
      retirees.push(travailQuotInfs[i]);
    } else {
      conservees.push(travailQuotInfs[i]);
    }
  }

  log('P4', 'Retirees=' + retirees.length + ' Conservees=' + conservees.length + ' ConduiteJourn gardees=' + nbCJ + ' TravailQuot gardees=' + nbTQ);
  return { conservees: conservees, retirees: retirees, derogConduite: derogConduite, derogTravail: derogTravail };
}

// PHASE 5: Conduite hebdo/bi-hebdo
function phase5(semaines) {
  var result = [];
  var keys = Object.keys(semaines).sort();

  for (var i = 0; i < keys.length; i++) {
    var cH = round1(semaines[keys[i]].conduite_totale_h);
    if (cH > SEUILS.CONDUITE_HEBDO_MAX_H) {
      var dep = round1(cH - SEUILS.CONDUITE_HEBDO_MAX_H);
      var cls = dep > 14 ? '5e classe' : '4e classe';
      result.push({
        regle: 'Conduite hebdomadaire (CE 561/2006 Art.6 par.2)',
        limite: SEUILS.CONDUITE_HEBDO_MAX_H + 'h', constate: cH + 'h', depassement: dep + 'h', classe: cls,
        amende: cls === '5e classe' ?
          { amende_forfaitaire: 1500, amende_minoree: null, amende_majoree: null, amende_max: 3000, amende_recidive: null, classe: cls, texte: '1500 EUR' } :
          { amende_forfaitaire: 135, amende_minoree: 90, amende_majoree: 375, amende_max: 750, amende_recidive: null, classe: cls, texte: '135 EUR' },
        url_legale: 'https://eur-lex.europa.eu/legal-content/FR/TXT/?uri=CELEX:32006R0561',
        ref_legale: 'CE 561/2006 Art.6', _source: 'fix-engine-v7', _semaine: keys[i]
      });
    }
  }

  for (var i = 0; i < keys.length - 1; i++) {
    var bi = round1(semaines[keys[i]].conduite_totale_h + semaines[keys[i+1]].conduite_totale_h);
    if (bi > SEUILS.CONDUITE_BIHEBDO_MAX_H) {
      var dep = round1(bi - SEUILS.CONDUITE_BIHEBDO_MAX_H);
      var cls = dep > 22.5 ? '5e classe' : '4e classe';
      result.push({
        regle: 'Conduite bi-hebdomadaire (CE 561/2006 Art.6 par.3)',
        limite: SEUILS.CONDUITE_BIHEBDO_MAX_H + 'h', constate: bi + 'h', depassement: dep + 'h', classe: cls,
        amende: cls === '5e classe' ?
          { amende_forfaitaire: 1500, amende_minoree: null, amende_majoree: null, amende_max: 3000, amende_recidive: null, classe: cls, texte: '1500 EUR' } :
          { amende_forfaitaire: 135, amende_minoree: 90, amende_majoree: 375, amende_max: 750, amende_recidive: null, classe: cls, texte: '135 EUR' },
        url_legale: 'https://eur-lex.europa.eu/legal-content/FR/TXT/?uri=CELEX:32006R0561',
        ref_legale: 'CE 561/2006 Art.6', _source: 'fix-engine-v7', _semaines: keys[i] + '+' + keys[i+1]
      });
    }
  }

  log('P5', 'Hebdo=' + result.length);
  return result;
}

// PHASE 6: Amendes
function phase6(infractions) {
  var ff = 0, fm = 0, c4 = 0, c5 = 0;
  for (var i = 0; i < infractions.length; i++) {
    var a = infractions[i].amende;
    if (a) {
      ff += parseNum(a.amende_forfaitaire);
      fm += parseNum(a.amende_majoree);
      if ((infractions[i].classe || '').indexOf('5e') >= 0) c5++; else c4++;
    }
  }
  var est = fm > 0 ? fm : ff;
  log('P6', 'Forfaitaire=' + ff + ' Majoree=' + fm + ' Estimee=' + est);
  return { totalForfaitaire: ff, totalMajoree: fm, amendeEstimee: est, count4e: c4, count5e: c5 };
}

// PHASE 7: Score
function phase7(infractions, joursActifs) {
  var n = infractions.length;
  var n5 = 0;
  for (var i = 0; i < infractions.length; i++) {
    if ((infractions[i].classe || '').indexOf('5e') >= 0) n5++;
  }
  // Score = 100 - nbInfractions - (nb5eClasse * 0.5)
  // 30 infractions dont 8 x 5e = 100 - 22.5 - 2 = 75.5%
  // 35 infractions dont 10 x 5e = 100 - 26.25 - 2.5 = 71.25%
  // 25 infractions dont 5 x 5e = 100 - 18.75 - 1.25 = 80%
  var penaliteBase = n * 0.75; var penalite5e = n5 * 0.25; var score = Math.max(0, Math.min(100, Math.round(100 - penaliteBase - penalite5e)));
  log('P7', 'Infractions=' + n + ' 5eClasse=' + n5 + ' Score=' + score);
  return score;
}

// MAIN
function corrigerResultat(resultat) {
  if (!resultat || !resultat.details_jours || !resultat.infractions) return resultat;

  LOG.length = 0;
  log('MAIN', 'FIX-ENGINE V10 (7.6.9.7) START infractions=' + resultat.infractions.length);

  try {
    var p1 = phase1(resultat.details_jours);
    var reposHebdos = phase2(resultat.details_jours);
    var p3 = phase3(resultat.details_jours);
    var p4 = phase4(resultat.infractions, p3.derogConduite, p3.derogTravail, resultat.details_jours);
    var hebdo = phase5(p3.semaines);
    // Phase 4b: Filtrer les repos journalier adjacents aux repos hebdo
    var joursRepos = {};
    for (var d = 0; d < resultat.details_jours.length; d++) {
      var dj = resultat.details_jours[d];
      var act = parseNum(dj.conduite_h) + parseNum(dj.travail_h);
      if (act < 0.5) joursRepos[dj.date] = true;
    }
    var p4bFiltered = [];
    var p4bRemoved = 0;
    for (var f = 0; f < p4.conservees.length; f++) {
      var infr = p4.conservees[f];
      var regle = infr.regle || '';
      if (/repos journalier/i.test(regle)) {
        // Extraire les dates du constate (format: 'Xh entre YYYY-MM-DD et YYYY-MM-DD')
        var dateMatch = (infr.constate || '').match(/(\d{4}-\d{2}-\d{2})/g);
        if (dateMatch && dateMatch.length >= 2) {
          var dateDebut = dateMatch[0];
          var dateFin = dateMatch[1];
          // Si l'une des dates est un jour de repos complet, c'est un overlap
          if ((joursRepos[dateDebut] || joursRepos[dateFin]) && parseNum(infr.constate) >= 7) {
            p4bRemoved++;
            log('P4b', 'Repos hebdo overlap: ' + infr.constate);
            continue; // Ne pas garder
          }
        }
      }
      p4bFiltered.push(infr);
    }
    log('P4b', 'Repos hebdo overlap: ' + p4bRemoved + ' retires');
    var finales = p4bFiltered.concat(hebdo);
    var amendes = phase6(finales);
    var actifs = 0;
    for (var i = 0; i < resultat.details_jours.length; i++) {
      if (parseNum(resultat.details_jours[i].conduite_h) + parseNum(resultat.details_jours[i].travail_h) > 0.5) actifs++;
    }
    var score = phase7(finales, actifs);

    log('MAIN', 'DONE orig=' + resultat.infractions.length + ' ret=' + (p4.retirees.length + p4bRemoved) + ' cons=' + p4bFiltered.length + ' hebdo=' + hebdo.length + ' final=' + finales.length + ' amende=' + amendes.amendeEstimee + ' score=' + score);

    resultat.infractions = finales;
    resultat.amende_estimee = amendes.amendeEstimee;
    resultat.score = score;
    resultat._fix_engine = {
      version: '7.6.10.1',
      date: new Date().toISOString(),
      originales: finales.length + p4.retirees.length,
      retirees: p4.retirees.length + p4bRemoved,
      conservees: p4bFiltered.length,
      hebdo: hebdo.length,
      finales: finales.length,
      repos_corriges: p1.corriges,
      jours_repos: p1.repos,
      repos_hebdos: reposHebdos.length,
      repos_hebdos_detail: reposHebdos,
      derog_conduite: p3.derogConduite,
      derog_travail: p3.derogTravail,
      amendes: amendes,
      score_details: { jours_actifs: actifs, jours_total: resultat.details_jours.length, score: score },
      log: LOG.slice(),
      retirees_detail: p4.retirees.map(function(r) {
        return { regle: r.regle, raison: r._raison, constate: r.constate, depassement: r.depassement };
      })
    };
    return resultat;
  } catch (err) {
    log('ERR', err.message);
    resultat._fix_engine = { version: '7.6.10.1', error: err.message, stack: err.stack, log: LOG.slice() };
    return resultat;
  }
}

module.exports = { corrigerResultat };
