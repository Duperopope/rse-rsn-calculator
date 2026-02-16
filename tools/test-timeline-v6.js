var puppeteer = require('puppeteer-core');
function sleep(ms) { return new Promise(function(r) { setTimeout(r, ms); }); }

(async function() {
  var browser = await puppeteer.launch({
    executablePath: process.env.PREFIX + '/lib/chromium/chromium-launcher.sh',
    headless: true,
    args: ['--no-sandbox', '--disable-gpu', '--disable-setuid-sandbox', '--single-process']
  });
  var page = await browser.newPage();
  await page.setViewport({ width: 375, height: 812, isMobile: true });
  await page.goto('http://localhost:3001', { timeout: 20000, waitUntil: 'networkidle2' });
  await sleep(3000);

  // Fermer tour
  await page.evaluate(function() {
    var b = Array.from(document.querySelectorAll('button')).find(function(x) { return x.textContent.includes('Passer'); });
    if (b) b.click();
  });
  await sleep(1000);

  // Charger journee longue
  await page.evaluate(function() {
    var b = Array.from(document.querySelectorAll('button')).find(function(x) { return x.textContent.includes('longue'); });
    if (b) b.click();
  });
  await sleep(1500);

  // Ouvrir dashboard
  await page.evaluate(function() {
    var chevrons = Array.from(document.querySelectorAll('button,[role="button"]')).filter(function(b) { return b.textContent.trim() === '\u25BC'; });
    if (chevrons.length) chevrons[0].click();
  });
  await sleep(1000);

  // === TEST 1 : Vue jour avec 1 seul jour ===
  var test1 = await page.evaluate(function() {
    var tl = document.querySelector('[data-tour="timeline"]');
    if (!tl) return { found: false };
    var vueSelector = tl.querySelectorAll('[class*="vueSelectorBtn"]');
    var track = tl.querySelector('[class*="track"]');
    var blocs = tl.querySelectorAll('[class*="bloc"]');
    var legende = tl.querySelectorAll('[class*="legendeItem"]');
    var nightBands = tl.querySelectorAll('[class*="nightBand"]');
    return {
      found: true,
      containerH: tl.offsetHeight,
      nbVueBtns: vueSelector.length,
      trackH: track ? track.offsetHeight : 0,
      nbBlocs: blocs.length,
      nbLegende: legende.length,
      nbNights: nightBands.length,
      hasVueSemaine: Array.from(vueSelector).some(function(b) { return b.textContent === 'Semaine'; })
    };
  });
  console.log('=== TEST 1: VUE JOUR (1 jour) ===');
  console.log(JSON.stringify(test1, null, 2));

  // Ajouter un 2e jour
  await page.evaluate(function() {
    var btn = Array.from(document.querySelectorAll('button')).find(function(b) { return b.textContent.includes('+') && b.textContent.toLowerCase().includes('jour'); });
    if (btn) btn.click();
  });
  await sleep(1000);

  // Ajouter un 3e jour
  await page.evaluate(function() {
    var btn = Array.from(document.querySelectorAll('button')).find(function(b) { return b.textContent.includes('+') && b.textContent.toLowerCase().includes('jour'); });
    if (btn) btn.click();
  });
  await sleep(1000);

  // Ouvrir dashboard encore
  await page.evaluate(function() {
    var chevrons = Array.from(document.querySelectorAll('button,[role="button"]')).filter(function(b) { return b.textContent.trim() === '\u25BC'; });
    if (chevrons.length) chevrons[0].click();
  });
  await sleep(1000);

  // === TEST 2 : Vue jour avec multi-jours (bouton semaine visible?) ===
  var test2 = await page.evaluate(function() {
    var tl = document.querySelector('[data-tour="timeline"]');
    if (!tl) return { found: false };
    var vueSelector = tl.querySelectorAll('[class*="vueSelectorBtn"]');
    var textes = Array.from(vueSelector).map(function(b) { return b.textContent; });
    return {
      found: true,
      nbVueBtns: vueSelector.length,
      vueBtnTextes: textes,
      hasVueSemaine: textes.indexOf('Semaine') !== -1
    };
  });
  console.log('\n=== TEST 2: MULTI-JOURS (boutons vue) ===');
  console.log(JSON.stringify(test2, null, 2));

  // Cliquer sur "Semaine" si disponible
  if (test2.hasVueSemaine) {
    await page.evaluate(function() {
      var tl = document.querySelector('[data-tour="timeline"]');
      var btns = tl.querySelectorAll('[class*="vueSelectorBtn"]');
      var semBtn = Array.from(btns).find(function(b) { return b.textContent === 'Semaine'; });
      if (semBtn) semBtn.click();
    });
    await sleep(1000);

    var test3 = await page.evaluate(function() {
      var tl = document.querySelector('[data-tour="timeline"]');
      if (!tl) return { found: false };
      var lignes = tl.querySelectorAll('[class*="semaineLigne"]');
      var barres = tl.querySelectorAll('[class*="semaineBarre"]');
      var header = tl.querySelector('[class*="semaineHeader"]');
      var activeLigne = tl.querySelector('[class*="semaineLigneActive"]');
      return {
        found: true,
        containerH: tl.offsetHeight,
        nbLignes: lignes.length,
        nbBarres: barres.length,
        headerText: header ? header.textContent : 'absent',
        hasActiveLigne: !!activeLigne,
        lignesTexts: Array.from(lignes).slice(0, 3).map(function(l) { return l.textContent.substring(0, 40); })
      };
    });
    console.log('\n=== TEST 3: VUE SEMAINE ===');
    console.log(JSON.stringify(test3, null, 2));
  }

  // Screenshot
  var fs = require('fs');
  var dir = process.env.HOME + '/fimo-screenshots';
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  
  var tl = await page.$('[data-tour="timeline"]');
  if (tl) await tl.screenshot({ path: dir + '/timeline-v6-semaine.png' });
  await page.screenshot({ path: dir + '/timeline-v6-full.png', fullPage: true });
  console.log('\n=== SCREENSHOTS OK ===');

  await browser.close();
})();
