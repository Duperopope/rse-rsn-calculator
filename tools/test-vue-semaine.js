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
  await sleep(1000);

  // Ajouter 2 jours
  for (var i = 0; i < 2; i++) {
    await page.evaluate(function() {
      var btn = Array.from(document.querySelectorAll('button')).find(function(b) { return b.textContent.trim() === '+'; });
      if (btn) btn.click();
    });
    await sleep(800);
  }

  // Ouvrir dashboard
  await page.evaluate(function() {
    var ch = Array.from(document.querySelectorAll('button,[role="button"]')).filter(function(b) { return b.textContent.trim() === '\u25BC'; });
    if (ch.length) ch[0].click();
  });
  await sleep(1500);

  // Verifier boutons vue
  var vueBtns = await page.evaluate(function() {
    var tl = document.querySelector('[data-tour="timeline"]');
    if (!tl) return [];
    var btns = tl.querySelectorAll('button');
    return Array.from(btns).map(function(b) { return b.textContent; });
  });
  console.log('=== BOUTONS VUE ===');
  console.log(JSON.stringify(vueBtns));

  // Cliquer sur Semaine
  await page.evaluate(function() {
    var tl = document.querySelector('[data-tour="timeline"]');
    if (!tl) return;
    var btns = tl.querySelectorAll('button');
    var semBtn = Array.from(btns).find(function(b) { return b.textContent === 'Semaine'; });
    if (semBtn) semBtn.click();
  });
  await sleep(1500);

  // Analyser la vue semaine
  var semaine = await page.evaluate(function() {
    var tl = document.querySelector('[data-tour="timeline"]');
    if (!tl) return { found: false };
    var vueSem = tl.querySelector('[class*="vueSemaine"]');
    if (!vueSem) return { found: true, vueSemaine: false };
    var lignes = vueSem.querySelectorAll('[class*="semaineLigne"]');
    var header = vueSem.querySelector('[class*="semaineHeader"]');
    var barres = vueSem.querySelectorAll('[class*="semaineBarre"]');
    var activeLigne = vueSem.querySelector('[class*="semaineLigneActive"]');
    var blocsAct = vueSem.querySelectorAll('[class*="semaineBlocAct"]');
    var infBadges = vueSem.querySelectorAll('[class*="semaineInfBadge"]');
    var footer = vueSem.querySelector('[class*="semaineFooter"]');

    return {
      found: true,
      vueSemaine: true,
      containerH: vueSem.offsetHeight,
      nbLignes: lignes.length,
      nbBarres: barres.length,
      nbBlocsAct: blocsAct.length,
      nbInfBadges: infBadges.length,
      headerText: header ? header.textContent : 'absent',
      hasActiveLigne: !!activeLigne,
      footerText: footer ? footer.textContent : 'absent',
      lignesDetail: Array.from(lignes).map(function(l) {
        var date = l.querySelector('[class*="semaineDate"]');
        var barre = l.querySelector('[class*="semaineBarre"]');
        var stats = l.querySelector('[class*="semaineStats"]');
        var blocs = barre ? barre.querySelectorAll('[class*="semaineBlocAct"]').length : 0;
        return {
          dateText: date ? date.textContent : '',
          blocsInBarre: blocs,
          statsText: stats ? stats.textContent : '',
          barreW: barre ? barre.offsetWidth : 0
        };
      })
    };
  });
  console.log('\n=== VUE SEMAINE ===');
  console.log(JSON.stringify(semaine, null, 2));

  // Cliquer sur un jour dans la vue semaine (jour 2)
  if (semaine.vueSemaine && semaine.nbLignes >= 2) {
    await page.evaluate(function() {
      var tl = document.querySelector('[data-tour="timeline"]');
      var lignes = tl.querySelectorAll('[class*="semaineLigne"]');
      if (lignes[1]) lignes[1].click();
    });
    await sleep(1000);

    var afterClick = await page.evaluate(function() {
      var tl = document.querySelector('[data-tour="timeline"]');
      var activeLigne = tl.querySelector('[class*="semaineLigneActive"]');
      var dateActive = activeLigne ? activeLigne.querySelector('[class*="semaineDate"]') : null;
      return {
        hasActiveLigne: !!activeLigne,
        activeDateText: dateActive ? dateActive.textContent : 'absent'
      };
    });
    console.log('\n=== APRES CLIC JOUR 2 ===');
    console.log(JSON.stringify(afterClick, null, 2));
  }

  // Screenshots
  var fs = require('fs');
  var dir = process.env.HOME + '/fimo-screenshots';
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  var tl = await page.$('[data-tour="timeline"]');
  if (tl) await tl.screenshot({ path: dir + '/timeline-v6-semaine-vue.png' });
  await page.screenshot({ path: dir + '/timeline-v6-semaine-full.png', fullPage: true });
  console.log('\n=== SCREENSHOTS OK ===');

  await browser.close();
})();
