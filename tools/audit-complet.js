var puppeteer = require('puppeteer-core');
var path = require('path');
var fs = require('fs');
var https = require('https');

var HOME = process.env.HOME || '/data/data/com.termux/files/home';
var SCREENSHOTS = path.join(HOME, 'fimo-screenshots');
var ENV_FILE = path.join(HOME, 'rse-rsn-calculator', '.env');

function loadApiKey() {
  try {
    var env = fs.readFileSync(ENV_FILE, 'utf8');
    var match = env.match(/MAMMOUTH_API_KEY=(.+)/);
    return match ? match[1].trim() : null;
  } catch(e) { return null; }
}

function sleep(ms) { return new Promise(function(r) { setTimeout(r, ms); }); }

function callAPI(apiKey, messages, maxTokens) {
  return new Promise(function(resolve, reject) {
    var payload = JSON.stringify({
      model: 'claude-sonnet-4-5',
      messages: messages,
      max_tokens: maxTokens || 1500,
      temperature: 0.2
    });
    var options = {
      hostname: 'api.mammouth.ai',
      port: 443,
      path: '/v1/chat/completions',
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + apiKey,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    };
    var req = https.request(options, function(res) {
      var data = '';
      res.on('data', function(chunk) { data += chunk; });
      res.on('end', function() {
        try {
          var json = JSON.parse(data);
          if (json.choices && json.choices[0]) {
            resolve({ text: json.choices[0].message.content, cost: json.usage ? json.usage.cost || 0 : 0 });
          } else {
            resolve({ text: 'ERREUR API: ' + data.substring(0, 200), cost: 0 });
          }
        } catch(e) { resolve({ text: 'ERREUR: ' + e.message, cost: 0 }); }
      });
    });
    req.on('error', function(e) { resolve({ text: 'ERREUR RESEAU: ' + e.message, cost: 0 }); });
    req.write(payload);
    req.end();
  });
}

(async function() {
  var apiKey = loadApiKey();
  if (!apiKey) { console.log('ERREUR: pas de cle API dans .env'); return; }

  var report = [];
  var totalCost = 0;
  var screenshots = [];

  if (!fs.existsSync(SCREENSHOTS)) fs.mkdirSync(SCREENSHOTS, { recursive: true });

  var browser = await puppeteer.launch({
    executablePath: process.env.PREFIX + '/lib/chromium/chromium-launcher.sh',
    headless: true,
    args: ['--no-sandbox','--disable-gpu','--disable-setuid-sandbox','--single-process']
  });

  var page = await browser.newPage();

  // ============================================
  // ETAPE 1 : PAGE D'ACCUEIL DESKTOP
  // ============================================
  await page.setViewport({ width: 1280, height: 900 });
  await page.goto('http://localhost:3001', { timeout: 20000, waitUntil: 'networkidle2' });
  await sleep(2000);
  await page.evaluate(function() {
    var btns = Array.from(document.querySelectorAll('button'));
    var c = btns.find(function(b) { return b.getAttribute('aria-label') === 'Close' || b.textContent.indexOf('Passer') !== -1; });
    if (c) c.click();
  });
  await sleep(1000);
  await page.screenshot({ path: path.join(SCREENSHOTS, 'audit-01-accueil.png'), fullPage: true });
  screenshots.push('audit-01-accueil.png');

  // ============================================
  // ETAPE 2 : REMPLIR UNE JOURNEE TYPE
  // ============================================
  var btnJourneeType = await page.evaluate(function() {
    var btns = Array.from(document.querySelectorAll('button'));
    var btn = btns.find(function(b) { return b.textContent.indexOf('Journee type') !== -1; });
    if (btn) { btn.click(); return true; }
    return false;
  });
  await sleep(1500);
  await page.screenshot({ path: path.join(SCREENSHOTS, 'audit-02-journee-remplie.png'), fullPage: true });
  screenshots.push('audit-02-journee-remplie.png');

  // ============================================
  // ETAPE 3 : LANCER L'ANALYSE
  // ============================================
  var btnAnalyse = await page.evaluate(function() {
    var btns = Array.from(document.querySelectorAll('button'));
    var btn = btns.find(function(b) { return b.textContent.indexOf('Analyser la conformite') !== -1 || b.textContent.indexOf('Analyser') !== -1; });
    if (btn && !btn.disabled) { btn.click(); return true; }
    return false;
  });
  await sleep(5000);
  await page.screenshot({ path: path.join(SCREENSHOTS, 'audit-03-resultats.png'), fullPage: true });
  screenshots.push('audit-03-resultats.png');

  // Recuperer les donnees affichees
  var pageData = await page.evaluate(function() {
    var body = document.body.innerText;
    var score = body.match(/Score[:\s]*(\d+)/i);
    var conduite = body.match(/Conduite[:\s]*([\d.,]+)/i);
    var repos = body.match(/Repos[:\s]*([\d.,]+)/i);
    var infractions = body.match(/Infraction/gi);
    var buttons = Array.from(document.querySelectorAll('button')).map(function(b) { return b.textContent.trim(); }).filter(function(t) { return t.length > 0 && t.length < 50; });
    return {
      score: score ? score[1] : 'non trouve',
      conduite: conduite ? conduite[1] : 'non trouve',
      repos: repos ? repos[1] : 'non trouve',
      nbInfractions: infractions ? infractions.length : 0,
      allButtons: buttons,
      bodyLength: body.length,
      hasResults: body.indexOf('Score') !== -1 || body.indexOf('Infraction') !== -1 || body.indexOf('Conduite') !== -1
    };
  });

  // ============================================
  // ETAPE 4 : SCROLLER POUR VOIR TOUT
  // ============================================
  await page.evaluate(function() { window.scrollTo(0, document.body.scrollHeight); });
  await sleep(1000);
  await page.screenshot({ path: path.join(SCREENSHOTS, 'audit-04-resultats-bas.png'), fullPage: false });
  screenshots.push('audit-04-resultats-bas.png');

  // ============================================
  // ETAPE 5 : MOBILE
  // ============================================
  await page.setViewport({ width: 375, height: 812, isMobile: true });
  await page.goto('http://localhost:3001', { timeout: 20000, waitUntil: 'networkidle2' });
  await sleep(2000);
  await page.evaluate(function() {
    var btns = Array.from(document.querySelectorAll('button'));
    var c = btns.find(function(b) { return b.getAttribute('aria-label') === 'Close' || b.textContent.indexOf('Passer') !== -1; });
    if (c) c.click();
  });
  await sleep(1000);

  // Remplir journee type sur mobile
  await page.evaluate(function() {
    var btns = Array.from(document.querySelectorAll('button'));
    var btn = btns.find(function(b) { return b.textContent.indexOf('Journee type') !== -1; });
    if (btn) btn.click();
  });
  await sleep(1500);

  // Analyser sur mobile
  await page.evaluate(function() {
    var btns = Array.from(document.querySelectorAll('button'));
    var btn = btns.find(function(b) { return b.textContent.indexOf('Analyser') !== -1 && b.textContent.indexOf('conformite') !== -1; });
    if (btn && !btn.disabled) btn.click();
  });
  await sleep(5000);
  await page.screenshot({ path: path.join(SCREENSHOTS, 'audit-05-mobile-resultats.png'), fullPage: true });
  screenshots.push('audit-05-mobile-resultats.png');

  // ============================================
  // ETAPE 6 : TEST API DIRECT
  // ============================================
  var apiTest = '';
  try {
    var http = require('http');
    apiTest = await new Promise(function(resolve) {
      http.get('http://localhost:3001/api/health', function(res) {
        var d = '';
        res.on('data', function(c) { d += c; });
        res.on('end', function() { resolve(d); });
      }).on('error', function(e) { resolve('ERREUR: ' + e.message); });
    });
  } catch(e) { apiTest = 'ERREUR: ' + e.message; }

  await browser.close();

  // ============================================
  // ANALYSE IA - Envoyer TOUS les screenshots
  // ============================================
  var imagesContent = [];
  imagesContent.push({ type: 'text', text: 'AUDIT COMPLET de l\'app FIMO Check. Voici ' + screenshots.length + ' screenshots dans l\'ordre du parcours utilisateur. Donnees extraites du DOM: ' + JSON.stringify(pageData) + '. API health: ' + apiTest });

  for (var i = 0; i < screenshots.length; i++) {
    var imgPath = path.join(SCREENSHOTS, screenshots[i]);
    var base64 = fs.readFileSync(imgPath).toString('base64');
    imagesContent.push({ type: 'text', text: 'Screenshot ' + (i+1) + ': ' + screenshots[i] });
    imagesContent.push({ type: 'image_url', image_url: { url: 'data:image/png;base64,' + base64 } });
  }

  var auditResult = await callAPI(apiKey, [
    {
      role: 'system',
      content: 'Tu es un auditeur d\'applications web. On te montre les screenshots d\'une app de conformite transport routier (FIMO Check) pour conducteurs professionnels. L\'app calcule la conformite aux reglements CE 561/2006 et Code du Transport francais.\n\nFais un audit HONNETE et COMPLET en francais pour un non-developpeur. Reponds a ces questions:\n\n1. PREMIERE IMPRESSION: L\'app a-t-elle l\'air professionnelle ou amateur? Note sur 10.\n2. PARCOURS UTILISATEUR: Le flux accueil -> remplissage -> analyse -> resultats est-il fluide et comprehensible?\n3. RESULTATS: Les informations affichees (score, infractions, repos, conduite) ont-elles l\'air coherentes et utiles?\n4. PROBLEMES VISUELS: Y a-t-il des bugs certains (texte coupe, elements casses, mise en page cassee)?\n5. MOBILE: L\'app est-elle utilisable sur telephone?\n6. CE QUI MANQUE: Qu\'est-ce qu\'un utilisateur professionnel (controleur transport, gestionnaire de flotte) attendrait et ne trouve pas?\n7. VERDICT: L\'app est-elle prete pour des utilisateurs reels? Note globale sur 10.\n\nSois direct et honnete. Pas de complaisance.'
    },
    { role: 'user', content: imagesContent }
  ], 2000);

  totalCost += auditResult.cost;

  report.push('# AUDIT COMPLET — FIMO Check');
  report.push('Date: ' + new Date().toISOString().split('T')[0]);
  report.push('Screenshots: ' + screenshots.length);
  report.push('Cout audit: $' + totalCost.toFixed(4));
  report.push('');
  report.push('## Donnees DOM extraites');
  report.push('Score: ' + pageData.score);
  report.push('Conduite: ' + pageData.conduite);
  report.push('Repos: ' + pageData.repos);
  report.push('Resultats affiches: ' + (pageData.hasResults ? 'OUI' : 'NON'));
  report.push('Boutons disponibles: ' + pageData.allButtons.join(', '));
  report.push('API health: ' + apiTest);
  report.push('');
  report.push('## Analyse IA (Claude Sonnet 4.5)');
  report.push(auditResult.text);

  var output = report.join('\n');
  fs.writeFileSync(path.join(SCREENSHOTS, 'audit-complet.md'), output, 'utf8');
  console.log(output);
})();
