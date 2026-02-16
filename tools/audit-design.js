var puppeteer = require('puppeteer-core');
function sleep(ms) { return new Promise(function(r) { setTimeout(r, ms); }); }

(async function() {
  var ok = [];
  var warns = [];
  var fails = [];
  var browser;

  try {
    browser = await puppeteer.launch({
      executablePath: process.env.PREFIX + '/lib/chromium/chromium-launcher.sh',
      headless: true,
      args: ['--no-sandbox', '--disable-gpu', '--disable-setuid-sandbox', '--single-process']
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
      var b = Array.from(document.querySelectorAll('button')).find(function(x) { return x.textContent.includes('longue'); });
      if (b) b.click();
    });
    await sleep(1000);

    console.log('[1/7] Touch targets...');
    var t1 = await page.evaluate(function() {
      var btns = document.querySelectorAll('button, a, [role="button"], input[type="submit"]');
      var small = [];
      var total = 0;
      btns.forEach(function(b) {
        var r = b.getBoundingClientRect();
        if (r.width === 0 && r.height === 0) return;
        total++;
        if (r.width < 44 || r.height < 44) {
          small.push({ text: (b.textContent || '').substring(0, 25).trim(), w: Math.round(r.width), h: Math.round(r.height) });
        }
      });
      return { total: total, small: small };
    });
    if (t1.small.length === 0) { ok.push('Touch targets: ' + t1.total + '/' + t1.total + ' >= 44x44px'); }
    else { warns.push('Touch < 44px: ' + t1.small.length + '/' + t1.total); t1.small.slice(0, 5).forEach(function(s) { warns.push('  "' + s.text + '" = ' + s.w + 'x' + s.h + 'px'); }); }

    console.log('[2/7] Font size...');
    var t2 = await page.evaluate(function() {
      var all = document.querySelectorAll('*');
      var small = [];
      all.forEach(function(el) {
        if (!el.textContent || !el.textContent.trim()) return;
        if (el.children.length > 0 && el.children[0].textContent === el.textContent) return;
        var s = window.getComputedStyle(el);
        var sz = parseFloat(s.fontSize);
        var r = el.getBoundingClientRect();
        if (isNaN(sz) || r.width === 0) return;
        if (sz < 12) { small.push({ text: el.textContent.substring(0, 30).trim(), size: Math.round(sz * 10) / 10 }); }
      });
      return { small: small };
    });
    if (t2.small.length === 0) { ok.push('Font size: tous >= 12px'); }
    else { fails.push('Font < 12px: ' + t2.small.length); t2.small.slice(0, 5).forEach(function(s) { fails.push('  "' + s.text + '" = ' + s.size + 'px'); }); }

    console.log('[3/7] Contraste...');
    var t3 = await page.evaluate(function() {
      function lum(r, g, b) { var a = [r,g,b].map(function(v) { v=v/255; return v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4); }); return 0.2126*a[0]+0.7152*a[1]+0.0722*a[2]; }
      function parse(s) { var m=s.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/); return m?{r:+m[1],g:+m[2],b:+m[3]}:null; }
      function ratio(c1,c2) { var l1=lum(c1.r,c1.g,c1.b),l2=lum(c2.r,c2.g,c2.b); return (Math.max(l1,l2)+0.05)/(Math.min(l1,l2)+0.05); }
      var els = document.querySelectorAll('p,span,h1,h2,h3,h4,button,label,a,strong');
      var low = [];
      var total = 0;
      els.forEach(function(el) {
        if (!el.textContent.trim()) return;
        var r = el.getBoundingClientRect();
        if (r.width === 0) return;
        var s = window.getComputedStyle(el);
        var fg = parse(s.color);
        var bg = parse(s.backgroundColor);
        if (!fg || !bg) return;
        var bgStr=s.backgroundColor; if (bgStr.indexOf("rgba")!==-1) { var alphaMatch=bgStr.match(/,\s*([\d.]+)\s*\)/); if (alphaMatch && parseFloat(alphaMatch[1])<0.3) return; }
        total++;
        var rat = ratio(fg, bg);
        if (rat < 4.5) { low.push({ text: el.textContent.substring(0,25).trim(), ratio: Math.round(rat*10)/10 }); }
      });
      return { total: total, low: low };
    });
    if (t3.low.length === 0) { ok.push('Contraste: ' + t3.total + '/' + t3.total + ' >= 4.5:1'); }
    else { warns.push('Contraste < 4.5:1: ' + t3.low.length + '/' + t3.total); t3.low.slice(0, 5).forEach(function(c) { warns.push('  "' + c.text + '" ratio=' + c.ratio); }); }

    console.log('[4/7] Scroll horizontal...');
    var hScroll = await page.evaluate(function() { return document.documentElement.scrollWidth > document.documentElement.clientWidth; });
    if (!hScroll) { ok.push('Scroll horizontal: aucun'); } else { fails.push('Scroll horizontal detecte'); }

    console.log('[5/7] Espacement boutons...');
    var t5 = await page.evaluate(function() {
      var btns = Array.from(document.querySelectorAll('button')).filter(function(b) { var r=b.getBoundingClientRect(); return r.width>0&&r.height>0; });
      var close = [];
      for (var i=0; i<btns.length; i++) { for (var j=i+1; j<btns.length; j++) {
        var r1=btns[i].getBoundingClientRect(), r2=btns[j].getBoundingClientRect();
        var hG=Math.max(0,Math.max(r2.left-r1.right,r1.left-r2.right));
        var vG=Math.max(0,Math.max(r2.top-r1.bottom,r1.top-r2.bottom));
        if (hG<8&&vG<8&&(hG+vG)>0) { close.push({ b1:(btns[i].textContent||'').substring(0,15).trim(), b2:(btns[j].textContent||'').substring(0,15).trim(), gap:Math.round(Math.min(hG,vG)) }); }
      }}
      return { total: btns.length, close: close.slice(0,5) };
    });
    if (t5.close.length === 0) { ok.push('Espacement boutons: tous >= 8px'); }
    else { warns.push('Boutons proches < 8px: ' + t5.close.length); t5.close.forEach(function(s) { warns.push('  "' + s.b1 + '" <-> "' + s.b2 + '" = ' + s.gap + 'px'); }); }

    console.log('[6/7] Padding conteneurs...');
    var t6 = await page.evaluate(function() {
      var cs = document.querySelectorAll('[class*="card"],[class*="Card"],[class*="panel"],[class*="Panel"],main,section');
      var low = [];
      cs.forEach(function(c) {
        var s = window.getComputedStyle(c);
        var pl=parseFloat(s.paddingLeft)||0, pr=parseFloat(s.paddingRight)||0;
        if (c.getBoundingClientRect().width===0) return;
        if (pl<12||pr<12) { low.push({ cls:(c.className||'').substring(0,30), pl:Math.round(pl), pr:Math.round(pr) }); }
      });
      return { total: cs.length, low: low.slice(0,5) };
    });
    if (t6.low.length === 0) { ok.push('Padding conteneurs: tous >= 12px'); }
    else { warns.push('Padding faible: ' + t6.low.length); t6.low.forEach(function(p) { warns.push('  "' + p.cls + '" L:' + p.pl + 'px R:' + p.pr + 'px'); }); }

    console.log('[7/7] Interligne...');
    var t7 = await page.evaluate(function() {
      var els = document.querySelectorAll('p,span,li,td,label');
      var low = [];
      els.forEach(function(el) {
        if (!el.textContent.trim()) return;
        if (el.getBoundingClientRect().width===0) return;
        var s=window.getComputedStyle(el);
        var fs=parseFloat(s.fontSize), lh=parseFloat(s.lineHeight);
        if (isNaN(fs)||isNaN(lh)||fs===0) return;
        if (lh/fs<1.3) { low.push({ text:el.textContent.substring(0,25).trim(), ratio:Math.round(lh/fs*100)/100 }); }
      });
      return { low: low.slice(0,5) };
    });
    if (t7.low.length === 0) { ok.push('Interligne: tous >= 1.3x'); }
    else { warns.push('Interligne < 1.3x: ' + t7.low.length); t7.low.forEach(function(l) { warns.push('  "' + l.text + '" ratio=' + l.ratio); }); }

  } catch(e) { fails.push('Erreur: ' + e.message.substring(0, 100)); }
  if (browser) await browser.close();

  console.log('\n========================================');
  console.log('  AUDIT DESIGN — FIMO Check');
  console.log('  Material Design 3 + WCAG 2.2');
  console.log('========================================\n');
  console.log('OK: ' + ok.length);
  ok.forEach(function(o) { console.log('  ✓ ' + o); });
  if (warns.length) { console.log('\nWARNINGS: ' + warns.length); warns.forEach(function(w) { console.log('  ⚠ ' + w); }); }
  if (fails.length) { console.log('\nFAILS: ' + fails.length); fails.forEach(function(f) { console.log('  ✗ ' + f); }); }
  var score = Math.round(ok.length / (ok.length + (warns.length > 0 ? 1 : 0) + fails.length) * 100);
  console.log('\nScore: ' + score + '%');
  if (fails.length === 0 && warns.length <= 2) { console.log('DESIGN ACCEPTABLE'); }
  else if (fails.length === 0) { console.log('DESIGN A AMELIORER'); }
  else { console.log('NON CONFORME'); }
})();
