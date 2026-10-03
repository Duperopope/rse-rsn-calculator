'use strict';

const fs = require('fs');
const http = require('http');
const { spawn } = require('child_process');
const puppeteer = require('puppeteer-core');
const axe = require('axe-core');

const PORT = 3100;
const BASE = 'http://localhost:' + PORT;
let server;
let browser;
const watchdog = setTimeout(() => {
  console.error('\nE2E produit: TIMEOUT global apres 120s');
  try { if (server) server.kill('SIGKILL'); } catch (_) {}
  process.exit(2);
}, 120000);

function assert(condition, message) {
  if (!condition) throw new Error(message);
  console.log('✓ ' + message);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseRgb(value) {
  const match = String(value || '').match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
  return match ? [Number(match[1]), Number(match[2]), Number(match[3])] : null;
}

function luminance(rgb) {
  const values = rgb.map((v) => {
    const n = v / 255;
    return n <= 0.03928 ? n / 12.92 : Math.pow((n + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * values[0] + 0.7152 * values[1] + 0.0722 * values[2];
}

function contrastRatio(foreground, background) {
  const fg = parseRgb(foreground);
  const bg = parseRgb(background);
  if (!fg || !bg) return 0;
  const l1 = luminance(fg);
  const l2 = luminance(bg);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

async function assertNoHorizontalOverflow(page, label) {
  const layout = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
    innerWidth: window.innerWidth
  }));
  assert(layout.scrollWidth <= Math.max(layout.clientWidth, layout.innerWidth) + 2, label);
}

async function assertNoSeriousA11yViolations(page, label) {
  await page.evaluate(axe.source);
  const results = await page.evaluate(async () => window.axe.run(document, {
    runOnly: {
      type: 'tag',
      values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']
    }
  }));
  const blocking = results.violations.filter((violation) =>
    violation.impact === 'critical' || violation.impact === 'serious'
  );
  if (blocking.length) {
    const summary = blocking.map((violation) =>
      violation.id + ': ' + violation.nodes.slice(0, 3).map((node) => node.target.join(' ')).join(', ')
    ).join(' | ');
    throw new Error(label + ' — violations Axe: ' + summary);
  }
  console.log('✓ ' + label + ' — Axe serious/critical: 0');
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

  // The app keeps its CSP; Puppeteer bypasses it only so axe-core can be injected by DevTools.

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

  const unknownApi = await request('/api/cette-route-n-existe-pas');
  assert(unknownApi.status === 404, 'endpoint API inconnu refuse en 404');

  const malformedJson = await request('/api/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Length': '1' },
    body: '{'
  });
  assert(malformedJson.status === 400, 'JSON malforme refuse en 400');

  const oversizedPayload = JSON.stringify({ csv: 'x'.repeat(2 * 1024 * 1024 + 4096) });
  const oversized = await request('/api/analyze', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(oversizedPayload)
    },
    body: oversizedPayload
  });
  assert(oversized.status === 413, 'payload JSON au-dela de la limite refuse en 413');

  const browserPath = findBrowser();
  assert(Boolean(browserPath), 'navigateur Chrome/Chromium disponible pour E2E');

  browser = await puppeteer.launch({
    executablePath: browserPath,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setBypassCSP(true);
  const runtimeErrors = [];
  page.on('pageerror', (err) => runtimeErrors.push('pageerror: ' + err.message));
  page.on('console', (msg) => {
    if (msg.type() === 'error') runtimeErrors.push('console: ' + msg.text());
  });

  await page.evaluateOnNewDocument(() => {
    try {
      localStorage.setItem('rse_onboarding_done', 'true');
      if (!localStorage.getItem('rse_theme')) {
        localStorage.setItem('rse_theme', 'dark');
      }
    } catch (_) {
      // about:blank and opaque documents may deny storage before navigation.
    }
  });

  await page.setViewport({ width: 375, height: 812, isMobile: true, hasTouch: true });
  await page.goto(BASE, { waitUntil: 'networkidle0', timeout: 30000 });

  assert(await page.$('[data-tour="header"]'), 'header visible sur mobile');
  assert((await page.title()).includes('FIMO Check'), 'titre de page FIMO Check');

  const darkThemeColors = await page.evaluate(() => {
    const style = getComputedStyle(document.body);
    return { color: style.color, background: style.backgroundColor };
  });
  assert(contrastRatio(darkThemeColors.color, darkThemeColors.background) >= 4.5, 'contraste texte principal dark >= 4.5:1');

  const paramsButton = await page.$('button[aria-label="Modifier les parametres"]');
  assert(Boolean(paramsButton), 'panneau parametres accessible');
  await paramsButton.click();
  await page.waitForSelector('#pays-reglementation');

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
  await assertNoSeriousA11yViolations(page, 'accessibilite ecran de saisie mobile');

  const templateClicked = await clickByText(page, 'button', 'Journee type');
  assert(templateClicked, 'template Journee type cliquable');
  await page.waitForFunction(() => {
    const selectedTemplate = Array.from(document.querySelectorAll('[data-tour="templates"] button'))
      .some((button) => button.getAttribute('aria-pressed') === 'true');
    const rows = document.querySelectorAll('[data-activite-index]').length;
    const timeInputs = document.querySelectorAll('input[type="time"]').length;
    return selectedTemplate && (rows >= 2 || timeInputs >= 2);
  }, { timeout: 5000 });
  assert(true, 'template applique et activites chargees');

  const formTargets = await page.evaluate(() => {
    const rows = Array.from(document.querySelectorAll('[data-activite-index]'));
    const buttons = Array.from(document.querySelectorAll('[data-tour="templates"] button'));
    return {
      rows: rows.length,
      templateHeights: buttons.map((b) => b.getBoundingClientRect().height)
    };
  });
  assert(formTargets.rows >= 2, 'activites du template presentes dans le formulaire');
  assert(formTargets.templateHeights.every((h) => h >= 44), 'cibles tactiles des templates >= 44px');

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
  await sleep(650);
  await assertNoSeriousA11yViolations(page, 'accessibilite ecran de resultats mobile');

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
  const lightThemeColors = await page.evaluate(() => {
    const style = getComputedStyle(document.body);
    return { color: style.color, background: style.backgroundColor };
  });
  assert(contrastRatio(lightThemeColors.color, lightThemeColors.background) >= 4.5, 'contraste texte principal light >= 4.5:1');

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

  const responsiveMatrix = [
    { width: 320, height: 568, mobile: true, touch: true, label: '320x568' },
    { width: 375, height: 812, mobile: true, touch: true, label: '375x812' },
    { width: 430, height: 932, mobile: true, touch: true, label: '430x932' },
    { width: 768, height: 1024, mobile: false, touch: true, label: '768x1024' },
    { width: 1024, height: 768, mobile: false, touch: false, label: '1024x768 paysage' },
    { width: 1440, height: 900, mobile: false, touch: false, label: '1440x900' },
    { width: 1920, height: 1080, mobile: false, touch: false, label: '1920x1080' }
  ];

  for (const viewport of responsiveMatrix) {
    await page.setViewport({
      width: viewport.width,
      height: viewport.height,
      isMobile: viewport.mobile,
      hasTouch: viewport.touch
    });
    await sleep(100);
    await assertNoHorizontalOverflow(page, 'aucun debordement horizontal ' + viewport.label);
  }

  await page.setViewport({ width: 1280, height: 900, isMobile: false, hasTouch: false });
  await page.reload({ waitUntil: 'networkidle0' });
  const desktop = await page.evaluate(() => ({
    theme: document.documentElement.getAttribute('data-theme'),
    hasDesktopAnalyze: Array.from(document.querySelectorAll('button'))
      .some((b) => b.textContent.includes('Analyser la conformite'))
  }));
  await assertNoHorizontalOverflow(page, 'aucun debordement horizontal desktop apres reload');
  assert(desktop.theme === 'light', 'theme persiste apres reload');
  assert(desktop.hasDesktopAnalyze, 'action Analyser disponible sur desktop');
  await assertNoSeriousA11yViolations(page, 'accessibilite desktop');

  const corruptedPage = await browser.newPage();
  await corruptedPage.evaluateOnNewDocument(() => {
    try {
      localStorage.setItem('rse_onboarding_done', 'true');
      localStorage.setItem('rse_jours', '{invalide');
      localStorage.setItem('rse_jours2', 'pas-du-json');
    } catch (_) {}
  });
  await corruptedPage.setViewport({ width: 375, height: 812, isMobile: true, hasTouch: true });
  await corruptedPage.goto(BASE, { waitUntil: 'networkidle0', timeout: 30000 });
  assert(Boolean(await corruptedPage.$('[data-tour="header"]')), 'stockage local corrompu ne bloque pas le chargement');
  await corruptedPage.close();

  const swReady = await page.evaluate(async () => {
    if (!('serviceWorker' in navigator)) return false;
    const registration = await navigator.serviceWorker.ready;
    return Boolean(registration && registration.active);
  });
  assert(swReady, 'service worker actif');
  await page.reload({ waitUntil: 'networkidle0' });
  const swControlled = await page.evaluate(() => Boolean(navigator.serviceWorker && navigator.serviceWorker.controller));
  assert(swControlled, 'page controlee par le service worker');
  await page.setOfflineMode(true);
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 15000 });
  assert(Boolean(await page.$('[data-tour="header"]')), 'app shell disponible hors ligne');
  await page.setOfflineMode(false);
  await page.reload({ waitUntil: 'networkidle0' });

  await browser.close();
  browser = null;

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
  .finally(async () => {
    clearTimeout(watchdog);
    if (browser) {
      try { await browser.close(); } catch (_) {}
      browser = null;
    }
    if (server) {
      try { server.kill('SIGTERM'); } catch (_) {}
      server = null;
    }
  });
