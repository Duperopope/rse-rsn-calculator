var puppeteer = require('puppeteer-core');
function sleep(ms) { return new Promise(function(r) { setTimeout(r, ms); }); }

(async function() {
  var browser = await puppeteer.launch({
    executablePath: process.env.PREFIX + '/lib/chromium/chromium-launcher.sh',
    headless: true,
    args: ['--no-sandbox','--disable-gpu','--disable-setuid-sandbox','--single-process']
  });
  var page = await browser.newPage();
  await page.setViewport({ width: 375, height: 812, isMobile: true });
  await page.goto('http://localhost:3001', { timeout: 20000, waitUntil: 'networkidle2' });
  await sleep(3000);

  await page.evaluate(function() {
    var b = Array.from(document.querySelectorAll('button')).find(function(x) { return x.textContent.includes('Passer'); });
    if (b) b.click();
  });
  await sleep(1000);

  await page.evaluate(function() {
    var b = Array.from(document.querySelectorAll('button')).find(function(x) { return x.textContent.includes('Journee type'); });
    if (b) b.click();
  });
  await sleep(1500);

  await page.evaluate(function() {
    var b = Array.from(document.querySelectorAll('button')).find(function(x) { return x.textContent.trim() === 'Analyser'; });
    if (b) b.click();
  });
  await sleep(10000);

  var bodyText = await page.evaluate(function() { return document.body.innerText; });
  var hasScore = bodyText.indexOf('Score') >= 0 || bodyText.indexOf('Conforme') >= 0 || bodyText.indexOf('infraction') >= 0;
  console.log('Score visible: ' + hasScore);

  var btns = await page.evaluate(function() {
    return Array.from(document.querySelectorAll('button')).map(function(b) {
      return b.textContent.trim().substring(0, 50);
    }).filter(function(t) { return t.length > 0; });
  });
  console.log('Boutons: ' + JSON.stringify(btns));

  var hasTab = btns.indexOf('Resultats') >= 0;
  console.log('Onglet Resultats: ' + (hasTab ? 'OUI' : 'NON'));

  if (hasTab) {
    await page.evaluate(function() {
      Array.from(document.querySelectorAll('button')).find(function(x) { return x.textContent.trim() === 'Resultats'; }).click();
    });
    await sleep(2000);
    await page.evaluate(function() { window.scrollTo(0, document.body.scrollHeight); });
    await sleep(1000);

    var exportBtns = await page.evaluate(function() {
      return Array.from(document.querySelectorAll('button')).map(function(b) {
        var r = b.getBoundingClientRect();
        return { t: b.textContent.trim().substring(0, 40), w: Math.round(r.width), h: Math.round(r.height) };
      }).filter(function(b) { return b.t.match(/Retour|PDF|Imprimer|Telecharger/i); });
    });
    console.log('Boutons export: ' + JSON.stringify(exportBtns));
  }

  await page.screenshot({ path: process.env.HOME + '/fimo-screenshots/test-resultats.png', fullPage: true });
  console.log('Screenshot OK');
  await browser.close();
})();
