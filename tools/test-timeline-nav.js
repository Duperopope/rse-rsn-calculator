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

  // Fermer le tour
  var skipBtn = await page.evaluate(function() {
    var b = Array.from(document.querySelectorAll('button')).find(function(x) { return x.textContent.includes('Passer'); });
    if (b) { b.click(); return true; }
    return false;
  });
  console.log('Tour ferme: ' + skipBtn);
  await sleep(1000);

  // Envoyer un scenario avec infractions via l API
  var apiResult = await page.evaluate(function() {
    return fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        csv: '2026-02-16;04:00;09:30;C\n2026-02-16;09:30;09:45;P\n2026-02-16;09:45;14:45;C\n2026-02-16;14:45;15:00;P\n2026-02-16;15:00;19:00;C\n2026-02-16;19:00;19:30;P\n2026-02-16;19:30;22:00;C',
        typeService: 'SLO',
        pays: 'FR',
        equipage: 'solo'
      })
    }).then(function(r) { return r.json(); });
  });
  console.log('API Score: ' + apiResult.score + ', Infractions: ' + (apiResult.infractions || []).length);

  // Charger le template "Journee type" pour avoir des activites dans la timeline
  await page.evaluate(function() {
    var b = Array.from(document.querySelectorAll('button')).find(function(x) { return x.textContent.includes('Journee type'); });
    if (b) b.click();
  });
  await sleep(1500);

  // Cliquer Analyser
  await page.evaluate(function() {
    var b = Array.from(document.querySelectorAll('button')).find(function(x) { return x.textContent.trim() === 'Analyser'; });
    if (b) b.click();
  });
  await sleep(8000);

  // Verifier onglet Resultats
  var hasResultats = await page.evaluate(function() {
    var b = Array.from(document.querySelectorAll('button')).find(function(x) { return x.textContent.trim() === 'Resultats'; });
    if (b) { b.click(); return true; }
    return false;
  });
  console.log('Onglet Resultats: ' + hasResultats);
  await sleep(2000);

  // Chercher les InfractionCards et tester le tap
  var cardInfo = await page.evaluate(function() {
    var cards = document.querySelectorAll('[class*="infractionCard"], [class*="InfractionCard"], [class*="cardInfraction"]');
    var texts = Array.from(cards).map(function(c) { return c.textContent.substring(0, 80); });
    // Chercher aussi le texte "timeline" dans les boutons/liens
    var navLinks = Array.from(document.querySelectorAll('*')).filter(function(el) {
      return el.textContent.includes('timeline') && el.offsetHeight > 0 && el.offsetHeight < 100;
    }).map(function(el) { return el.tagName + ': ' + el.textContent.substring(0, 60); });
    return { count: cards.length, texts: texts.slice(0, 3), navLinks: navLinks.slice(0, 5) };
  });
  console.log('Cards infraction: ' + cardInfo.count);
  console.log('Textes: ' + JSON.stringify(cardInfo.texts));
  console.log('Liens timeline: ' + JSON.stringify(cardInfo.navLinks));

  // Si des cards existent, taper sur la premiere
  if (cardInfo.count > 0) {
    var navResult = await page.evaluate(function() {
      var card = document.querySelector('[class*="infractionCard"], [class*="InfractionCard"], [class*="cardInfraction"]');
      if (card) {
        card.click();
        return 'clicked';
      }
      return 'no card';
    });
    console.log('Tap card: ' + navResult);
    await sleep(1500);

    // Verifier si on est revenu sur saisie (timeline visible)
    var afterNav = await page.evaluate(function() {
      var timeline = document.querySelector('[class*="Timeline"]') || document.querySelector('[class*="timeline"]');
      var visible = timeline ? (timeline.offsetHeight > 0) : false;
      var activeTab = document.querySelector('[class*="bottomTabActive"]');
      var tabText = activeTab ? activeTab.textContent.trim() : 'inconnu';
      return { timelineVisible: visible, activeTab: tabText };
    });
    console.log('Apres tap: timeline visible=' + afterNav.timelineVisible + ', onglet actif=' + afterNav.activeTab);
  }

  // Screenshot
  await page.screenshot({ path: process.env.HOME + '/fimo-screenshots/test-timeline-nav.png', fullPage: true });
  console.log('Screenshot OK');

  await browser.close();
})();
