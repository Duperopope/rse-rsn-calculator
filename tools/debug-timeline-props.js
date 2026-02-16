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

  // Combien de jours dans le state ?
  var state1 = await page.evaluate(function() {
    var jourTabs = document.querySelectorAll('[class*="jourNav"]');
    return {
      nbJourTabs: jourTabs.length,
      tabTexts: Array.from(jourTabs).map(function(t) { return t.textContent.substring(0, 20); })
    };
  });
  console.log('=== ETAT INITIAL ===');
  console.log(JSON.stringify(state1, null, 2));

  // Ajouter 2 jours via le bouton "+"
  for (var i = 0; i < 2; i++) {
    await page.evaluate(function() {
      var btns = Array.from(document.querySelectorAll('button'));
      var addBtn = btns.find(function(b) {
        var txt = b.textContent.toLowerCase();
        return (txt.includes('+') || txt.includes('ajouter')) && txt.includes('jour');
      });
      if (!addBtn) {
        // Chercher un bouton avec juste "+"
        addBtn = btns.find(function(b) { return b.textContent.trim() === '+'; });
      }
      if (addBtn) {
        addBtn.click();
        return 'clicked: ' + addBtn.textContent.substring(0, 30);
      }
      return 'NOT FOUND - btns: ' + btns.map(function(b) { return b.textContent.substring(0, 15); }).join(' | ');
    });
    await sleep(1000);
  }

  // Verifier nb jours apres ajout
  var state2 = await page.evaluate(function() {
    var jourTabs = document.querySelectorAll('[class*="jourNav"]');
    return {
      nbJourTabs: jourTabs.length,
      tabTexts: Array.from(jourTabs).map(function(t) { return t.textContent.substring(0, 20); })
    };
  });
  console.log('\n=== APRES AJOUT 2 JOURS ===');
  console.log(JSON.stringify(state2, null, 2));

  // Ouvrir le dashboard
  await page.evaluate(function() {
    var chevrons = Array.from(document.querySelectorAll('button,[role="button"]')).filter(function(b) { return b.textContent.trim() === '\u25BC'; });
    if (chevrons.length) chevrons[0].click();
    return chevrons.length;
  });
  await sleep(1500);

  // Injecter un log temporaire pour voir les props
  var propsCheck = await page.evaluate(function() {
    // Chercher le composant Timeline dans le DOM rendu
    var container = document.querySelector('[data-tour="timeline"]');
    if (!container) return { timelineWrapper: false };
    
    // Chercher dans le wrapper le composant timeline interne
    var innerContainer = container.querySelector('[class*="container"]');
    var vueSelector = container.querySelectorAll('[class*="vueSelectorBtn"]');
    var vueSemaine = container.querySelector('[class*="vueSemaine"]');
    var vueJour = container.querySelector('[class*="vueJour"]');
    var track = container.querySelector('[class*="track"]');
    var legende = container.querySelectorAll('[class*="legendeItem"]');
    
    // Chercher tous les elements avec des classes pour debug
    var allClasses = new Set();
    container.querySelectorAll('*').forEach(function(el) {
      if (el.className && typeof el.className === 'string') {
        el.className.split(' ').forEach(function(c) { if (c) allClasses.add(c); });
      }
    });

    return {
      timelineWrapper: true,
      wrapperH: container.offsetHeight,
      innerContainer: !!innerContainer,
      nbVueBtns: vueSelector.length,
      hasVueSemaine: !!vueSemaine,
      hasVueJour: !!vueJour,
      hasTrack: !!track,
      nbLegende: legende.length,
      allClassesSample: Array.from(allClasses).slice(0, 20)
    };
  });
  console.log('\n=== PROPS CHECK / DOM STRUCTURE ===');
  console.log(JSON.stringify(propsCheck, null, 2));

  await browser.close();
})();
