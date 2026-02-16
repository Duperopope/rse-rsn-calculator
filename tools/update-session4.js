var fs = require('fs');

// === CLAUDE-updates.md ===
var journal = fs.readFileSync('CLAUDE-updates.md', 'utf8');
var entry = '\n## 2026-02-16 - Session 4\n' +
'- README.md reecrit et pousse (v7.25.1, 56 tests, 44 URLs, explications pedagogiques)\n' +
'- Convention README auto-update ajoutee dans CLAUDE.md section Git\n' +
'- Timeline : 5 iterations (v1 -> v5), conclusion = timeline clean sans moteur infraction\n' +
'  - v2: track 64px, fusion zones, bandes nuit\n' +
'  - v3: suppression double moteur, ajout stats chips\n' +
'  - v4: drapeaux backend style Tachogram (bugge: crash ecran noir, mauvais positionnement)\n' +
'  - v5: retour a l essentiel, zero drapeau, zero crash\n' +
'- Fix navigation InfractionCard -> Timeline (callback onNavigateTimeline via Calculator)\n' +
'- Lecon apprise: ne pas empiler des patches, repartir clean quand ca diverge\n' +
'- Lecon apprise: ne pas creer de moteur doublon cote client quand le backend fait deja le calcul\n' +
'- Lecon apprise: verifier les props multi-jours vs jour actif avant de passer des donnees\n' +
'- Prochaine session: timeline multi-jours intelligente (planifier UX avant de coder)\n' +
'- Source UX reference: tachogram.com (drapeaux au-dessus du track, couleurs par severite)\n' +
'- Commits: 2962c9b, 7a9135d, d449ae4, 2749746, 7b92795, 09bfda5, 32c8d1a, 8c33af6, 4567b97\n';

journal += entry;
fs.writeFileSync('CLAUDE-updates.md', journal, 'utf8');
console.log('Journal session 4 ajoute');

// === CLAUDE-current.md ===
var current = '# Tache en cours\n\n## Statut: AUCUNE TACHE EN COURS\n\n## Derniere tache terminee\n- Timeline v5 clean : blocs activites + tooltip + labels, zero moteur infraction\n- README a jour (v7.25.1)\n- Convention README auto-update en place\n\n## Prochaines priorites\n1. Timeline multi-jours intelligente (vue semaine/macro avec zoom jour)\n2. Mode exercice FIMO (scenarios predefininis, correction auto)\n3. Nettoyage code mort / vestiges des iterations timeline\n\n## Lecons session 4\n- Ne pas empiler des patches : repartir clean si ca diverge\n- Ne pas dupliquer le moteur backend cote client\n- Verifier structure donnees (multi-jours vs jour actif) avant de passer des props\n- Planifier UX AVANT de coder (reference: tachogram.com)\n';
fs.writeFileSync('CLAUDE-current.md', current, 'utf8');
console.log('CLAUDE-current.md mis a jour');

// === CLAUDE.md : ajouter les lecons dans conventions ===
var claude = fs.readFileSync('CLAUDE.md', 'utf8');
if (claude.indexOf('Lecons apprises') === -1) {
  var insertPoint = '## Outils QA';
  var lecons = '## Lecons apprises (conventions derivees)\n' +
'- Ne jamais creer de moteur de calcul doublon cote client : le backend est la source unique\n' +
'- Ne pas empiler des patches sur du code bugge : repartir clean\n' +
'- Toujours verifier si les donnees sont multi-jours ou jour unique avant de les passer en props\n' +
'- Planifier l UX (maquette, references) AVANT de coder une feature visuelle complexe\n' +
'- Reference UX tachygraphe : tachogram.com (standard industrie)\n\n';
  claude = claude.replace(insertPoint, lecons + insertPoint);
  fs.writeFileSync('CLAUDE.md', claude, 'utf8');
  console.log('Lecons ajoutees dans CLAUDE.md');
}
