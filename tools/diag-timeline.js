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

  // Analyser la timeline AVANT analyse backend
  var avant = await page.evaluate(function() {
    var container = document.querySelector('[class*="Timeline"]') || document.querySelector('[class*="timeline"]');
    if (!container) return { found: false };
    var blocs = container.querySelectorAll('[class*="bloc"]');
    var zones = container.querySelectorAll('[class*="zoneDepassement"]');
    var marqueurs = container.querySelectorAll('[class*="marqueur"]');
    var nights = container.querySelectorAll('[class*="nightZone"]');
    var infBar = container.querySelector('[class*="infractionBar"]');
    
    var blocsInfo = Array.from(blocs).map(function(b) {
      var r = b.getBoundingClientRect();
      return { w: Math.round(r.width), left: Math.round(r.left), bg: b.style.background };
    });
    
    var zonesInfo = Array.from(zones).map(function(z) {
      var r = z.getBoundingClientRect();
      return { w: Math.round(r.width), left: Math.round(r.left), type: z.getAttribute('data-zone-type') };
    });

    return {
      found: true,
      blocs: blocs.length,
      blocsDetail: blocsInfo,
      zones: zones.length,
      zonesDetail: zonesInfo,
      marqueurs: marqueurs.length,
      nights: nights.length,
      infBar: infBar ? infBar.textContent.trim() : 'absent',
      containerHeight: container.offsetHeight
    };
  });
  console.log('=== TIMELINE AVANT ANALYSE ===');
  console.log(JSON.stringify(avant, null, 2));

  // Analyser
  await page.evaluate(function() {
    var b = Array.from(document.querySelectorAll('button')).find(function(x) { return x.textContent.trim() === 'Analyser'; });
    if (b) b.click();
  });
  await sleep(8000);

  // Analyser la timeline APRES analyse
  var apres = await page.evaluate(function() {
    var container = document.querySelector('[class*="Timeline"]') || document.querySelector('[class*="timeline"]');
    if (!container) return { found: false };
    var blocs = container.querySelectorAll('[class*="bloc"]');
    var zones = container.querySelectorAll('[class*="zoneDepassement"]');
    var marqueurs = container.querySelectorAll('[class*="marqueur"]');
    var nights = container.querySelectorAll('[class*="nightZone"]');
    var infBar = container.querySelector('[class*="infractionBar"]');
    
    var zonesInfo = Array.from(zones).map(function(z) {
      var r = z.getBoundingClientRect();
      return { w: Math.round(r.width), left: Math.round(r.left), type: z.getAttribute('data-zone-type') };
    });

    return {
      blocs: blocs.length,
      zones: zones.length,
      zonesDetail: zonesInfo,
      marqueurs: marqueurs.length,
      nights: nights.length,
      infBar: infBar ? infBar.textContent.trim() : 'absent'
    };
  });
  console.log('\n=== TIMELINE APRES ANALYSE ===');
  console.log(JSON.stringify(apres, null, 2));

  // Screenshot timeline zoom
  var timelineEl = await page.$('[class*="Timeline"], [class*="timeline"]');
  if (timelineEl) {
    await timelineEl.screenshot({ path: process.env.HOME + '/fimo-screenshots/timeline-zoom.png' });
    console.log('\nScreenshot timeline zoom OK');
  }

  // Screenshot full page
  await page.screenshot({ path: process.env.HOME + '/fimo-screenshots/diag-timeline-full.png', fullPage: true });
  console.log('Screenshot full OK');

  await browser.close();
})();
