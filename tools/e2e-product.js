'use strict';

const fs = require('fs');
const http = require('http');
const { spawn } = require('child_process');
const puppeteer = require('puppeteer-core');

const PORT = 3100;
const BASE = 'http://localhost:' + PORT;
let server;

function assert(condition, message) {
  if (!condition) throw new Error(message);
  console.log('✓ ' + message);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function request(pathname, options) {
  options = options || {};
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: 'localhost',
      port: PORT,
      path: pathname,
      method: options.method || 'GET',
      headers: options.headers || {}
    }, (res) => {
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => resolve({
        status: res.statusCode,
        headers: res.headers,
        body: Buffer.concat(chunks)
      }));
    });
    req.on('error', reject);
    if (options.body) req.write(options.body);
    req.end();
  });
}

async function waitServer() {
  for (let i = 0; i < 50; i++) {
    try {
      const r = await request('/api/health');
      if (r.status === 200) return;
    } catch (_) {}
    await sleep(200);
  }
  throw new Error('Serveur E2E non disponible');
}

function findBrowser() {
  const candidates = [
    process.env.PUPPETEER_EXECUTABLE_PATH,
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser'
  ].filter(Boolean);
  return candidates.find((p) => fs.existsSync(p));
}

async function clickByText(page, selector, needle) {
  return page.evaluate((sel, text) => {
    const el = Array.from(document.querySelectorAll(sel))
      .find((node) => (node.textContent || '').toLowerCase().includes(text.toLowerCase()));
    if (!el) return false;
    el.click();
    return true;
  }, selector, needle);
}

async function main() {
  server = spawn(process.execPath, ['server.js'], {
    env: { ...process.env, PORT: String(PORT), NODE_ENV: 'test' },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  server.stderr.on('data', (data) => process.stderr.write('[server] ' + data));
  await waitServer();

  const health = await request('/api/health');
  assert(health.status === 200, 'health endpoint repond 200');
  assert(Boolean(health.headers['content-security-policy']), 'CSP presente');
  assert(!health.headers['x-powered-by'], 'X-Powered-By absent');

  const badCors = await request('/api/health', { headers: { Origin: 'https://evil.example' } });
  assert(badCors.status === 403, 'origine CORS externe refusee');

  const sameCors = await request('/api/health', { headers: { Origin: BASE } });
  assert(sameCors.status === 200, 'origine same-host autorisee');

  const badPdfBody = JSON.stringify({ resultat: { nope: true } });
  const badPdf = await request('/api/rapport/pdf', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(badPdfBody) },
    body: badPdfBody
  });
  assert(badPdf.status === 400, 'PDF invalide refuse en 400');

  const browserPath = findBrowser();
  assert(Boolean(browserPath), 'navigateur Chrome/Chromium disponible pour E2E');

  const browser = await puppeteer.launch({
    executablePath: browserPath,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  const runtimeErrors = [];
  page.on('pageerror', (err) => runtimeErrors.push('pageerror: ' + err.message));
  page.on('console', (msg) => {
    if (msg.type() === 'error') runtimeErrors.push('console: ' + msg.text());
  });

  await page.evaluateOnNewDocument(() => {
    localStorage.setItem('rse_onboarding_done', 'true');
    localStorage.setItem('rse_theme', 'dark');
  });

  await page.setViewport({ width: 375, height: 812, isMobile: true, hasTouch: true });
  await page.goto(BASE, { waitUntil: 'networkidle0', timeout: 30000 });

  assert(await page.$('[data-tour="header"]'), 'header visible sur mobile');
  assert((await page.title()).includes('FIMO Check'), 'titre de page FIMO Check');

  const layout = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
    countryOptions: document.querySelectorAll('#pays-reglementation option').length,
    hasServiceLabel: Boolean(document.querySelector('label[for="type-service"]')),
    hasCountryLabel: Boolean(document.querySelector('label[for="pays-reglementation"]'))
  }));
  assert(layout.scrollWidth <= layout.innerWidth + 2, 'aucun debordement horizontal mobile initial');
  assert(layout.countryOptions >= 29, '29 pays accessibles dans le selecteur');
  assert(layout.hasServiceLabel && layout.hasCountryLabel, 'selecteurs associes a leurs labels');

  const templateClicked = await clickByText(page, 'button', 'Journee type');
  assert(templateClicked, 'template Journee type cliquable');
  await sleep(250);
  assert((await page.$('input[type="time"]')).length >= 2, 'horaires du template charges');

  const mobileTargets = await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('[class*="mobileActivityButton"]'));
    return {
      count: buttons.length,
      minHeights: buttons.map((b) => b.getBoundingClientRect().height)
    };
  });
  assert(mobileTargets.count >= 3, 'liste tactile mobile des activites disponible');
  assert(mobileTargets.minHeights.every((h) => h >= 44), 'cibles timeline mobile >= 44px');

  await page.waitForFunction(() => {
    const b = document.querySelector('button[aria-label="Analyser la conformite"]');
    return b && !b.disabled;
  }, { timeout: 15000 });
  await page.click('button[aria-label="Analyser la conformite"]');

  await page.waitForFunction(() => document.body.innerText.includes('Score FIMO'), { timeout: 30000 });
  assert(true, 'analyse UI terminee et score affiche');

  const resultState = await page.evaluate(() => ({
    session: sessionStorage.getItem('fimo_resultat'),
    selectedResults: Array.from(document.querySelectorAll('[role="tab"]'))
      .some((el) => el.textContent.includes('Resultats') && el.getAttribute('aria-selected') === 'true'),
    historyCount: (() => {
      try { return JSON.parse(localStorage.getItem('rse_rsn_historique') || '[]').length; }
      catch (_) { return -1; }
    })()
  }));
  assert(Boolean(resultState.session), 'resultat persiste en session');
  assert(resultState.selectedResults, 'onglet Resultats selectionne apres analyse');
  assert(resultState.historyCount >= 1, 'analyse ajoutee a historique');

  const pdfProbe = await page.evaluate(async () => {
    const resultat = JSON.parse(sessionStorage.getItem('fimo_resultat'));
    const response = await fetch('/api/rapport/pdf', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resultat, options: {} })
    });
    const buffer = new Uint8Array(await response.arrayBuffer());
    return {
      status: response.status,
      type: response.headers.get('content-type'),
      magic: String.fromCharCode(...buffer.slice(0, 5)),
      size: buffer.length
    };
  });
  assert(pdfProbe.status === 200, 'endpoint PDF repond 200 avec un vrai resultat');
  assert((pdfProbe.type || '').includes('application/pdf'), 'PDF retourne le bon Content-Type');
  assert(pdfProbe.magic === '%PDF-', 'PDF binaire valide');
  assert(pdfProbe.size > 1000, 'PDF non vide');

  const scoreSelector = '[role="button"][aria-label="Afficher ou masquer le detail du resultat"]';
  const scoreEl = await page.$(scoreSelector);
  assert(Boolean(scoreEl), 'score detail accessible comme controle clavier');
  const beforeExpanded = await page.$eval(scoreSelector, (el) => el.getAttribute('aria-expanded'));
  await scoreEl.focus();
  await page.keyboard.press('Enter');
  const afterExpanded = await page.$eval(scoreSelector, (el) => el.getAttribute('aria-expanded'));
  assert(beforeExpanded !== afterExpanded, 'score detail basculable au clavier');

  const themeButton = await page.$('button[aria-label="Mode clair"]');
  assert(Boolean(themeButton), 'toggle theme expose un nom accessible');
  await themeButton.click();
  await page.waitForFunction(() => document.documentElement.getAttribute('data-theme') === 'light');
  assert(true, 'theme clair applique et observable');

  const historyClicked = await page.evaluate(() => {
    const candidates = Array.from(document.querySelectorAll('button'));
    const button = candidates.find((b) => (b.getAttribute('aria-label') || '').startsWith('Historique'));
    if (!button) return false;
    button.click();
    return true;
  });
  assert(historyClicked, 'historique ouvrable sur mobile');
  await page.waitForSelector('[role="dialog"][aria-label="Historique des analyses"]', { timeout: 5000 });
  assert(true, 'historique expose comme dialogue modal');
  await page.keyboard.press('Escape');
  await sleep(100);

  const mobileAfter = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth
  }));
  assert(mobileAfter.scrollWidth <= mobileAfter.innerWidth + 2, 'aucun debordement horizontal mobile apres resultat');

  await page.setViewport({ width: 1280, height: 900, isMobile: false, hasTouch: false });
  await page.reload({ waitUntil: 'networkidle0' });
  const desktop = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
    theme: document.documentElement.getAttribute('data-theme'),
    hasDesktopAnalyze: Array.from(document.querySelectorAll('button'))
      .some((b) => b.textContent.includes('Analyser la conformite'))
  }));
  assert(desktop.scrollWidth <= desktop.innerWidth + 2, 'aucun debordement horizontal desktop');
  assert(desktop.theme === 'light', 'theme persiste apres reload');
  assert(desktop.hasDesktopAnalyze, 'action Analyser disponible sur desktop');

  await browser.close();

  const significantErrors = runtimeErrors.filter((msg) =>
    !msg.includes('Failed to load resource') &&
    !msg.includes('favicon')
  );
  assert(significantErrors.length === 0, 'aucune erreur runtime navigateur: ' + significantErrors.join(' | '));

  console.log('\nE2E produit: OK');
}

main()
  .catch((err) => {
    console.error('\nE2E produit: ECHEC');
    console.error(err && err.stack ? err.stack : err);
    process.exitCode = 1;
  })
  .finally(() => {
    if (server) {
      try { server.kill('SIGTERM'); } catch (_) {}
    }
  });
