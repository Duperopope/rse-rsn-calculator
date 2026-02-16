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
  await sleep(3000);

  var results = [];

  for (var i = 1; i <= 10; i++) {
    var info = await page.evaluate(function() {
      var tooltip = document.querySelector('.react-joyride__tooltip');
      if (!tooltip) return {title:'TOOLTIP ABSENT'};
      return {title: tooltip.textContent.substring(0, 80)};
    });
    results.push('Etape ' + i + ': ' + info.title);

    var clicked = await page.evaluate(function() {
      var btns = Array.from(document.querySelectorAll('button'));
      var next = btns.find(function(b) {
        var t = b.textContent.toLowerCase();
        return t.indexOf('next') !== -1 || t.indexOf('suivant') !== -1 || t.indexOf('parti') !== -1;
      });
      if (next) { next.click(); return true; }
      return false;
    });

    if (!clicked) {
      results.push('  -> BLOQUE (pas de bouton Next)');
      break;
    }
    await sleep(1500);
  }

  var tourDone = await page.evaluate(function() {
    var tooltip = document.querySelector('.react-joyride__tooltip');
    return tooltip ? 'TOOLTIP ENCORE VISIBLE' : 'TOUR TERMINE';
  });
  results.push('');
  results.push('Statut: ' + tourDone);

  console.log(results.join('\n'));
  await browser.close();
})();
