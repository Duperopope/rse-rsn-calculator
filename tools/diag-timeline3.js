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

  // Charger un scenario avec infractions : journee longue puis modifier pour forcer des depassements
  // D abord charger "Journee longue (10h derog)"
  await page.evaluate(function() {
    var b = Array.from(document.querySelectorAll('button')).find(function(x) { return x.textContent.includes('Journee longue'); });
    if (b) b.click();
  });
  await sleep(1500);

  // Verifier les activites chargees
  var acts = await page.evaluate(function() {
    var inputs = Array.from(document.querySelectorAll('input[type="time"]'));
    return inputs.map(function(i) { return i.value; });
  });
  console.log('Activites chargees: ' + JSON.stringify(acts));

  // Deplier dashboard
  await page.evaluate(function() {
    var chevrons = Array.from(document.querySelectorAll('button')).filter(function(b) {
      return b.textContent.trim() === '▼';
    });
    if (chevrons.length > 0) chevrons[0].click();
  });
  await sleep(1000);

  // Etat timeline
  var tl = await page.evaluate(function() {
    var tourEl = document.querySelector('[data-tour="timeline"]');
    if (!tourEl) return { found: false };
    
    var container = tourEl.querySelector('[class*="container"]');
    var track = tourEl.querySelector('[class*="track"]');
    var blocs = tourEl.querySelectorAll('[class*="bloc"]:not([class*="zone"])');
    var zones = tourEl.querySelectorAll('[class*="zoneDepassement"]');
    var marqueurs = tourEl.querySelectorAll('[class*="marqueur"]');
    var nights = tourEl.querySelectorAll('[class*="nightZone"]');
    var infBar = tourEl.querySelector('[class*="infractionBar"]');
    
    var blocsInfo = Array.from(blocs).map(function(b) {
      return {
        left: b.style.left,
        width: b.style.width,
        bg: b.style.background,
        px_w: Math.round(b.getBoundingClientRect().width),
        px_h: Math.round(b.getBoundingClientRect().height)
      };
    });
    
    var zonesInfo = Array.from(zones).map(function(z) {
      return {
        left: z.style.left,
        width: z.style.width,
        type: z.getAttribute('data-zone-type'),
        px_w: Math.round(z.getBoundingClientRect().width)
      };
    });

    return {
      found: true,
      containerH: tourEl.offsetHeight,
      trackH: track ? track.offsetHeight : 0,
      trackW: track ? track.offsetWidth : 0,
      blocs: blocsInfo,
      zones: zonesInfo,
      marqueurs: marqueurs.length,
      nights: nights.length,
      infBar: infBar ? infBar.textContent.trim() : 'absent'
    };
  });
  console.log('\n=== TIMELINE JOURNEE LONGUE ===');
  console.log(JSON.stringify(tl, null, 2));

  // Screenshot timeline zoom
  var tourEl = await page.$('[data-tour="timeline"]');
  if (tourEl) {
    await tourEl.screenshot({ path: process.env.HOME + '/fimo-screenshots/timeline-longue.png' });
    console.log('\nScreenshot timeline longue OK');
  }

  await browser.close();
})();
