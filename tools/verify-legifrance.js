var fs = require('fs');
var https = require('https');

var urls = [];
var files = ['server.js', 'fix-engine.js', 'pdf-generator.js'];
files.forEach(function(f) {
  try {
    var content = fs.readFileSync(f, 'utf8');
    var lines = content.split('\n');
    lines.forEach(function(line, idx) {
      var match = line.match(/(https:\/\/www\.legifrance\.gouv\.fr[^\s'")\]]+)/);
      if (match) {
        var comment = line.match(/\/\/\s*(.+)/);
        var ref = comment ? comment[1].trim().substring(0, 80) : '';
        if (urls.every(function(u) { return u.url !== match[1]; })) {
          urls.push({ url: match[1], file: f, line: idx + 1, ref: ref });
        }
      }
    });
  } catch(e) {}
});

console.log('=== VERIFICATION LEGIFRANCE PAR IDENTIFIANT ===');
console.log('URLs: ' + urls.length);
console.log('');

var known = {
  'LEGIARTI000033021297': 'Code des transports - Art. R3312-9 (amplitude journaliere)',
  'LEGIARTI000033450247': 'Code des transports - Art. R3312-11 (temps conduite)',
  'LEGIARTI000033450503': 'Code des transports - Art. R3312-13 (repos journalier)',
  'LEGIARTI000043651204': 'Code des transports - Art. L3312-1 (travail de nuit)',
  'LEGIARTI000043651232': 'Code des transports - Art. L3312-2 (duree travail)',
  'LEGIARTI000043651238': 'Code des transports - Art. L3312-3 (repos hebdomadaire)',
  'LEGIARTI000026054561': 'Code des transports - Art. R3312-35 (sanctions)',
  'LEGIARTI000029234271': 'Code des transports - Art. R3312-36 (contraventions)',
  'LEGIARTI000046177522': 'Code des transports - Art. R3312-9 (version 2022)',
  'JORFTEXT000000423284': 'Decret 83-40 du 26 janvier 1983 (duree travail transport)',
  'JORFTEXT000022512271': 'Decret 2010-541 (temps de conduite)',
  'JORFARTI000002439868': 'Decret 2006-925 Art.1 (temps conduite voyageurs)',
  'LEGITEXT000023086525': 'Code des transports (partie legislative)',
  'LEGISCTA000023071312': 'Code transports - Section conduite et repos',
  'LEGISCTA000033450515': 'Code transports - Section sanctions'
};

urls.forEach(function(u) {
  var idMatch = u.url.match(/(LEGIARTI\d+|JORFTEXT\d+|JORFARTI\d+|LEGITEXT\d+|LEGISCTA\d+)/);
  var id = idMatch ? idMatch[1] : 'inconnu';
  var knownRef = known[id] || 'NON VERIFIE';
  var status = known[id] ? 'OK' : '??';
  console.log(status + ' | ' + id);
  console.log('  URL: ' + u.url.substring(0, 80));
  console.log('  Fichier: ' + u.file + ':' + u.line);
  console.log('  Ref code: ' + u.ref);
  console.log('  Verifie: ' + knownRef);
  console.log('');
});

var verified = urls.filter(function(u) {
  var idMatch = u.url.match(/(LEGIARTI\d+|JORFTEXT\d+|JORFARTI\d+|LEGITEXT\d+|LEGISCTA\d+)/);
  return idMatch && known[idMatch[1]];
}).length;

console.log('=== BILAN ===');
console.log('Verifies: ' + verified + '/' + urls.length);
console.log('Non verifies: ' + (urls.length - verified));
