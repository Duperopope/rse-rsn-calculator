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

  // Ajouter 2 jours pour avoir multi-jours
  for (var i = 0; i < 2; i++) {
    await page.evaluate(function() {
      var btn = Array.from(document.querySelectorAll('button')).find(function(b) { return b.textContent.trim() === '+'; });
      if (btn) btn.click();
    });
    await sleep(800);
  }

  // Analyser
  await page.evaluate(function() {
    var btn = Array.from(document.querySelectorAll('button')).find(function(b) {
      return b.textContent.toLowerCase().includes('analyser');
    });
    if (btn) btn.click();
  });
  await sleep(4000);

  // Revenir sur onglet Saisie
  await page.evaluate(function() {
    var tabs = Array.from(document.querySelectorAll('button,[role="tab"]'));
    var saisie = tabs.find(function(t) { return t.textContent.toLowerCase().includes('saisie'); });
    if (saisie) saisie.click();
  });
  await sleep(1000);

  // Ouvrir dashboard
  await page.evaluate(function() {
    var ch = Array.from(document.querySelectorAll('button,[role="button"]')).filter(function(b) { return b.textContent.trim() === '\u25BC'; });
    if (ch.length) ch[0].click();
  });
  await sleep(1500);

  // === TEST VUE JOUR APRES ANALYSE ===
  var vueJourData = await page.evaluate(function() {
    var tl = document.querySelector('[data-tour="timeline"]');
    if (!tl) return { found: false };
    var blocs = tl.querySelectorAll('[class*="bloc"]');
    var legende = tl.querySelectorAll('[class*="legendeItem"]');
    return {
      found: true,
      nbBlocs: blocs.length,
      nbLegende: legende.length,
      containerH: tl.offsetHeight
    };
  });
  console.log('=== VUE JOUR APRES ANALYSE ===');
  console.log(JSON.stringify(vueJourData, null, 2));

  // Passer en vue Semaine
  await page.evaluate(function() {
    var tl = document.querySelector('[data-tour="timeline"]');
    var btns = tl.querySelectorAll('button');
    var sem = Array.from(btns).find(function(b) { return b.textContent === 'Semaine'; });
    if (sem) sem.click();
  });
  await sleep(1500);

  // === TEST VUE SEMAINE APRES ANALYSE ===
  var vueSemaineData = await page.evaluate(function() {
    var tl = document.querySelector('[data-tour="timeline"]');
    if (!tl) return { found: false };
    var vueSem = tl.querySelector('[class*="vueSemaine"]');
    if (!vueSem) return { found: true, vueSemaine: false };
    var lignes = vueSem.querySelectorAll('[class*="semaineLigne"]');
    var header = vueSem.querySelector('[class*="semaineHeader"]');
    var infBadges = vueSem.querySelectorAll('[class*="semaineInfBadge"]');
    var avertBadges = vueSem.querySelectorAll('[class*="semaineAvertBadge"]');
    var footer = vueSem.querySelector('[class*="semaineFooter"]');

    return {
      found: true,
      vueSemaine: true,
      containerH: vueSem.offsetHeight,
      nbLignes: lignes.length,
      nbInfBadges: infBadges.length,
      nbAvertBadges: avertBadges.length,
      headerText: header ? header.textContent : 'absent',
      footerText: footer ? footer.textContent : 'absent',
      lignesDetail: Array.from(lignes).map(function(l) {
        var date = l.querySelector('[class*="semaineDate"]');
        var stats = l.querySelector('[class*="semaineStats"]');
        var barre = l.querySelector('[class*="semaineBarre"]');
        var blocs = barre ? barre.querySelectorAll('[class*="semaineBlocAct"]').length : 0;
        var infB = l.querySelector('[class*="semaineInfBadge"]');
        var avertB = l.querySelector('[class*="semaineAvertBadge"]');
        return {
          dateText: date ? date.textContent : '',
          blocsInBarre: blocs,
          statsText: stats ? stats.textContent : '',
          hasInfBadge: !!infB,
          infBadgeText: infB ? infB.textContent : '',
          hasAvertBadge: !!avertB,
          avertBadgeText: avertB ? avertB.textContent : ''
        };
      })
    };
  });
  console.log('\n=== VUE SEMAINE APRES ANALYSE ===');
  console.log(JSON.stringify(vueSemaineData, null, 2));

  // Verifier le resultat en memoire
  var resultatCheck = await page.evaluate(function() {
    // Chercher dans sessionStorage
    try {
      var stored = sessionStorage.getItem('fimo_resultat');
      if (stored) {
        var r = JSON.parse(stored);
        return {
          hasResultat: true,
          score: r.score,
          nbInfractions: r.infractions ? r.infractions.length : 0,
          hasDetailsJours: !!r.details_jours,
          nbDetailsJours: r.details_jours ? r.details_jours.length : 0,
          hasStatistiques: !!r.statistiques,
          detailsJour0Inf: r.details_jours && r.details_jours[0] && r.details_jours[0].infractions ? r.details_jours[0].infractions.length : 0
        };
      }
      return { hasResultat: false, stored: false };
    } catch(e) { return { error: e.message }; }
  });
  console.log('\n=== RESULTAT EN MEMOIRE ===');
  console.log(JSON.stringify(resultatCheck, null, 2));

  // Screenshots
  var fs = require('fs');
  var dir = process.env.HOME + '/fimo-screenshots';
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  var tl = await page.$('[data-tour="timeline"]');
  if (tl) await tl.screenshot({ path: dir + '/audit-v6-semaine.png' });
  await page.screenshot({ path: dir + '/audit-v6-full.png', fullPage: true });
  console.log('\n=== SCREENSHOTS OK ===');

  await browser.close();
})();
