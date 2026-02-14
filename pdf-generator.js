/**
 * pdf-generator.js - Generateur de rapport PDF
 * RSE/RSN Calculator v7.8.0
 * 
 * Utilise pdfkit pour generer un rapport professionnel
 * contenant: score, infractions, sanctions, fix-engine, recommandations
 * 
 * Sources reglementaires:
 * - CE 561/2006: https://eur-lex.europa.eu/legal-content/FR/TXT/HTML/?uri=CELEX:32006R0561
 * - UE 2024/1258: https://eur-lex.europa.eu/legal-content/FR/TXT/?uri=CELEX:02006R0561-20240522
 * - Code des transports: https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000033021297
 */

var PDFDocument = require('pdfkit');

// Couleurs du theme
var COLORS = {
  primary: '#1a1a2e',
  accent: '#00cc6a',
  red: '#cc3333',
  orange: '#cc8800',
  gray: '#666666',
  lightGray: '#999999',
  white: '#ffffff',
  black: '#000000',
  bgLight: '#f5f5fa',
  border: '#ccccdd'
};

function getScoreColor(score) {
  if (score >= 90) return COLORS.accent;
  if (score >= 70) return COLORS.orange;
  return COLORS.red;
}

function getScoreLabel(score) {
  if (score >= 90) return 'Conforme';
  if (score >= 70) return 'Attention requise';
  return 'Non conforme';
}

function formatMinutes(min) {
  if (typeof min !== 'number' || isNaN(min)) return '-';
  var h = Math.floor(min / 60);
  var m = Math.round(min % 60);
  if (h === 0) return m + ' min';
  if (m === 0) return h + 'h';
  return h + 'h' + (m < 10 ? '0' : '') + m;
}

function drawHorizontalLine(doc, y, width) {
  doc.strokeColor(COLORS.border).lineWidth(0.5);
  doc.moveTo(50, y).lineTo(50 + width, y).stroke();
}

function checkPageBreak(doc, needed) {
  if (doc.y + needed > doc.page.height - 60) {
    doc.addPage();
    return true;
  }
  return false;
}

/**
 * Genere un rapport PDF a partir des donnees d'analyse
 * @param {Object} resultat - Objet resultat de /api/analyze
 * @param {Object} options - Options supplementaires (typeService, pays, etc.)
 * @returns {PDFDocument} Stream PDF
 */
function genererRapportPDF(resultat, options) {
  options = options || {};
  
  var doc = new PDFDocument({
    size: 'A4',
    margins: { top: 50, bottom: 50, left: 50, right: 50 },
    info: {
      Title: 'Rapport RSE/RSN - Analyse temps de conduite',
      Author: 'RSE/RSN Calculator v7.8.0',
      Subject: 'Conformite reglementaire transport routier',
      Creator: 'RSE/RSN Calculator - Samir Medjaher'
    }
  });
  
  var pageWidth = doc.page.width - 100;
  var score = resultat.score || 0;
  var infractions = resultat.infractions || [];
  var avertissements = resultat.avertissements || [];
  var stats = resultat.statistiques || {};
  var amende = resultat.amende_estimee || 0;
  var periode = resultat.periode || '';
  var equipage = resultat.equipage || 'solo';
  var fixEngine = resultat._fix_engine || null;
  var details = resultat.details_jours || [];
  var typeService = options.typeService || 'REGULIER';
  var pays = options.pays || 'FR';
  
  // ========================================
  // EN-TETE
  // ========================================
  doc.fontSize(22).font('Helvetica-Bold').fillColor(COLORS.primary);
  doc.text('RAPPORT D\'ANALYSE RSE/RSN', 50, 50, { align: 'center', width: pageWidth });
  
  doc.fontSize(11).font('Helvetica').fillColor(COLORS.gray);
  doc.text('Conformite temps de conduite - Transport routier de personnes', 50, 78, { align: 'center', width: pageWidth });
  
  doc.moveDown(0.5);
  drawHorizontalLine(doc, doc.y, pageWidth);
  doc.moveDown(0.5);
  
  // Informations generales
  var dateRapport = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
  var heureRapport = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  
  doc.fontSize(9).font('Helvetica').fillColor(COLORS.gray);
  doc.text('Date du rapport : ' + dateRapport + ' a ' + heureRapport, 50, doc.y);
  doc.text('Periode analysee : ' + (periode || 'Non specifiee'), 50, doc.y + 2);
  doc.text('Type de service : ' + typeService + ' | Pays : ' + pays + ' | Equipage : ' + equipage, 50, doc.y + 2);
  doc.text('Jours analyses : ' + details.length + ' | Generateur : RSE/RSN Calculator v7.8.0', 50, doc.y + 2);
  
  doc.moveDown(1);
  
  // ========================================
  // SCORE PRINCIPAL
  // ========================================
  var scoreColor = getScoreColor(score);
  var scoreLabel = getScoreLabel(score);
  var scoreY = doc.y;
  
  // Fond du bloc score
  doc.roundedRect(50, scoreY, pageWidth, 70, 8).fillColor('#f0f0f8').fill();
  
  // Score chiffre
  doc.fontSize(36).font('Helvetica-Bold').fillColor(scoreColor);
  doc.text(score + '%', 70, scoreY + 12, { width: 120, align: 'center' });
  
  // Label et details
  doc.fontSize(14).font('Helvetica-Bold').fillColor(scoreColor);
  doc.text(scoreLabel, 200, scoreY + 10);
  
  doc.fontSize(10).font('Helvetica').fillColor(COLORS.gray);
  doc.text(infractions.length + ' infraction(s), ' + avertissements.length + ' avertissement(s)', 200, scoreY + 30);
  
  if (amende > 0) {
    doc.fontSize(11).font('Helvetica-Bold').fillColor(COLORS.red);
    doc.text('Amende estimee : ' + amende.toLocaleString('fr-FR') + ' EUR', 200, scoreY + 46);
  } else {
    doc.fontSize(11).font('Helvetica-Bold').fillColor(COLORS.accent);
    doc.text('Aucune amende', 200, scoreY + 46);
  }
  
  doc.y = scoreY + 80;
  
  // ========================================
  // STATISTIQUES
  // ========================================
  if (stats.conduite_totale_h) {
    checkPageBreak(doc, 80);
    doc.fontSize(13).font('Helvetica-Bold').fillColor(COLORS.primary);
    doc.text('STATISTIQUES GLOBALES', 50, doc.y);
    doc.moveDown(0.3);
    
    var statsData = [
      ['Conduite totale', (stats.conduite_totale_h || 0) + 'h'],
      ['Autre travail', (stats.travail_autre_total_h || 0) + 'h'],
      ['Pauses', (stats.pause_totale_h || 0) + 'h'],
      ['Disponibilite', (stats.disponibilite_totale_h || 0) + 'h'],
      ['Moy. conduite/jour', (stats.moyenne_conduite_jour_h || 0) + 'h'],
      ['Moy. travail/jour', (stats.moyenne_travail_total_jour_h || 0) + 'h']
    ];
    
    var colWidth = pageWidth / 3;
    var startY = doc.y;
    
    for (var si = 0; si < statsData.length; si++) {
      var col = si % 3;
      var row = Math.floor(si / 3);
      var sx = 50 + (col * colWidth);
      var sy = startY + (row * 20);
      
      doc.fontSize(9).font('Helvetica').fillColor(COLORS.gray);
      doc.text(statsData[si][0] + ' : ', sx, sy, { continued: true, width: colWidth });
      doc.font('Helvetica-Bold').fillColor(COLORS.primary);
      doc.text(statsData[si][1]);
    }
    
    doc.y = startY + (Math.ceil(statsData.length / 3) * 20) + 5;
    drawHorizontalLine(doc, doc.y, pageWidth);
    doc.moveDown(0.5);
  }
  
  // ========================================
  // FIX-ENGINE
  // ========================================
  if (fixEngine && !fixEngine.error && fixEngine.retirees > 0) {
    checkPageBreak(doc, 80);
    doc.fontSize(13).font('Helvetica-Bold').fillColor(COLORS.primary);
    doc.text('CORRECTION INTELLIGENTE (Fix-Engine v' + (fixEngine.version || '?') + ')', 50, doc.y);
    doc.moveDown(0.3);
    
    var originales = fixEngine.originales || 0;
    var retirees = fixEngine.retirees || 0;
    var finales = fixEngine.finales || 0;
    var tauxFiltrage = originales > 0 ? Math.round((retirees / originales) * 100) : 0;
    
    doc.fontSize(10).font('Helvetica').fillColor(COLORS.gray);
    doc.text('Infractions brutes detectees : ' + originales, 70, doc.y);
    doc.text('Faux positifs retires : ' + retirees + ' (-' + tauxFiltrage + '%)', 70, doc.y + 2);
    doc.text('Infractions finales retenues : ' + finales, 70, doc.y + 2);
    
    if (fixEngine.repos_corriges > 0) {
      doc.text('Repos recalcules : ' + fixEngine.repos_corriges, 70, doc.y + 2);
    }
    
    // Detail des corrections
    var detail = fixEngine.retirees_detail || [];
    if (detail.length > 0) {
      doc.moveDown(0.3);
      doc.fontSize(9).font('Helvetica-Bold').fillColor(COLORS.gray);
      doc.text('Detail des corrections :', 70, doc.y);
      
      var raisonsMap = {};
      detail.forEach(function(d) {
        var r = d.raison || 'autre';
        if (!raisonsMap[r]) raisonsMap[r] = 0;
        raisonsMap[r]++;
      });
      
      var raisonLabels = {
        'faux_positif_0h': 'Faux positif (valeur 0h)',
        'faux_positif_estimation': 'Estimation imprecise',
        'ancien_fixengine': 'Regle obsolete',
        'doublon': 'Doublon',
        'seuil_minimal': 'Sous le seuil',
        'autre': 'Autre'
      };
      
      Object.keys(raisonsMap).forEach(function(raison) {
        var label = raisonLabels[raison] || raison;
        doc.fontSize(8).font('Helvetica').fillColor(COLORS.lightGray);
        doc.text('  - ' + label + ' : ' + raisonsMap[raison], 80, doc.y + 1);
      });
    }
    
    doc.moveDown(0.5);
    drawHorizontalLine(doc, doc.y, pageWidth);
    doc.moveDown(0.5);
  }
  
  // ========================================
  // INFRACTIONS
  // ========================================
  if (infractions.length > 0) {
    checkPageBreak(doc, 40);
    doc.fontSize(13).font('Helvetica-Bold').fillColor(COLORS.red);
    doc.text('INFRACTIONS (' + infractions.length + ')', 50, doc.y);
    doc.moveDown(0.3);
    
    infractions.forEach(function(inf, idx) {
      checkPageBreak(doc, 60);
      
      var infY = doc.y;
      
      // Numero + regle
      doc.fontSize(10).font('Helvetica-Bold').fillColor(COLORS.primary);
      doc.text((idx + 1) + '. ' + (inf.regle || 'Infraction'), 60, infY, { width: pageWidth - 120 });
      
      // Classe
      var classe = inf.classe || '';
      if (classe) {
        doc.fontSize(8).font('Helvetica').fillColor(COLORS.red);
        doc.text(classe, 60 + pageWidth - 120, infY, { width: 100, align: 'right' });
      }
      
      // Details
      var detailY = doc.y + 2;
      doc.fontSize(9).font('Helvetica').fillColor(COLORS.gray);
      
      if (inf.message || inf.description) {
        doc.text(inf.message || inf.description, 70, detailY, { width: pageWidth - 40 });
        detailY = doc.y + 1;
      }
      
      var infoLine = [];
      if (inf.limite) infoLine.push('Limite : ' + inf.limite);
      if (inf.constate) infoLine.push('Constate : ' + inf.constate);
      if (inf.depassement) infoLine.push('Depassement : ' + inf.depassement);
      if (inf.date) infoLine.push('Date : ' + inf.date);
      
      if (infoLine.length > 0) {
        doc.fontSize(8).font('Helvetica').fillColor(COLORS.lightGray);
        doc.text(infoLine.join(' | '), 70, detailY, { width: pageWidth - 40 });
      }
      
      // Amende
      if (inf.amende_forfaitaire) {
        doc.fontSize(8).font('Helvetica-Bold').fillColor(COLORS.red);
        doc.text('Amende forfaitaire : ' + inf.amende_forfaitaire + ' EUR', 70, doc.y + 1);
      }
      
      // Reference legale
      if (inf.ref_legale) {
        doc.fontSize(7).font('Helvetica-Oblique').fillColor(COLORS.lightGray);
        doc.text('Ref: ' + inf.ref_legale, 70, doc.y + 1);
      }
      
      doc.moveDown(0.4);
    });
    
    drawHorizontalLine(doc, doc.y, pageWidth);
    doc.moveDown(0.5);
  }
  
  // ========================================
  // AVERTISSEMENTS
  // ========================================
  if (avertissements.length > 0) {
    checkPageBreak(doc, 40);
    doc.fontSize(13).font('Helvetica-Bold').fillColor(COLORS.orange);
    doc.text('AVERTISSEMENTS (' + avertissements.length + ')', 50, doc.y);
    doc.moveDown(0.3);
    
    avertissements.forEach(function(av, idx) {
      checkPageBreak(doc, 35);
      
      doc.fontSize(9).font('Helvetica-Bold').fillColor(COLORS.primary);
      doc.text((idx + 1) + '. ' + (av.regle || 'Avertissement'), 60, doc.y, { width: pageWidth - 20 });
      
      if (av.message || av.description) {
        doc.fontSize(8).font('Helvetica').fillColor(COLORS.gray);
        doc.text(av.message || av.description, 70, doc.y + 1, { width: pageWidth - 40 });
      }
      
      doc.moveDown(0.3);
    });
    
    drawHorizontalLine(doc, doc.y, pageWidth);
    doc.moveDown(0.5);
  }
  
  // ========================================
  // DETAIL PAR JOUR (resume)
  // ========================================
  if (details.length > 0 && details.length <= 60) {
    checkPageBreak(doc, 40);
    doc.fontSize(13).font('Helvetica-Bold').fillColor(COLORS.primary);
    doc.text('DETAIL PAR JOUR (' + details.length + ' jour(s))', 50, doc.y);
    doc.moveDown(0.3);
    
    // En-tete tableau
    var tableY = doc.y;
    var cols = [
      { label: 'Date', width: 75, x: 50 },
      { label: 'Conduite', width: 55, x: 125 },
      { label: 'Travail', width: 50, x: 180 },
      { label: 'Pause', width: 45, x: 230 },
      { label: 'Amplitude', width: 55, x: 275 },
      { label: 'Repos', width: 45, x: 330 },
      { label: 'Infractions', width: 175, x: 375 }
    ];
    
    // Header
    doc.fontSize(7).font('Helvetica-Bold').fillColor(COLORS.primary);
    cols.forEach(function(c) {
      doc.text(c.label, c.x, tableY, { width: c.width });
    });
    
    tableY = doc.y + 3;
    drawHorizontalLine(doc, tableY, pageWidth);
    tableY += 3;
    
    details.forEach(function(jour) {
      if (tableY + 14 > doc.page.height - 60) {
        doc.addPage();
        tableY = 50;
        // Re-header
        doc.fontSize(7).font('Helvetica-Bold').fillColor(COLORS.primary);
        cols.forEach(function(c) { doc.text(c.label, c.x, tableY, { width: c.width }); });
        tableY = doc.y + 3;
        drawHorizontalLine(doc, tableY, pageWidth);
        tableY += 3;
      }
      
      var hasInf = jour.infractions && jour.infractions.length > 0;
      var textColor = hasInf ? COLORS.red : COLORS.gray;
      
      doc.fontSize(7).font('Helvetica').fillColor(textColor);
      doc.text(jour.date || '-', cols[0].x, tableY, { width: cols[0].width });
      doc.text((jour.conduite_h || 0) + 'h', cols[1].x, tableY, { width: cols[1].width });
      doc.text((jour.travail_h || 0) + 'h', cols[2].x, tableY, { width: cols[2].width });
      doc.text((jour.pause_h || 0) + 'h', cols[3].x, tableY, { width: cols[3].width });
      doc.text((jour.amplitude_estimee_h || 0) + 'h', cols[4].x, tableY, { width: cols[4].width });
      doc.text((jour.repos_estime_h || 0) + 'h', cols[5].x, tableY, { width: cols[5].width });
      
      if (hasInf) {
        var infNames = jour.infractions.map(function(i) { return i.regle || '?'; }).join(', ');
        doc.text(infNames, cols[6].x, tableY, { width: cols[6].width });
      } else {
        doc.fillColor(COLORS.accent).text('OK', cols[6].x, tableY, { width: cols[6].width });
      }
      
      tableY = doc.y + 3;
    });
    
    doc.y = tableY;
    doc.moveDown(0.5);
    drawHorizontalLine(doc, doc.y, pageWidth);
    doc.moveDown(0.5);
  }
  
  // ========================================
  // PIED DE PAGE - SOURCES
  // ========================================
  checkPageBreak(doc, 60);
  doc.fontSize(9).font('Helvetica-Bold').fillColor(COLORS.primary);
  doc.text('REFERENCES REGLEMENTAIRES', 50, doc.y);
  doc.moveDown(0.2);
  
  doc.fontSize(7).font('Helvetica').fillColor(COLORS.gray);
  doc.text('CE 561/2006 - Temps de conduite et repos des conducteurs', 60, doc.y);
  doc.text('  https://eur-lex.europa.eu/legal-content/FR/TXT/HTML/?uri=CELEX:32006R0561', 60, doc.y + 1);
  doc.text('UE 2024/1258 - Modification du reglement CE 561/2006 (transport occasionnel)', 60, doc.y + 3);
  doc.text('  https://eur-lex.europa.eu/legal-content/FR/TXT/?uri=CELEX:02006R0561-20240522', 60, doc.y + 1);
  doc.text('Code des transports - Art. L3312-1 (travail de nuit)', 60, doc.y + 3);
  doc.text('  https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000033021297', 60, doc.y + 1);
  
  doc.moveDown(1);
  drawHorizontalLine(doc, doc.y, pageWidth);
  doc.moveDown(0.3);
  
  doc.fontSize(7).font('Helvetica-Oblique').fillColor(COLORS.lightGray);
  doc.text('Ce rapport est genere automatiquement par RSE/RSN Calculator v7.8.0.', 50, doc.y, { align: 'center', width: pageWidth });
  doc.text('Il ne constitue pas un document officiel et ne remplace pas l\'avis d\'un expert en reglementation sociale.', 50, doc.y + 1, { align: 'center', width: pageWidth });
  doc.text('Auteur : Samir Medjaher | https://rse-rsn-calculator.onrender.com', 50, doc.y + 1, { align: 'center', width: pageWidth });
  
  return doc;
}

module.exports = { genererRapportPDF: genererRapportPDF };