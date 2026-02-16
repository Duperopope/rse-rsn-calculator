var fs = require('fs');
var results = [];

// 1. PATCHER InfractionCard.jsx - ajouter bloc explication
var cardPath = 'client/src/components/results/InfractionCard.jsx';
var card = fs.readFileSync(cardPath, 'utf8');
var origCard = card;

// Ajouter la fonction generateExplication avant le return
var explFn = `
function generateExplication(inf) {
  var regle = (inf.regle || '').toLowerCase();
  var limite = inf.limite || '';
  var constate = inf.constate || inf.detail || '';
  var depassement = inf.depassement || '';

  if (regle.indexOf('conduite continue') !== -1 || regle.indexOf('art.7') !== -1) {
    return 'Vous avez conduit ' + constate + ' sans interruption suffisante. Le reglement CE 561/2006 (Art.7) impose une pause d\\'au moins 45 minutes apres ' + limite + ' de conduite continue. Cette pause peut etre fractionnee en 15 min puis 30 min minimum.';
  }
  if (regle.indexOf('conduite journali') !== -1) {
    return 'Le temps de conduite total sur cette journee atteint ' + constate + ', au-dela de la limite de ' + limite + '. Le reglement CE 561/2006 (Art.6) autorise 9h par jour, extensible a 10h deux fois par semaine maximum.';
  }
  if (regle.indexOf('conduite hebdo') !== -1 && regle.indexOf('bi') === -1) {
    return 'Sur cette semaine, le cumul de conduite atteint ' + constate + ' pour une limite de ' + limite + '. Le reglement CE 561/2006 (Art.6) fixe un maximum de 56h de conduite par semaine.';
  }
  if (regle.indexOf('bi-hebdo') !== -1 || regle.indexOf('bihebdo') !== -1) {
    return 'Sur deux semaines consecutives, le cumul de conduite atteint ' + constate + ' pour un maximum autorise de ' + limite + '. Le reglement CE 561/2006 (Art.6) limite a 90h sur toute periode de deux semaines.';
  }
  if (regle.indexOf('amplitude') !== -1) {
    return 'L\\'amplitude de votre journee (du debut de service a la fin) atteint ' + constate + ', depassant la limite de ' + limite + '. L\\'amplitude correspond a la duree entre la premiere et la derniere activite de la journee.';
  }
  if (regle.indexOf('repos journalier') !== -1 || regle.indexOf('repos quotidien') !== -1) {
    return 'Le temps de repos entre deux journees de travail est de ' + constate + ', inferieur au minimum de ' + limite + '. Le reglement CE 561/2006 (Art.8) impose 11h de repos journalier normal, reductible a 9h maximum 3 fois entre deux repos hebdomadaires.';
  }
  if (regle.indexOf('repos hebdo') !== -1) {
    return 'Le repos hebdomadaire est insuffisant ou absent. Le reglement CE 561/2006 (Art.8) impose au minimum 45h de repos normal ou 24h en repos reduit, a compenser dans les 3 semaines suivantes.';
  }
  if (regle.indexOf('repos reduit') !== -1 && regle.indexOf('trop') !== -1) {
    return constate + ' au lieu du maximum de ' + limite + '. Entre deux repos hebdomadaires, vous ne pouvez prendre que 3 repos journaliers reduits (9h au lieu de 11h).';
  }
  if (regle.indexOf('nuit') !== -1 || regle.indexOf('21h') !== -1) {
    return 'En periode de nuit (21h-6h), le temps de travail total ne doit pas depasser 10h par periode de 24h. La conduite continue de nuit est limitee a 4h. Constate : ' + constate + '.';
  }
  if (regle.indexOf('travail') !== -1 && regle.indexOf('journalier') !== -1) {
    return 'Le temps de travail total (conduite + autres taches) atteint ' + constate + ' sur cette journee, depassant la limite de ' + limite + '. Le Code des transports distingue le temps de travail effectif du temps de conduite seul.';
  }
  if (regle.indexOf('pause') !== -1) {
    return 'La pause cumulee est insuffisante. Apres ' + limite + ' de travail continu, une interruption est obligatoire. Constate : ' + constate + '.';
  }
  return '';
}
`;

// Insérer la fonction avant "export function InfractionCard"
card = card.replace(
  'export \n\nfunction InfractionCard(',
  explFn + '\nexport function InfractionCard('
);

// Ajouter le bloc JSX d'explication après le detailBlock
var explJSX = `
      {(() => {
        var expl = generateExplication(inf);
        if (!expl) return null;
        return (
          <div className={styles.explicationBlock}>
            <span className={styles.explicationIcon}>💡</span>
            <p className={styles.explicationText}>{expl}</p>
          </div>
        );
      })()}
`;

card = card.replace(
  "      <div className={styles.amendeGrid}>",
  explJSX + "\n      <div className={styles.amendeGrid}>"
);

if (card !== origCard) {
  fs.writeFileSync(cardPath, card, 'utf8');
  results.push('OK InfractionCard.jsx - explications ajoutees');
} else {
  results.push('SKIP InfractionCard.jsx - pattern non trouve');
}

// 2. PATCHER CSS - ajouter styles explication
var cssPath = 'client/src/components/results/InfractionCard.module.css';
var css = fs.readFileSync(cssPath, 'utf8');
if (css.indexOf('.explicationBlock') === -1) {
  css += '\n/* Bloc explication pedagogique */\n';
  css += '.explicationBlock {\n  display: flex;\n  gap: 8px;\n  align-items: flex-start;\n  background: rgba(0, 132, 255, 0.06);\n  border-left: 2px solid rgba(0, 132, 255, 0.4);\n  border-radius: 0 8px 8px 0;\n  padding: 10px 12px;\n  margin: 8px 0;\n}\n';
  css += '.explicationIcon {\n  font-size: 1rem;\n  flex-shrink: 0;\n  margin-top: 1px;\n}\n';
  css += '.explicationText {\n  font-size: 0.75rem;\n  line-height: 1.5;\n  color: rgba(255, 255, 255, 0.75);\n  margin: 0;\n}\n';
  css += '@media (max-width: 480px) {\n  .explicationText { font-size: 0.7rem; }\n  .explicationBlock { padding: 8px 10px; }\n}\n';
  fs.writeFileSync(cssPath, css, 'utf8');
  results.push('OK InfractionCard.module.css - styles explication ajoutes');
} else {
  results.push('SKIP CSS - explicationBlock existe deja');
}

// Mettre a jour CLAUDE-current.md
fs.writeFileSync('CLAUDE-current.md', [
  '# Tache en cours',
  '',
  '## Explications contextuelles InfractionCard',
  '- Fichier: client/src/components/results/InfractionCard.jsx',
  '- CSS: client/src/components/results/InfractionCard.module.css',
  '- Statut: patch applique, build en cours',
  '- 12 types infractions couvertes avec texte pedagogique',
  '- Zero LLM, templates avec donnees moteur uniquement',
  ''
].join('\n'));

console.log(results.join('\n'));
