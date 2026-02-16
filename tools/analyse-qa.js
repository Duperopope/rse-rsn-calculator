const puppeteer = require('puppeteer-core');
const path = require('path');
const HOME = process.env.HOME || '/data/data/com.termux/files/home';
const SCREENSHOTS = path.join(HOME, 'fimo-screenshots');

function sleep(ms) { return new Promise(function(r) { setTimeout(r, ms); }); }

(async () => {
  try {
    var browser = await puppeteer.launch({
      executablePath: process.env.PREFIX + '/lib/chromium/chromium-launcher.sh',
      headless: true,
      args: ['--no-sandbox','--disable-gpu','--disable-setuid-sandbox','--single-process']
    });

    var page = await browser.newPage();
    await page.setViewport({width:1280, height:900});
    await page.goto('http://localhost:3001', {timeout:20000, waitUntil:'networkidle2'});

    // Fermer le tour guide si present
    await sleep(2000);
    var closed = await page.evaluate(function() {
      var btns = Array.from(document.querySelectorAll('button'));
      var closeBtn = btns.find(function(b) {
        return b.getAttribute('aria-label') === 'Close' || b.textContent.indexOf('Passer') !== -1;
      });
      if (closeBtn) { closeBtn.click(); return true; }
      return false;
    });
    console.log('Tour guide ferme: ' + closed);
    await sleep(1000);

    // === BOUTONS ===
    var buttons = await page.evaluate(function() {
      return Array.from(document.querySelectorAll('button')).map(function(b) {
        var rect = b.getBoundingClientRect();
        var style = window.getComputedStyle(b);
        var isJR = (b.closest('.react-joyride') !== null) || (b.className.indexOf('joyride') !== -1);
        return {
          text: b.textContent.trim().substring(0,50),
          width: Math.round(rect.width),
          height: Math.round(rect.height),
          visible: style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0',
          joyride: isJR
        };
      }).filter(function(b) { return b.visible; });
    });

    console.log('\n=== BOUTONS VISIBLES (hors joyride) ===');
    var vraisProblemes = 0;
    buttons.forEach(function(b) {
      if (b.joyride) return;
      /* bottomBar-filter */ var isBottomBar = (b.text === 'Analyser' || b.text === 'Historique' || b.text === 'Haut' || b.text === '?' || b.text === ''); if (isBottomBar && b.width === 0) { console.log('IGNORE | 0x0 | "' + b.text + '" (BottomBar hidden desktop)'); return; } var status = (b.width === 0 || b.height === 0) ? 'PROBLEME' : 'OK';
      if (status === 'PROBLEME') vraisProblemes++;
      console.log(status + ' | ' + b.width + 'x' + b.height + ' | "' + b.text + '"');
    });

    // === TEXTES DESKTOP ===
    var tinyDesktop = await page.evaluate(function() {
      return Array.from(document.querySelectorAll('span, p, label, h1, h2, h3, h4, a, div')).filter(function(el) {
        if (el.closest('.react-joyride') !== null) return false;
        var style = window.getComputedStyle(el);
        if (style.display === 'none' || style.visibility === 'hidden') return false;
        var size = parseFloat(style.fontSize);
        var text = el.textContent.trim();
        return size < 10 && text.length > 0 && text.length < 50;
      }).map(function(el) {
        return {
          tag: el.tagName,
          text: el.textContent.trim().substring(0,40),
          fontSize: parseFloat(window.getComputedStyle(el).fontSize).toFixed(1),
          classes: el.className.substring(0,60)
        };
      });
    });

    console.log('\n=== TEXTES < 10px DESKTOP (hors joyride) ===');
    if (tinyDesktop.length === 0) {
      console.log('Aucun texte trop petit - DESKTOP LISIBLE');
    } else {
      tinyDesktop.forEach(function(t) {
        console.log(t.fontSize + 'px | <' + t.tag + '> "' + t.text + '" | .' + t.classes);
      });
    }

    // === OVERFLOWS DESKTOP ===
    var overflows = await page.evaluate(function() {
      var vw = window.innerWidth;
      return Array.from(document.querySelectorAll('*')).filter(function(el) {
        if (el.closest('.react-joyride') !== null) return false;
        return el.getBoundingClientRect().width > vw + 5;
      }).map(function(el) {
        return {
          tag: el.tagName,
          classes: el.className.substring(0,60),
          width: Math.round(el.getBoundingClientRect().width)
        };
      });
    });

    console.log('\n=== OVERFLOWS DESKTOP (hors joyride) ===');
    if (overflows.length === 0) {
      console.log('Aucun overflow - MISE EN PAGE OK');
    } else {
      overflows.forEach(function(o) {
        console.log('OVERFLOW: <' + o.tag + '> .' + o.classes + ' = ' + o.width + 'px');
      });
    }

    await page.screenshot({path: SCREENSHOTS + '/accueil-clean-desktop.png', fullPage: true});
    console.log('\nScreenshot desktop OK');

    // === MOBILE ===
    await page.setViewport({width:375, height:812, isMobile:true});
    await page.reload({waitUntil:'networkidle2'});
    await sleep(2000);
    await page.evaluate(function() {
      var btns = Array.from(document.querySelectorAll('button'));
      var closeBtn = btns.find(function(b) {
        return b.getAttribute('aria-label') === 'Close' || b.textContent.indexOf('Passer') !== -1;
      });
      if (closeBtn) closeBtn.click();
    });
    await sleep(1000);

    var tinyMobile = await page.evaluate(function() {
      return Array.from(document.querySelectorAll('span, p, label, a, button, div')).filter(function(el) {
        if (el.closest('.react-joyride') !== null) return false;
        var s = window.getComputedStyle(el);
        if (s.display === 'none') return false;
        var sz = parseFloat(s.fontSize);
        var t = el.textContent.trim();
        return sz < 10 && t.length > 0 && t.length < 50;
      }).map(function(el) {
        return {
          tag: el.tagName,
          text: el.textContent.trim().substring(0,40),
          fontSize: parseFloat(window.getComputedStyle(el).fontSize).toFixed(1)
        };
      });
    });

    console.log('\n=== TEXTES MOBILE < 10px (hors joyride) ===');
    if (tinyMobile.length === 0) {
      console.log('Aucun - MOBILE LISIBLE');
    } else {
      tinyMobile.forEach(function(t) {
        console.log(t.fontSize + 'px | <' + t.tag + '> "' + t.text + '"');
      });
    }

    await page.screenshot({path: SCREENSHOTS + '/accueil-clean-mobile.png', fullPage: true});
    console.log('Screenshot mobile OK');

    // === RESUME ===
    console.log('\n========== RESUME ==========');
    console.log('Boutons 0x0 (vrais): ' + vraisProblemes);
    console.log('Textes < 10px desktop: ' + tinyDesktop.length);
    console.log('Textes < 10px mobile: ' + tinyMobile.length);
    console.log('Overflows desktop: ' + overflows.length);
    var total = vraisProblemes + tinyDesktop.length + tinyMobile.length + overflows.length;
    if (total === 0) {
      console.log('VERDICT: ZERO VRAI PROBLEME');
    } else {
      console.log('VERDICT: ' + total + ' VRAIS PROBLEMES a corriger');
    }

    await browser.close();
  } catch(e) {
    console.log('ERREUR: ' + e.message);
  }
})();
