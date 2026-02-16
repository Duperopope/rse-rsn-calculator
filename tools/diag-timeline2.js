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

  // Charger journee type
  await page.evaluate(function() {
    var b = Array.from(document.querySelectorAll('button')).find(function(x) { return x.textContent.includes('Journee type'); });
    if (b) b.click();
  });
  await sleep(1500);

  // Chercher la timeline avec tous les selecteurs possibles
  var search1 = await page.evaluate(function() {
    var all = document.querySelectorAll('*');
    var candidates = [];
    for (var i = 0; i < all.length; i++) {
      var el = all[i];
      var cls = el.className || '';
      if (typeof cls === 'string' && (cls.indexOf('imeline') !== -1 || cls.indexOf('track') !== -1 || cls.indexOf('timeline') !== -1)) {
        candidates.push({
          tag: el.tagName,
          cls: cls.substring(0, 80),
          w: el.offsetWidth,
          h: el.offsetHeight,
          visible: el.offsetHeight > 0
        });
      }
    }
    // Chercher aussi data-tour="timeline"
    var tourEl = document.querySelector('[data-tour="timeline"]');
    var tourInfo = tourEl ? { found: true, cls: (tourEl.className || '').substring(0, 80), w: tourEl.offsetWidth, h: tourEl.offsetHeight, visible: tourEl.offsetHeight > 0 } : { found: false };
    
    // Chercher le chevron dashboard
    var chevron = Array.from(document.querySelectorAll('button, [role="button"]')).filter(function(b) {
      return b.textContent.trim() === '▼' || b.textContent.trim() === '▲';
    }).map(function(b) { return { text: b.textContent.trim(), cls: (b.className || '').substring(0, 60) }; });
    
    return { candidates: candidates, tourEl: tourInfo, chevrons: chevron };
  });
  console.log('=== RECHERCHE TIMELINE ===');
  console.log(JSON.stringify(search1, null, 2));

  // Cliquer sur le chevron pour deplier le dashboard
  await page.evaluate(function() {
    var chevrons = Array.from(document.querySelectorAll('button, [role="button"]')).filter(function(b) {
      return b.textContent.trim() === '▼';
    });
    if (chevrons.length > 0) chevrons[0].click();
  });
  await sleep(1000);

  // Re-chercher la timeline
  var search2 = await page.evaluate(function() {
    var tourEl = document.querySelector('[data-tour="timeline"]');
    if (!tourEl) return { found: false };
    
    var blocs = tourEl.querySelectorAll('[class*="bloc"]');
    var zones = tourEl.querySelectorAll('[class*="zoneDepassement"]');
    var marqueurs = tourEl.querySelectorAll('[class*="marqueur"]');
    var nights = tourEl.querySelectorAll('[class*="nightZone"]');
    var track = tourEl.querySelector('[class*="track"]');
    
    return {
      found: true,
      w: tourEl.offsetWidth,
      h: tourEl.offsetHeight,
      visible: tourEl.offsetHeight > 0,
      blocs: blocs.length,
      zones: zones.length,
      marqueurs: marqueurs.length,
      nights: nights.length,
      trackH: track ? track.offsetHeight : 0
    };
  });
  console.log('\n=== APRES CLIC CHEVRON ===');
  console.log(JSON.stringify(search2, null, 2));

  // Screenshot
  var tourEl = await page.$('[data-tour="timeline"]');
  if (tourEl) {
    await tourEl.screenshot({ path: process.env.HOME + '/fimo-screenshots/timeline-zoom.png' });
    console.log('\nScreenshot timeline zoom OK');
  }
  await page.screenshot({ path: process.env.HOME + '/fimo-screenshots/diag-timeline2-full.png', fullPage: true });
  console.log('Screenshot full OK');

  await browser.close();
})();
