var fs = require('fs');
var card = fs.readFileSync('client/src/components/results/InfractionCard.jsx', 'utf8');

// Remplacer toute la fonction generateExplication
var start = card.indexOf('function generateExplication(inf)');
var end = card.indexOf('\nexport function InfractionCard(');

if (start === -1 || end === -1) {
  console.log('ERREUR: bornes non trouvees. start=' + start + ' end=' + end);
  process.exit(1);
}

var newFn = "function generateExplication(inf) {\n" +
"  var regle = (inf.regle || '').toLowerCase();\n" +
"  var limite = inf.limite || '';\n" +
"  var constate = inf.constate || inf.detail || '';\n" +
"\n" +
"  // Amplitude SLO (doit etre avant amplitude generale)\n" +
"  if (regle.indexOf('amplitude') !== -1 && regle.indexOf('slo') !== -1) {\n" +
"    var ampMatch = constate.match(/(\\d+\\.?\\d*)h/);\n" +
"    var ampVal = ampMatch ? ampMatch[1] + 'h' : '?';\n" +
"    return \"L'amplitude de votre journee atteint \" + ampVal + \". En service occasionnel ou SLO, si l'amplitude depasse 13h, une coupure de 3h consecutives ou de 2 fois 2h est obligatoire (R3312-11 al.2b). Cette coupure n'a pas ete respectee.\";\n" +
"  }\n" +
"  // Amplitude generale\n" +
"  if (regle.indexOf('amplitude') !== -1) {\n" +
"    return \"L'amplitude de votre journee (du debut de service a la fin) atteint \" + constate + \", depassant la limite de \" + limite + \". L'amplitude correspond a la duree entre la premiere et la derniere activite de la journee.\";\n" +
"  }\n" +
"  // Conduite continue\n" +
"  if (regle.indexOf('conduite continue') !== -1 || regle.indexOf('art.7') !== -1) {\n" +
"    return \"Vous avez conduit \" + constate + \" sans interruption suffisante. Le reglement CE 561/2006 (Art.7) impose une pause d'au moins 45 minutes apres \" + limite + \" de conduite continue. Cette pause peut etre fractionnee en 15 min puis 30 min minimum.\";\n" +
"  }\n" +
"  // Conduite journaliere\n" +
"  if (regle.indexOf('conduite journali') !== -1) {\n" +
"    return \"Le temps de conduite total sur cette journee atteint \" + constate + \", au-dela de la limite de \" + limite + \". Le reglement CE 561/2006 (Art.6) autorise 9h par jour, extensible a 10h deux fois par semaine maximum.\";\n" +
"  }\n" +
"  // Conduite hebdomadaire\n" +
"  if (regle.indexOf('conduite hebdo') !== -1 && regle.indexOf('bi') === -1) {\n" +
"    return \"Sur cette semaine, le cumul de conduite atteint \" + constate + \" pour une limite de \" + limite + \". Le reglement CE 561/2006 (Art.6) fixe un maximum de 56h de conduite par semaine.\";\n" +
"  }\n" +
"  // Bi-hebdomadaire\n" +
"  if (regle.indexOf('bi-hebdo') !== -1 || regle.indexOf('bihebdo') !== -1) {\n" +
"    return \"Sur deux semaines consecutives, le cumul de conduite atteint \" + constate + \" pour un maximum autorise de \" + limite + \". Le reglement CE 561/2006 (Art.6) limite a 90h sur toute periode de deux semaines.\";\n" +
"  }\n" +
"  // Repos journalier\n" +
"  if (regle.indexOf('repos journalier') !== -1 || regle.indexOf('repos quotidien') !== -1) {\n" +
"    var limVal = limite.replace(/minimum|minim\\.|min\\./gi, '').replace(/\\(|\\)/g, '').trim();\n" +
"    return \"Le temps de repos entre deux journees de travail est de \" + constate + \", inferieur au minimum requis de \" + limVal + \". Le reglement CE 561/2006 (Art.8) impose 11h de repos journalier normal, reductible a 9h maximum 3 fois entre deux repos hebdomadaires.\";\n" +
"  }\n" +
"  // Repos hebdomadaire\n" +
"  if (regle.indexOf('repos hebdo') !== -1) {\n" +
"    return \"Le repos hebdomadaire est insuffisant ou absent. Le reglement CE 561/2006 (Art.8) impose au minimum 45h de repos normal ou 24h en repos reduit, a compenser dans les 3 semaines suivantes.\";\n" +
"  }\n" +
"  // Repos reduits trop nombreux\n" +
"  if (regle.indexOf('repos reduit') !== -1 && regle.indexOf('trop') !== -1) {\n" +
"    return constate + \" au lieu du maximum de \" + limite + \". Entre deux repos hebdomadaires, vous ne pouvez prendre que 3 repos journaliers reduits (9h au lieu de 11h).\";\n" +
"  }\n" +
"  // Travail de nuit\n" +
"  if (regle.indexOf('nuit') !== -1 || regle.indexOf('21h') !== -1) {\n" +
"    return \"En periode de nuit (21h-6h), le temps de travail total ne doit pas depasser 10h par tranche de 24h. Ici, le travail total atteint \" + constate + \" pour une limite de \" + limite + \".\";\n" +
"  }\n" +
"  // Travail journalier\n" +
"  if (regle.indexOf('travail') !== -1 && regle.indexOf('journalier') !== -1) {\n" +
"    return \"Le temps de travail total (conduite + autres taches) atteint \" + constate + \" sur cette journee, depassant la limite de \" + limite + \". Le Code des transports distingue le temps de travail effectif du temps de conduite seul.\";\n" +
"  }\n" +
"  // Pause\n" +
"  if (regle.indexOf('pause') !== -1) {\n" +
"    return \"La pause cumulee est insuffisante. Apres \" + limite + \" de travail continu, une interruption est obligatoire. Ici : \" + constate + \".\";\n" +
"  }\n" +
"  return '';\n" +
"}\n";

card = card.substring(0, start) + newFn + card.substring(end);
fs.writeFileSync('client/src/components/results/InfractionCard.jsx', card, 'utf8');
console.log('OK - generateExplication reecrite');
