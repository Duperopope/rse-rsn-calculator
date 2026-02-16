var puppeteer = require('puppeteer-core');
var fs = require('fs');

function sleep(ms) { return new Promise(function(r) { setTimeout(r, ms); }); }

var urls = [];
var files = ['server.js', 'fix-engine.js', 'pdf-generator.js'];
files.forEach(function(f) {
  try {
    var content = fs.readFileSync(f, 'utf8');
    var matches = content.match(/https:\/\/www\.legifrance\.gouv\.fr[^\s'")\]]+/g);
    if (matches) {
      matches.forEach(function(u) {
        if (urls.indexOf(u) === -1) urls.push(u);
      });
    }
  } catch(e) {}
});

console.log('URLs Legifrance a verifier: ' + urls.length);
console.log('');

(async function() {
  var browser = await puppeteer.launch({
    executablePath: process.env.PREFIX + '/lib/chromium/chromium-launcher.sh',
    headless: true,
    args: ['--no-sandbox','--disable-gpu','--disable-setuid-sandbox','--single-process']
  });

  for (var i = 0; i < urls.length; i++) {
    var url = urls[i];
    var page = await browser.newPage();
    try {
      await page.goto(url, { timeout: 15000, waitUntil: 'domcontentloaded' });
      await sleep(2000);
      var info = await page.evaluate(function() {
        var title = document.title || '';
        var h1 = document.querySelector('h1');
        var article = document.querySelector('.article-content, #content, main');
        return {
          title: title.substring(0, 100),
          h1: h1 ? h1.textContent.trim().substring(0, 100) : '',
          hasContent: !!article,
          bodyLen: document.body.innerText.length
        };
      });
      var status = info.bodyLen > 500 ? 'OK' : 'SUSPECT';
      if (info.title.indexOf('404') >= 0 || info.title.indexOf('introuvable') >= 0) status = 'MORT';
      console.log(status + ' | ' + url.substring(35, 80));
      console.log('  Titre: ' + info.title);
      if (info.h1) console.log('  H1: ' + info.h1);
      console.log('  Contenu: ' + info.bodyLen + ' car');
      console.log('');
    } catch(e) {
      console.log('ERREUR | ' + url.substring(35, 80));
      console.log('  ' + e.message.substring(0, 80));
      console.log('');
    }
    await page.close();
    await sleep(1000);
  }

  await browser.close();
  console.log('VERIFICATION TERMINEE');
})();
