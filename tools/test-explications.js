// Test simple : verifier que generateExplication retourne les bons textes
// en simulant les objets infraction cote serveur

var http = require('http');

// Appel API avec scenario infractional
var postData = JSON.stringify({
  csv: '2026-02-16;04:00;09:30;C\n2026-02-16;09:30;09:45;P\n2026-02-16;09:45;14:45;C\n2026-02-16;14:45;15:00;P\n2026-02-16;15:00;19:00;C\n2026-02-16;19:00;19:30;P\n2026-02-16;19:30;22:00;C',
  typeService: 'SLO',
  pays: 'FR',
  equipage: 'solo'
});

var req = http.request({
  hostname: 'localhost',
  port: 3001,
  path: '/api/analyze',
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(postData) }
}, function(res) {
  var data = '';
  res.on('data', function(c) { data += c; });
  res.on('end', function() {
    var result = JSON.parse(data);
    console.log('Score: ' + result.score);
    console.log('Infractions: ' + result.infractions.length);
    console.log('');

    // Simuler generateExplication cote Node
    result.infractions.forEach(function(inf, i) {
      var regle = (inf.regle || '').toLowerCase();
      var limite = inf.limite || '';
      var constate = inf.constate || inf.detail || '';
      var expl = '';

      if (regle.indexOf('conduite continue') !== -1 || regle.indexOf('art.7') !== -1) {
        expl = 'Vous avez conduit ' + constate + ' sans interruption suffisante. Le reglement CE 561/2006 (Art.7) impose une pause d\'au moins 45 minutes apres ' + limite + ' de conduite continue.';
      } else if (regle.indexOf('conduite journali') !== -1) {
        expl = 'Le temps de conduite total sur cette journee atteint ' + constate + ', au-dela de la limite de ' + limite + '.';
      } else if (regle.indexOf('amplitude') !== -1 && regle.indexOf('slo') !== -1) {
        expl = 'L\'amplitude de votre journee atteint ' + constate + '. En service SLO, une coupure de 3h continues ou 2x2h est obligatoire au-dela de 13h.';
      } else if (regle.indexOf('amplitude') !== -1) {
        expl = 'L\'amplitude de votre journee atteint ' + constate + ', depassant la limite de ' + limite + '.';
      } else if (regle.indexOf('nuit') !== -1) {
        expl = 'En periode de nuit (21h-6h), le temps de travail total ne doit pas depasser 10h. Constate : ' + constate + '.';
      } else if (regle.indexOf('repos journalier') !== -1) {
        expl = 'Le temps de repos entre deux journees est de ' + constate + ', inferieur au minimum de ' + limite + '.';
      }

      console.log('INF ' + (i+1) + ': ' + inf.regle);
      console.log('  Limite: ' + limite);
      console.log('  Constate: ' + constate);
      if (expl) {
        console.log('  EXPLICATION: ' + expl);
      } else {
        console.log('  EXPLICATION: AUCUNE (pattern non reconnu)');
        console.log('  -> regle lowercase: "' + regle + '"');
      }
      console.log('');
    });

    // Verifier le build: la fonction est-elle dans le JS compile?
    var fs = require('fs');
    var jsFiles = fs.readdirSync('client/dist/assets').filter(function(f) { return f.endsWith('.js'); });
    jsFiles.forEach(function(f) {
      var js = fs.readFileSync('client/dist/assets/' + f, 'utf8');
      if (js.indexOf('generateExplication') >= 0) {
        console.log('=== BUILD CHECK ===');
        console.log('generateExplication dans ' + f + ': OUI');
        console.log('explicationBlock dans ' + f + ': ' + (js.indexOf('explicationBlock') >= 0 ? 'OUI' : 'NON'));
        // Extraire un bout du code autour de generateExplication
        var idx = js.indexOf('generateExplication');
        console.log('Contexte: ...' + js.substring(idx - 20, idx + 80) + '...');
      }
    });
  });
});
req.write(postData);
req.end();
