var puppeteer = require('puppeteer-core');
function sleep(ms) { return new Promise(function(r) { setTimeout(r, ms); }); }

(async function() {
  var browser = await puppeteer.launch({
    executablePath: process.env.PREFIX + '/lib/chromium/chromium-launcher.sh',
    headless: true,
    args: ['--no-sandbox','--disable-gpu','--disable-setuid-sandbox','--single-process']
  });
  var page = await browser.newPage();
  await page.setViewport({width:1280, height:900});
  await page.goto('http://localhost:3001', {timeout:20000, waitUntil:'networkidle2'});
  await sleep(2000);

  // Fermer le tour
  await page.evaluate(function() {
    var btns = Array.from(document.querySelectorAll('button'));
    var c = btns.find(function(b) { return b.getAttribute('aria-label') === 'Close' || b.textContent.indexOf('Passer') !== -1; });
    if (c) c.click();
  });
  await sleep(1000);

  var targets = ['header','params','jour-tabs','templates','activite','ajouter','timeline','gauges','analyser','help','results','tracking','history','input','bottom-tabs'];

  var info = await page.evaluate(function(tgts) {
    return tgts.map(function(t) {
      var el = document.querySelector('[data-tour="' + t + '"]');
      if (!el) return t + ': NON TROUVE dans le DOM';
      var rect = el.getBoundingClientRect();
      var style = window.getComputedStyle(el);
      var hidden = style.display === 'none' || style.visibility === 'hidden';
      var zeroSize = rect.width === 0 && rect.height === 0;
      var status = hidden ? 'CACHE (display/visibility)' : zeroSize ? 'CACHE (0x0)' : 'VISIBLE';
      return t + ': ' + status + ' (' + Math.round(rect.width) + 'x' + Math.round(rect.height) + ' @ y=' + Math.round(rect.top) + ')';
    });
  }, targets);

  info.forEach(function(line) { console.log(line); });
  await browser.close();
})();
