var puppeteer = require('puppeteer-core');
var path = require('path');
var fs = require('fs');
var http = require('http');
var https = require('https');

var HOME = process.env.HOME || '/data/data/com.termux/files/home';
var SCREENSHOTS = path.join(HOME, 'fimo-screenshots');
var ENV_FILE = path.join(HOME, 'rse-rsn-calculator', '.env');

// Charger la cle API depuis .env
function loadApiKey() {
  try {
    var env = fs.readFileSync(ENV_FILE, 'utf8');
    var match = env.match(/MAMMOUTH_API_KEY=(.+)/);
    return match ? match[1].trim() : null;
  } catch(e) { return null; }
}

// Envoyer une image en base64 a Gemini Flash via Mammouth
function analyseScreenshot(apiKey, screenshotPath, context) {
  return new Promise(function(resolve, reject) {
    var imgBuffer = fs.readFileSync(screenshotPath);
    var base64 = imgBuffer.toString('base64');
    var sizeKB = Math.round(imgBuffer.length / 1024);

    var payload = JSON.stringify({
      model: 'claude-sonnet-4-5',
      messages: [
        {
          role: 'system',
          content: 'Tu es un expert QA frontend. Analyse ce screenshot d\'une app web de conformite transport (FIMO Check). Reponds en francais. Liste UNIQUEMENT les vrais bugs visuels: alignement casse, texte tronque/illisible, couleurs inaccessibles, boutons invisibles, elements qui se chevauchent, responsive casse. Ignore les elements volontairement petits comme les footers. Pour chaque bug, donne: 1) description precise 2) localisation dans la page 3) severite (critique/moyen/mineur). Si aucun bug, dis "AUCUN BUG VISUEL DETECTE". Termine par un verdict: PASS ou FAIL.'
        },
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Screenshot: ' + context + ' (' + sizeKB + ' KB)' },
            { type: 'image_url', image_url: { url: 'data:image/png;base64,' + base64 } }
          ]
        }
      ],
      max_tokens: 1000,
      temperature: 0.3
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
            var cost = json.usage && json.usage.cost ? json.usage.cost : 0;
            resolve({
              analysis: json.choices[0].message.content,
              tokens: json.usage ? json.usage.total_tokens : 0,
              cost: cost
            });
          } else {
            resolve({ analysis: 'ERREUR API: ' + data.substring(0, 200), tokens: 0, cost: 0 });
          }
        } catch(e) {
          resolve({ analysis: 'ERREUR PARSE: ' + e.message, tokens: 0, cost: 0 });
        }
      });
    });
    req.on('error', function(e) { resolve({ analysis: 'ERREUR RESEAU: ' + e.message, tokens: 0, cost: 0 }); });
    req.write(payload);
    req.end();
  });
}

function sleep(ms) { return new Promise(function(r) { setTimeout(r, ms); }); }

(async function() {
  var apiKey = loadApiKey();
  var totalCost = 0;
  var totalTokens = 0;
  var report = [];

  report.push('# FIMO Check — Rapport QA Visuel');
  report.push('Date: ' + new Date().toISOString().split('T')[0]);
  report.push('');

  try {
    // Demarrer Puppeteer
    var browser = await puppeteer.launch({
      executablePath: process.env.PREFIX + '/lib/chromium/chromium-launcher.sh',
      headless: true,
      args: ['--no-sandbox','--disable-gpu','--disable-setuid-sandbox','--single-process']
    });

    var page = await browser.newPage();

    // S'assurer que le dossier screenshots existe
    if (!fs.existsSync(SCREENSHOTS)) fs.mkdirSync(SCREENSHOTS, { recursive: true });

    // === DESKTOP ===
    await page.setViewport({ width: 1280, height: 900 });
    await page.goto('http://localhost:3001', { timeout: 20000, waitUntil: 'networkidle2' });
    await sleep(2000);

    // Fermer tour guide
    await page.evaluate(function() {
      var btns = Array.from(document.querySelectorAll('button'));
      var c = btns.find(function(b) { return b.getAttribute('aria-label') === 'Close' || b.textContent.indexOf('Passer') !== -1; });
      if (c) c.click();
    });
    await sleep(1000);

    var desktopPath = path.join(SCREENSHOTS, 'qa-desktop.png');
    await page.screenshot({ path: desktopPath, fullPage: true });
    report.push('## Desktop (1280x900)');

    // Analyse DOM desktop
    var btnDesktop = await page.evaluate(function() {
      var count = 0;
      Array.from(document.querySelectorAll('button')).forEach(function(b) {
        if (b.closest('.react-joyride')) return;
        var r = b.getBoundingClientRect();
        var s = window.getComputedStyle(b);
        if (s.display === 'none') return;
        if (r.width === 0 || r.height === 0) count++;
      });
      return count;
    });

    var tinyDesktop = await page.evaluate(function() {
      var count = 0;
      Array.from(document.querySelectorAll('span,p,label,h1,h2,h3,h4,a,div')).forEach(function(el) {
        if (el.closest('.react-joyride')) return;
        var s = window.getComputedStyle(el);
        if (s.display === 'none' || s.visibility === 'hidden') return;
        if (parseFloat(s.fontSize) < 10 && el.textContent.trim().length > 0 && el.textContent.trim().length < 50) count++;
      });
      return count;
    });

    report.push('DOM: ' + btnDesktop + ' boutons 0x0, ' + tinyDesktop + ' textes < 10px');

    // Analyse visuelle IA si cle disponible
    if (apiKey) {
      var r1 = await analyseScreenshot(apiKey, desktopPath, 'Accueil desktop 1280x900');
      report.push('');
      report.push('### Analyse IA (Gemini Flash)');
      report.push(r1.analysis);
      totalCost += r1.cost;
      totalTokens += r1.tokens;
    }

    // === MOBILE ===
    await page.setViewport({ width: 375, height: 812, isMobile: true });
    await page.reload({ waitUntil: 'networkidle2' });
    await sleep(2000);
    await page.evaluate(function() {
      var btns = Array.from(document.querySelectorAll('button'));
      var c = btns.find(function(b) { return b.getAttribute('aria-label') === 'Close' || b.textContent.indexOf('Passer') !== -1; });
      if (c) c.click();
    });
    await sleep(1000);

    var mobilePath = path.join(SCREENSHOTS, 'qa-mobile.png');
    await page.screenshot({ path: mobilePath, fullPage: true });
    report.push('');
    report.push('## Mobile (375x812)');

    var tinyMobile = await page.evaluate(function() {
      var count = 0;
      Array.from(document.querySelectorAll('span,p,label,a,button,div')).forEach(function(el) {
        if (el.closest('.react-joyride')) return;
        var s = window.getComputedStyle(el);
        if (s.display === 'none') return;
        if (parseFloat(s.fontSize) < 10 && el.textContent.trim().length > 0 && el.textContent.trim().length < 50) count++;
      });
      return count;
    });

    report.push('DOM: ' + tinyMobile + ' textes < 10px');

    if (apiKey) {
      var r2 = await analyseScreenshot(apiKey, mobilePath, 'Accueil mobile 375x812');
      report.push('');
      report.push('### Analyse IA (Gemini Flash)');
      report.push(r2.analysis);
      totalCost += r2.cost;
      totalTokens += r2.tokens;
    }

    await browser.close();

    // === RESUME ===
    report.push('');
    report.push('## Resume');
    report.push('Textes < 10px desktop: ' + tinyDesktop);
    report.push('Textes < 10px mobile: ' + tinyMobile);
    if (apiKey) {
      report.push('Tokens utilises: ' + totalTokens);
      report.push('Cout total: $' + totalCost.toFixed(6));
    } else {
      report.push('Analyse visuelle IA: DESACTIVEE (pas de cle API dans .env)');
    }

  } catch(e) {
    report.push('ERREUR: ' + e.message);
  }

  // Sauvegarder et afficher
  var output = report.join('\n');
  fs.writeFileSync(path.join(SCREENSHOTS, 'rapport-qa.md'), output, 'utf8');
  console.log(output);
})();
