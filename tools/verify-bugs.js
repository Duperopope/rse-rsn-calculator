var puppeteer = require('puppeteer-core');
var path = require('path');

function sleep(ms) { return new Promise(function(r) { setTimeout(r, ms); }); }

(async function() {
  var results = [];

  var browser = await puppeteer.launch({
    executablePath: process.env.PREFIX + '/lib/chromium/chromium-launcher.sh',
    headless: true,
    args: ['--no-sandbox','--disable-gpu','--disable-setuid-sandbox','--single-process']
  });

  var page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });
  await page.goto('http://localhost:3001', { timeout: 20000, waitUntil: 'networkidle2' });
  await sleep(2000);
  await page.evaluate(function() {
    var btns = Array.from(document.querySelectorAll('button'));
    var c = btns.find(function(b) { return b.getAttribute('aria-label') === 'Close' || b.textContent.indexOf('Passer') !== -1; });
    if (c) c.click();
  });
  await sleep(1000);

  // BUG 1 : "FR FR" tronque dans la barre selector
  var bug1 = await page.evaluate(function() {
    var spans = Array.from(document.querySelectorAll('span, button'));
    var fr = spans.find(function(s) { return s.textContent.indexOf('FR') !== -1 && s.textContent.indexOf('Solo') === -1; });
    if (!fr) return { verdict: 'NON TROUVE', detail: 'Element FR introuvable' };
    var rect = fr.getBoundingClientRect();
    var parent = fr.parentElement;
    var parentRect = parent ? parent.getBoundingClientRect() : null;
    var overflowHidden = false;
    var el = fr;
    while (el && el !== document.body) {
      var s = window.getComputedStyle(el);
      if (s.overflow === 'hidden' || s.textOverflow === 'ellipsis') { overflowHidden = true; break; }
      el = el.parentElement;
    }
    return {
      verdict: (rect.width < fr.scrollWidth || overflowHidden) ? 'CONFIRME' : 'FAUX POSITIF',
      text: fr.textContent.trim().substring(0, 30),
      width: Math.round(rect.width),
      scrollWidth: fr.scrollWidth,
      overflowHidden: overflowHidden
    };
  });
  results.push('BUG 1 - FR tronque: ' + bug1.verdict + ' | ' + JSON.stringify(bug1));

  // BUG 2 : "Journee longue (10h derog)" tronque
  var bug2 = await page.evaluate(function() {
    var btns = Array.from(document.querySelectorAll('button'));
    var btn = btns.find(function(b) { return b.textContent.indexOf('Journee longue') !== -1 || b.textContent.indexOf('10h') !== -1; });
    if (!btn) return { verdict: 'NON TROUVE' };
    var rect = btn.getBoundingClientRect();
    var overflowHidden = false;
    var el = btn;
    while (el && el !== document.body) {
      var s = window.getComputedStyle(el);
      if (s.overflow === 'hidden' || s.textOverflow === 'ellipsis' || s.whiteSpace === 'nowrap') { overflowHidden = true; break; }
      el = el.parentElement;
    }
    return {
      verdict: (btn.scrollWidth > rect.width + 2 || overflowHidden) ? 'CONFIRME' : 'FAUX POSITIF',
      text: btn.textContent.trim().substring(0, 40),
      btnWidth: Math.round(rect.width),
      scrollWidth: btn.scrollWidth,
      overflowHidden: overflowHidden
    };
  });
  results.push('BUG 2 - Journee longue tronque: ' + bug2.verdict + ' | ' + JSON.stringify(bug2));

  // BUG 3 : "Service de nuit" tronque
  var bug3 = await page.evaluate(function() {
    var btns = Array.from(document.querySelectorAll('button'));
    var btn = btns.find(function(b) { return b.textContent.indexOf('Service de nuit') !== -1; });
    if (!btn) return { verdict: 'NON TROUVE' };
    var rect = btn.getBoundingClientRect();
    return {
      verdict: (btn.scrollWidth > rect.width + 2) ? 'CONFIRME' : 'FAUX POSITIF',
      text: btn.textContent.trim().substring(0, 40),
      btnWidth: Math.round(rect.width),
      scrollWidth: btn.scrollWidth
    };
  });
  results.push('BUG 3 - Service de nuit tronque: ' + bug3.verdict + ' | ' + JSON.stringify(bug3));

  // BUG 4 : Dupliquer mal aligne avec date
  var bug4 = await page.evaluate(function() {
    var btns = Array.from(document.querySelectorAll('button'));
    var dup = btns.find(function(b) { return b.textContent.indexOf('Dupliquer') !== -1; });
    var dateInput = document.querySelector('input[type="date"]');
    if (!dup || !dateInput) return { verdict: 'NON TROUVE' };
    var dupRect = dup.getBoundingClientRect();
    var dateRect = dateInput.getBoundingClientRect();
    var diff = Math.abs(dupRect.top - dateRect.top);
    return {
      verdict: diff > 5 ? 'CONFIRME' : 'FAUX POSITIF',
      detail: 'decalage vertical = ' + Math.round(diff) + 'px',
      dupTop: Math.round(dupRect.top),
      dateTop: Math.round(dateRect.top)
    };
  });
  results.push('BUG 4 - Dupliquer aligne: ' + bug4.verdict + ' | ' + JSON.stringify(bug4));

  // BUG 5 : Footer "FIMO Check" tronque
  var bug5 = await page.evaluate(function() {
    var els = Array.from(document.querySelectorAll('span, div'));
    var fimo = els.find(function(e) { return e.textContent.trim() === 'FIMO Check'; });
    if (!fimo) return { verdict: 'NON TROUVE' };
    var rect = fimo.getBoundingClientRect();
    var overflowHidden = false;
    var el = fimo;
    while (el && el !== document.body) {
      var s = window.getComputedStyle(el);
      if (s.overflow === 'hidden' || s.textOverflow === 'ellipsis') { overflowHidden = true; break; }
      el = el.parentElement;
    }
    return {
      verdict: (fimo.scrollWidth > rect.width + 2 || overflowHidden) ? 'CONFIRME' : 'FAUX POSITIF',
      width: Math.round(rect.width),
      scrollWidth: fimo.scrollWidth,
      overflowHidden: overflowHidden
    };
  });
  results.push('BUG 5 - Footer FIMO tronque: ' + bug5.verdict + ' | ' + JSON.stringify(bug5));

  // === MOBILE ===
  await page.setViewport({ width: 375, height: 812, isMobile: true });
  await page.reload({ waitUntil: 'networkidle2' });
  await sleep(2000);
  await page.evaluate(function() {
    var btns = Array.from(document.querySelectorAll('button'));
    var c = btns.find(function(b) { return b.getAttribute('aria-label') === 'Close' || b.textContent.indexOf('Passer') !== -1; });
    if (c) c.click();
  });
  await sleep(1000);

  // BUG 6 : Mobile - Journee longue tronque
  var bug6 = await page.evaluate(function() {
    var btns = Array.from(document.querySelectorAll('button'));
    var btn = btns.find(function(b) { return b.textContent.indexOf('Journee longue') !== -1 || b.textContent.indexOf('10h') !== -1; });
    if (!btn) return { verdict: 'NON TROUVE' };
    var rect = btn.getBoundingClientRect();
    return {
      verdict: (btn.scrollWidth > rect.width + 2) ? 'CONFIRME' : 'FAUX POSITIF',
      text: btn.textContent.trim().substring(0, 40),
      btnWidth: Math.round(rect.width),
      scrollWidth: btn.scrollWidth
    };
  });
  results.push('BUG 6 - Mobile Journee longue: ' + bug6.verdict + ' | ' + JSON.stringify(bug6));

  // BUG 7 : Mobile - ecologie.gouv.fr tronque
  var bug7 = await page.evaluate(function() {
    var links = Array.from(document.querySelectorAll('a, span'));
    var eco = links.find(function(l) { return l.textContent.indexOf('ecologie') !== -1; });
    if (!eco) return { verdict: 'NON TROUVE' };
    var rect = eco.getBoundingClientRect();
    var vw = window.innerWidth;
    return {
      verdict: (rect.right > vw || eco.scrollWidth > rect.width + 2) ? 'CONFIRME' : 'FAUX POSITIF',
      text: eco.textContent.trim().substring(0, 40),
      width: Math.round(rect.width),
      right: Math.round(rect.right),
      viewport: vw
    };
  });
  results.push('BUG 7 - Mobile ecologie.gouv: ' + bug7.verdict + ' | ' + JSON.stringify(bug7));

  // BUG 8 : Mobile - Manuel tronque
  var bug8 = await page.evaluate(function() {
    var spans = Array.from(document.querySelectorAll('span'));
    var man = spans.find(function(s) { return s.textContent.trim() === 'Manuel'; });
    if (!man) return { verdict: 'NON TROUVE' };
    var rect = man.getBoundingClientRect();
    var vw = window.innerWidth;
    return {
      verdict: (rect.right > vw - 2 || man.scrollWidth > rect.width + 2) ? 'CONFIRME' : 'FAUX POSITIF',
      width: Math.round(rect.width),
      right: Math.round(rect.right),
      viewport: vw
    };
  });
  results.push('BUG 8 - Mobile Manuel tronque: ' + bug8.verdict + ' | ' + JSON.stringify(bug8));

  await browser.close();

  // Resume
  var confirmes = results.filter(function(r) { return r.indexOf('CONFIRME') !== -1; }).length;
  var fauxPos = results.filter(function(r) { return r.indexOf('FAUX POSITIF') !== -1; }).length;
  results.push('');
  results.push('=== RESUME VERIFICATION ===');
  results.push('Confirmes: ' + confirmes);
  results.push('Faux positifs: ' + fauxPos);
  results.push('A corriger: ' + confirmes);

  console.log(results.join('\n'));
})();
