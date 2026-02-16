var fs = require('fs');
var https = require('https');
function sleep(ms) { return new Promise(function(r) { setTimeout(r, ms); }); }

var API_KEY = '';
try {
  var envFile = fs.readFileSync('.env', 'utf8');
  var match = envFile.match(/MAMMOUTH_API_KEY=([^\n\r]+)/);
  if (match) API_KEY = match[1].trim();
} catch(e) {}
if (!API_KEY) { console.log('ERREUR: MAMMOUTH_API_KEY absent'); process.exit(1); }

var dir = process.env.HOME + '/fimo-screenshots/audit-expert';
var imageFiles = [
  { name: 'Accueil (tour guide)', file: '01-accueil.png' },
  { name: 'Saisie vide', file: '02-saisie-vide.png' },
  { name: 'Saisie remplie (10h)', file: '03-saisie.png' },
  { name: 'Resultats', file: '04-resultats.png' },
  { name: 'Timeline jour', file: '05-timeline-jour.png' },
  { name: 'Timeline semaine', file: '06-timeline-semaine.png' }
];

var imageContents = [];
imageFiles.forEach(function(img) {
  var p = dir + '/' + img.file;
  if (fs.existsSync(p)) {
    var b64 = fs.readFileSync(p).toString('base64');
    imageContents.push({
      type: 'image_url',
      image_url: { url: 'data:image/png;base64,' + b64 }
    });
    imageContents.push({
      type: 'text',
      text: 'Ecran: ' + img.name
    });
    console.log('  Image: ' + img.file + ' (' + Math.round(b64.length / 1024) + 'KB b64)');
  } else {
    console.log('  ABSENT: ' + img.file);
  }
});

var contextText = {
  type: 'text',
  text: "Voici 6 screenshots de l'app mobile FIMO Check (dark mode, 375x812px, React+Node.js). Contexte: verification conformite temps de conduite/repos chauffeurs routiers (CE 561/2006 + Decret 2006-925). Fonctionnalites: saisie activites, timeline 24h, analyse backend, score conformite, infractions avec amendes, export PDF, historique, tour guide interactif. Analyse ces ecrans selon ton expertise. Sois exigeant, concret et actionnable."
};

var userContent = [contextText].concat(imageContents);

function callExpert(model, systemPrompt, temp) {
  return new Promise(function(resolve) {
    var data = JSON.stringify({
      model: model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent }
      ],
      max_tokens: 3000,
      temperature: temp
    });
    console.log('  Payload: ' + Math.round(data.length / 1024) + 'KB');
    var options = {
      hostname: 'api.mammouth.ai', port: 443,
      path: '/v1/chat/completions', method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + API_KEY,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    };
    var req = https.request(options, function(res) {
      var body = '';
      res.on('data', function(c) { body += c; });
      res.on('end', function() {
        try {
          var j = JSON.parse(body);
          if (j.choices && j.choices[0]) {
            resolve({ content: j.choices[0].message.content, usage: j.usage || {} });
          } else {
            resolve({ content: 'ERREUR: ' + body.substring(0, 400), usage: {} });
          }
        } catch(e) { resolve({ content: 'ERREUR PARSE: ' + body.substring(0, 300), usage: {} }); }
      });
    });
    req.on('error', function(e) { resolve({ content: 'ERREUR RESEAU: ' + e.message, usage: {} }); });
    req.write(data); req.end();
  });
}

var experts = JSON.parse(fs.readFileSync('tools/experts-config.json', 'utf8'));

(async function() {
  console.log('\n========================================');
  console.log('  AUDIT MULTI-EXPERT VISION — FIMO Check');
  console.log('  Screenshots en base64 + 3 top models');
  console.log('========================================\n');

  var totalCost = 0;
  for (var i = 0; i < experts.length; i++) {
    var e = experts[i];
    var temp = (e.model === 'gpt-5.2-chat') ? 1 : 0.3;
    console.log('[' + (i+1) + '/3] ' + e.name + ' (' + e.model + ')...');
    var r = await callExpert(e.model, e.system, temp);
    var inT = r.usage.prompt_tokens || 0;
    var outT = r.usage.completion_tokens || 0;
    var cost = (inT / 1000000 * e.costIn) + (outT / 1000000 * e.costOut);
    totalCost += cost;
    console.log('\n' + '='.repeat(55));
    console.log('  ' + e.name);
    console.log('  ' + e.model + ' | ' + inT + ' in / ' + outT + ' out | ~' + cost.toFixed(4) + '$');
    console.log('='.repeat(55));
    console.log(r.content);
    console.log('');
  }
  console.log('========================================');
  console.log('  COUT TOTAL: ~' + totalCost.toFixed(4) + '$');
  console.log('========================================');
})();
