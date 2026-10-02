const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');
const http = require('http');
const { spawn } = require('child_process');

const ROOT = path.join(__dirname, '..');
const PORT = 3100;
let server;
let browser;
let failures = [];
let passed = 0;

function ok(condition, label, detail) {
  if (condition) {
    passed++;
    console.log('  ✓ ' + label);
  } else {
    failures.push(label + (detail ? ': ' + detail : ''));
    console.error('  ✗ ' + label + (detail ? ' — ' + detail : ''));
  }
}

function findChrome() {
  const candidates = [
    process.env.CHROME_PATH,
    process.env.PUPPETEER_EXECUTABLE_PATH,
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    process.env.PREFIX ? path.join(process.env.PREFIX, 'lib/chromium/chromium-launcher.sh') : null
  ].filter(Boolean);
  return candidates.find((p) => fs.existsSync(p));
}

function sleep(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }

function waitHealth() {
  return new Promise(async (resolve, reject) => {
    for (let i = 0; i < 80; i++) {
      const ready = await new Promise((done) => {
        const req = http.get('http://127.0.0.1:' + PORT + '/api/health', (res) => {
          res.resume();
          done(res.statusCode === 200);
        });
        req.on('error', () => done(false));
        req.setTimeout(1000, () => { req.destroy(); done(false); });
      });
      if (ready) return resolve();
      await sleep(250);
    }
    reject(new Error('Serveur non pret'));
  });
}

async function clickByText(page, text) {
  return page.evaluate((wanted) => {
    const el = Array.from(document.querySelectorAll('button')).find((b) => {
      const visible = !!(b.offsetWidth || b.offsetHeight || b.getClientRects().length);
      return visible && (b.textContent || '').trim().toLowerCase().includes(wanted.toLowerCase());
    });
    if (!el) return false;
    el.click();
    return true;
  }, text);
}

async function closeGuide(page) {
  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find((b) => {
      const t = (b.textContent || '').toLowerCase();
      return t.includes('passer le guide') || b.getAttribute('aria-label') === 'Close';
    });
    if (btn) btn.click();
  });
  await sleep(500);
}

(async function main() {
  const chrome = findChrome();
  if (!chrome) {
    console.error('Aucun navigateur Chromium/Chrome trouve pour le parcours E2E.');
    process.exit(1);
  }

  server = spawn(process.execPath, ['server.js'], {
    cwd: ROOT,
    env: { ...process.env, PORT: String(PORT), NODE_ENV: 'test' },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  server.stdout.on('data', (d) => process.stdout.write('[server] ' + d));
  server.stderr.on('data', (d) => process.stderr.write('[server] ' + d));

  try {
    await waitHealth();

    browser = await puppeteer.launch({
      executablePath: chrome,
      headless: true,
      args: ['--no-sandbox', '--disable-dev-shm-usage']
    });

    const page = await browser.newPage();
    const runtimeErrors = [];
    page.on('pageerror', (err) => runtimeErrors.push('pageerror: ' + err.message));
    page.on('console', (msg) => {
      if (msg.type() === 'error') runtimeErrors.push('console: ' + msg.text());
    });

    console.log('\n[Mobile 390x844]');
    await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
    await page.goto('http://127.0.0.1:' + PORT, { waitUntil: 'networkidle0', timeout: 30000 });
    await closeGuide(page);

    ok(!!(await page.$("[data-tour='header']")), 'header visible');

    const overflowMobile = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    ok(overflowMobile <= 2, 'pas de debordement horizontal mobile', String(overflowMobile) + 'px');

    const params = await page.$('button[aria-label="Modifier les parametres"]');
    ok(!!params, 'parametres accessibles');
    if (params) {
      await params.click();
      await page.waitForSelector('#fimo-type-service', { timeout: 3000 });
      await page.select('#fimo-type-service', 'OCCASIONNEL');
      await page.select('#fimo-pays', 'FR');
      const pressed = await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('[aria-labelledby="fimo-equipage-label"] button'));
        return buttons.every((b) => b.hasAttribute('aria-pressed'));
      });
      ok(pressed, 'toggles equipage exposent aria-pressed');
    }

    const templateClicked = await clickByText(page, 'Journee type');
    ok(templateClicked, 'template Journee type utilisable');
    await sleep(350);

    let timeCount = await page.$$eval('input[type="time"]', (els) => els.length);
    ok(timeCount >= 10, 'template charge les activites', String(timeCount) + ' champs horaires');

    const chained = await page.evaluate(() => {
      const inputs = Array.from(document.querySelectorAll('input[type="time"]'));
      if (inputs.length < 3) return false;
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
      setter.call(inputs[1], '06:30');
      inputs[1].dispatchEvent(new Event('input', { bubbles: true }));
      inputs[1].dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    });
    await sleep(250);
    const nextStart = await page.$$eval('input[type="time"]', (els) => els[2] && els[2].value);
    ok(chained && nextStart === '06:30', 'chainage fin -> debut suivant', String(nextStart));

    const duplicateClicked = await clickByText(page, 'Dupliquer');
    ok(duplicateClicked, 'duplication de jour utilisable');
    await sleep(300);
    const hasJ2 = await page.evaluate(() => document.body.innerText.includes('J2'));
    ok(hasJ2, 'navigation multi-jours affiche J2');

    const analyzeButton = await page.$('button[aria-label="Analyser la conformite"]');
    ok(!!analyzeButton, 'action Analyser accessible');
    if (analyzeButton) {
      const disabled = await page.evaluate((b) => b.disabled, analyzeButton);
      ok(!disabled, 'action Analyser active apres saisie');
      if (!disabled) await analyzeButton.click();
    }

    try {
      await page.waitForFunction(
        () => !!document.querySelector('button[aria-label*="detail du score FIMO"]') || document.body.innerText.includes('Score FIMO'),
        { timeout: 30000 }
      );
      ok(true, 'resultat et score affiches');
    } catch {
      ok(false, 'resultat et score affiches');
    }

    const scoreButton = await page.$('button[aria-label*="detail du score FIMO"]');
    ok(!!scoreButton, 'score est un vrai bouton accessible');
    if (scoreButton) {
      const before = await page.evaluate((b) => b.getAttribute('aria-expanded'), scoreButton);
      await scoreButton.focus();
      await page.keyboard.press('Enter');
      await sleep(200);
      const after = await page.evaluate((b) => b.getAttribute('aria-expanded'), scoreButton);
      ok(before !== after, 'score activable au clavier');
    }

    const expand = await page.$('button[aria-label="Voir jauges et timeline"]');
    if (expand) {
      await expand.click();
      await sleep(250);
    }
    const weekClicked = await clickByText(page, 'Semaine');
    if (weekClicked) {
      await sleep(200);
      const weekVisible = await page.evaluate(() => document.body.innerText.includes('Vue semaine'));
      ok(weekVisible, 'vue semaine accessible');
    } else {
      ok(false, 'selecteur Semaine present apres duplication');
    }

    const pdfExists = await page.evaluate(() => Array.from(document.querySelectorAll('button')).some((b) => /pdf|telecharger/i.test(b.textContent || '')));
    ok(pdfExists, 'export PDF expose dans les resultats');

    const histClicked = await page.evaluate(() => {
      const b = Array.from(document.querySelectorAll('button[aria-label^="Historique"]')).find((el) => !!(el.offsetWidth || el.offsetHeight));
      if (!b) return false;
      b.click();
      return true;
    });
    ok(histClicked, 'historique ouvrable');
    if (histClicked) {
      await page.waitForSelector('[role="dialog"][aria-label="Historique des analyses"]', { timeout: 3000 });
      ok(true, 'historique expose comme dialogue');
      const close = await page.$('button[aria-label="Fermer l\'historique"]');
      if (close) await close.click();
    }

    const theme = await page.$('button[aria-label="Mode clair"], button[aria-label="Mode sombre"]');
    ok(!!theme, 'toggle de theme accessible');
    if (theme) {
      const before = await page.evaluate((b) => b.getAttribute('aria-label'), theme);
      await theme.click();
      await sleep(150);
      const after = await page.evaluate((b) => b.getAttribute('aria-label'), b = theme).catch(() => null);
      ok(before !== after || after === null, 'theme reagit au clic');
    }

    const smallTargets = await page.evaluate(() => {
      const els = Array.from(document.querySelectorAll('button, input, select'))
        .filter((el) => {
          const r = el.getBoundingClientRect();
          const style = getComputedStyle(el);
          return style.display !== 'none' && style.visibility !== 'hidden' && r.width > 0 && r.height > 0;
        });
      return els
        .map((el) => {
          const r = el.getBoundingClientRect();
          return { tag: el.tagName, text: (el.getAttribute('aria-label') || el.textContent || '').trim().slice(0, 40), w: r.width, h: r.height };
        })
        .filter((x) => x.h < 44 || x.w < 44)
        .slice(0, 20);
    });
    ok(smallTargets.length === 0, 'cibles interactives principales >= 44px', JSON.stringify(smallTargets));

    console.log('\n[Desktop 1280x900]');
    await page.setViewport({ width: 1280, height: 900, isMobile: false, hasTouch: false });
    await page.reload({ waitUntil: 'networkidle0', timeout: 30000 });
    await closeGuide(page);
    const overflowDesktop = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    ok(overflowDesktop <= 2, 'pas de debordement horizontal desktop', String(overflowDesktop) + 'px');
    ok(!!(await page.$("[data-tour='header']")), 'desktop charge sans ecran blanc');

    const meaningfulErrors = runtimeErrors.filter((e) => !/favicon|Failed to load resource.*404/i.test(e));
    ok(meaningfulErrors.length === 0, 'aucune erreur runtime navigateur', meaningfulErrors.join(' | '));

  } catch (err) {
    failures.push('Erreur fatale E2E: ' + err.message);
    console.error(err.stack || err.message);
  } finally {
    if (browser) await browser.close();
    if (server) {
      server.kill('SIGTERM');
      await sleep(250);
      if (!server.killed) server.kill('SIGKILL');
    }
  }

  console.log('\n=== PARCOURS QA ===');
  console.log('Reussis: ' + passed);
  console.log('Echecs: ' + failures.length);
  failures.forEach((f) => console.log(' - ' + f));
  process.exit(failures.length ? 1 : 0);
})();
