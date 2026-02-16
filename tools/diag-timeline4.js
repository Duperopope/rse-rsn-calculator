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
    var b = Array.from(document.querySelectorAll('button')).find(function(x) { return x.textContent.includes('Journee longue'); });
    if (b) b.click();
  });
  await sleep(1500);

  // Analyser
  await page.evaluate(function() {
    var b = Array.from(document.querySelectorAll('button')).find(function(x) { return x.textContent.trim() === 'Analyser'; });
    if (b) b.click();
  });
  await sleep(8000);

  // Deplier dashboard
  await page.evaluate(function() {
    var chevrons = Array.from(document.querySelectorAll('button')).filter(function(b) {
      return b.textContent.trim() === '▼';
    });
    if (chevrons.length > 0) chevrons[0].click();
  });
  await sleep(1000);

  // Diagnostiquer timeline
  var tl = await page.evaluate(function() {
    var tourEl = document.querySelector('[data-tour="timeline"]');
    if (!tourEl) return { found: false };

    var blocs = tourEl.querySelectorAll('[class*="bloc"]');
    var flags = tourEl.querySelectorAll('[class*="flag"]');
    var flagsRow = tourEl.querySelector('[class*="flagsRow"]');
    var nightZones = tourEl.querySelectorAll('[class*="nightZone"]');
    var labels = tourEl.querySelectorAll('[class*="blocLabel"]');
    var topRow = tourEl.querySelector('[class*="topRow"]');
    var track = tourEl.querySelector('[class*="track"]');

    var flagsInfo = Array.from(flags).map(function(f) {
      return {
        left: f.style.left,
        cls: f.className.substring(0, 60),
        w: Math.round(f.getBoundingClientRect().width),
        text: f.textContent.trim()
      };
    });

    var blocsInfo = Array.from(blocs).map(function(b) {
      return {
        left: b.style.left,
        width: b.style.width,
        bg: b.style.background,
        px_w: Math.round(b.getBoundingClientRect().width),
        label: b.textContent.trim()
      };
    });

    return {
      found: true,
      containerH: tourEl.offsetHeight,
      trackH: track ? track.offsetHeight : 0,
      blocs: blocsInfo,
      flags: flagsInfo,
      flagsRowH: flagsRow ? flagsRow.offsetHeight : 0,
      nights: nightZones.length,
      topRow: topRow ? topRow.textContent.trim() : 'absent',
      labelsCount: labels.length
    };
  });
  console.log('=== TIMELINE V4 APRES ANALYSE ===');
  console.log(JSON.stringify(tl, null, 2));

  // Screenshot timeline
  var tourEl = await page.$('[data-tour="timeline"]');
  if (tourEl) {
    await tourEl.screenshot({ path: process.env.HOME + '/fimo-screenshots/timeline-v4.png' });
    console.log('\nScreenshot timeline v4 OK');
  }

  await page.screenshot({ path: process.env.HOME + '/fimo-screenshots/timeline-v4-full.png', fullPage: true });
  console.log('Screenshot full OK');

  await browser.close();
})();
