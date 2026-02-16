/**
 * FIMO Check - Visual QA automatise
 * Lance le serveur, navigue dans l'app, prend des screenshots,
 * genere un rapport a coller dans Genspark pour analyse par Claude Opus.
 * 
 * Usage: node visual-qa.js
 */

const puppeteer = require('puppeteer-core');
const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const CONFIG = {
  chromePath: process.env.PREFIX + '/lib/chromium/chromium-launcher.sh',
  serverPort: 3001,
  baseUrl: 'http://localhost:3001',
  screenshotDir: path.join(process.env.HOME, 'fimo-screenshots'),
  viewports: [
    { name: 'desktop', width: 1280, height: 900 },
    { name: 'mobile', width: 375, height: 812 }
  ],
  testCSV: [
    '2026-02-21;06:00;06:44;C',
    '2026-02-21;06:44;06:59;P',
    '2026-02-21;06:59;07:14;P',
    '2026-02-21;07:14;07:29;P',
    '2026-02-21;07:29;07:44;P',
    '2026-02-21;07:44;07:59;P',
    '2026-02-21;07:59;08:14;P',
    '2026-02-21;08:14;08:29;P',
    '2026-02-21;08:29;08:44;P',
    '2026-02-21;08:44;09:20;P',
    '2026-02-21;09:20;13:35;C',
    '2026-02-21;13:35;14:20;P',
    '2026-02-21;14:20;18:35;C',
    '2026-02-21;18:35;18:50;P',
    '2026-02-21;18:50;19:05;P'
  ].join('\n')
};

// Couleurs console
const c = {
  green: t => '\x1b[32m' + t + '\x1b[0m',
  red: t => '\x1b[31m' + t + '\x1b[0m',
  cyan: t => '\x1b[36m' + t + '\x1b[0m',
  yellow: t => '\x1b[33m' + t + '\x1b[0m',
  bold: t => '\x1b[1m' + t + '\x1b[0m'
};

const log = (icon, msg) => console.log(icon + ' ' + msg);
const rapport = [];
function addRapport(section, detail) {
  rapport.push({ section, detail, timestamp: new Date().toISOString() });
}

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// 1. Demarrer le serveur
function startServer() {
  log('🚀', c.cyan('Demarrage serveur FIMO Check...'));
  try { execSync('pkill -f "node server" 2>/dev/null || true'); } catch(e) {}
  const server = spawn('node', ['server.js'], {
    cwd: path.join(process.env.HOME, 'rse-rsn-calculator'),
    detached: true,
    stdio: 'ignore'
  });
  server.unref();
  return server;
}

// 2. Attendre que le serveur reponde
async function waitForServer(maxWait) {
  const http = require('http');
  const start = Date.now();
  while (Date.now() - start < maxWait) {
    try {
      await new Promise((resolve, reject) => {
        http.get(CONFIG.baseUrl + '/api/health', res => {
          let data = '';
          res.on('data', chunk => data += chunk);
          res.on('end', () => resolve(data));
        }).on('error', reject);
      });
      log('✅', c.green('Serveur pret'));
      return true;
    } catch(e) {
      await sleep(500);
    }
  }
  log('❌', c.red('Serveur timeout'));
  return false;
}

// 3. Prendre screenshot avec metadata
async function takeScreenshot(page, name, viewport) {
  const filename = name + '-' + viewport.name + '.png';
  const filepath = path.join(CONFIG.screenshotDir, filename);
  await page.setViewport({ width: viewport.width, height: viewport.height });
  await sleep(500); // Laisser le temps au CSS de s'adapter
  await page.screenshot({ path: filepath, fullPage: true });
  const stats = fs.statSync(filepath);
  log('📸', c.cyan(filename) + ' (' + Math.round(stats.size/1024) + 'KB)');
  return { filename, filepath, size: stats.size, viewport: viewport.name };
}

// 4. Extraire les infos visibles de la page
async function extractPageInfo(page) {
  return await page.evaluate(() => {
    const getText = sel => { const el = document.querySelector(sel); return el ? el.textContent.trim() : null; };
    const getAll = sel => Array.from(document.querySelectorAll(sel)).map(el => el.textContent.trim());
    
    // Detecter les erreurs visuelles basiques
    const issues = [];
    
    // Texte qui deborde
    document.querySelectorAll('*').forEach(el => {
      const rect = el.getBoundingClientRect();
      if (rect.width > window.innerWidth + 5) {
        issues.push('OVERFLOW: ' + el.tagName + '.' + el.className.split(' ')[0] + ' largeur=' + Math.round(rect.width) + 'px > viewport=' + window.innerWidth + 'px');
      }
    });
    
    // Elements invisibles qui devraient etre visibles
    document.querySelectorAll('button, [role="button"], a').forEach(el => {
      const style = window.getComputedStyle(el);
      const rect = el.getBoundingClientRect();
      if (rect.width < 20 || rect.height < 20) {
        issues.push('PETIT: ' + el.tagName + ' "' + el.textContent.trim().substring(0,30) + '" = ' + Math.round(rect.width) + 'x' + Math.round(rect.height) + 'px');
      }
    });
    
    // Texte illisible (trop petit)
    document.querySelectorAll('p, span, div, td, th, label').forEach(el => {
      const style = window.getComputedStyle(el);
      const fontSize = parseFloat(style.fontSize);
      if (fontSize < 10 && el.textContent.trim().length > 0 && el.offsetHeight > 0) {
        issues.push('PETIT_TEXTE: ' + el.tagName + ' "' + el.textContent.trim().substring(0,30) + '" = ' + fontSize + 'px');
      }
    });
    
    // Texte avec unicode non rendu
    document.querySelectorAll('*').forEach(el => {
      if (el.children.length === 0 && el.textContent.match(/\\u00|Synth.*se|\\x/)) {
        issues.push('ENCODAGE: "' + el.textContent.trim().substring(0,50) + '"');
      }
    });
    
    // Console errors
    const title = document.title;
    const h1 = getText('h1');
    const buttons = getAll('button').filter(t => t.length > 0).slice(0, 10);
    const errors = getAll('.error, .erreur, [class*="error"]').slice(0, 5);
    
    return { title, h1, buttons, errors, issues, url: window.location.href };
  });
}

// MAIN
(async () => {
  console.log('\n' + c.bold('═══════════════════════════════════════'));
  console.log(c.bold('  FIMO CHECK — Visual QA Automatise'));
  console.log(c.bold('═══════════════════════════════════════\n'));
  
  // Preparer le dossier screenshots
  if (!fs.existsSync(CONFIG.screenshotDir)) fs.mkdirSync(CONFIG.screenshotDir, { recursive: true });
  // Nettoyer les anciens
  fs.readdirSync(CONFIG.screenshotDir).forEach(f => fs.unlinkSync(path.join(CONFIG.screenshotDir, f)));
  
  // Demarrer serveur
  startServer();
  const serverOK = await waitForServer(10000);
  if (!serverOK) { console.log(c.red('ABANDON: serveur ne demarre pas')); process.exit(1); }
  
  // Lancer le navigateur
  log('🌐', c.cyan('Lancement Chromium headless...'));
  const browser = await puppeteer.launch({
    executablePath: CONFIG.chromePath,
    headless: true,
    args: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage', '--single-process']
  });
  
  const screenshots = [];
  const allIssues = [];
  
  try {
    for (const viewport of CONFIG.viewports) {
      log('📐', c.yellow('Viewport: ' + viewport.name + ' (' + viewport.width + 'x' + viewport.height + ')'));
      
      const page = await browser.newPage();
      
      // Capturer les erreurs console
      const consoleErrors = [];
      page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
      page.on('pageerror', err => consoleErrors.push(err.message));
      
      // === ECRAN 1: Page d'accueil ===
      log('📄', 'Page accueil...');
      await page.goto(CONFIG.baseUrl, { timeout: 20000, waitUntil: 'networkidle2' });
      await sleep(1000);
      screenshots.push(await takeScreenshot(page, '01-accueil', viewport));
      const homeInfo = await extractPageInfo(page);
      addRapport('ACCUEIL [' + viewport.name + ']', homeInfo);
      
      // === ECRAN 2: Remplir le formulaire CSV ===
      log('📝', 'Remplissage CSV...');
      const textareaExists = await page.evaluate(() => {
        const ta = document.querySelector('textarea');
        if (ta) { ta.value = ''; ta.focus(); return true; }
        return false;
      });
      
      if (textareaExists) {
        await page.keyboard.type(CONFIG.testCSV, { delay: 0 });
        await sleep(500);
        screenshots.push(await takeScreenshot(page, '02-formulaire-rempli', viewport));
        addRapport('FORMULAIRE [' + viewport.name + ']', await extractPageInfo(page));
        
        // === ECRAN 3: Cliquer sur Analyser ===
        log('🔍', 'Lancement analyse...');
        const analyseBtn = await page.evaluate(() => {
          const btns = Array.from(document.querySelectorAll('button'));
          const btn = btns.find(b => b.textContent.toLowerCase().includes('analy'));
          if (btn) { btn.click(); return btn.textContent.trim(); }
          return null;
        });
        
        if (analyseBtn) {
          log('🔘', 'Bouton clique: "' + analyseBtn + '"');
          await sleep(3000); // Attendre le resultat
          
          // === ECRAN 4: Resultats ===
          screenshots.push(await takeScreenshot(page, '03-resultats', viewport));
          const resultsInfo = await extractPageInfo(page);
          addRapport('RESULTATS [' + viewport.name + ']', resultsInfo);
          
          // === ECRAN 5: Scroll vers le calendrier ===
          await page.evaluate(() => window.scrollBy(0, 800));
          await sleep(500);
          screenshots.push(await takeScreenshot(page, '04-calendrier-sanctions', viewport));
          addRapport('CALENDRIER+SANCTIONS [' + viewport.name + ']', await extractPageInfo(page));
          
          // === ECRAN 6: Scroll tout en bas ===
          await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
          await sleep(500);
          screenshots.push(await takeScreenshot(page, '05-bas-de-page', viewport));
          addRapport('BAS DE PAGE [' + viewport.name + ']', await extractPageInfo(page));
        } else {
          addRapport('ERREUR [' + viewport.name + ']', { message: 'Bouton Analyser non trouve' });
        }
      } else {
        addRapport('ERREUR [' + viewport.name + ']', { message: 'Textarea non trouvee' });
      }
      
      // Collecter les issues
      if (consoleErrors.length > 0) {
        addRapport('ERREURS CONSOLE [' + viewport.name + ']', consoleErrors);
        allIssues.push(...consoleErrors.map(e => '[CONSOLE ' + viewport.name + '] ' + e));
      }
      
      await page.close();
    }
  } catch(e) {
    log('❌', c.red('Erreur: ' + e.message));
    addRapport('CRASH', e.message);
  }
  
  await browser.close();
  
  // === GENERER LE RAPPORT ===
  console.log('\n' + c.bold('═══════════════════════════════════════'));
  console.log(c.bold('  RAPPORT VISUAL QA'));
  console.log(c.bold('═══════════════════════════════════════\n'));
  
  let rapportTexte = '# FIMO Check — Rapport Visual QA\n';
  rapportTexte += '**Date**: ' + new Date().toISOString().split('T')[0] + '\n';
  rapportTexte += '**Screenshots**: ' + screenshots.length + '\n';
  rapportTexte += '**Viewports**: desktop (1280x900) + mobile (375x812)\n\n';
  
  rapportTexte += '## Screenshots pris\n';
  screenshots.forEach(s => {
    rapportTexte += '- ' + s.filename + ' (' + Math.round(s.size/1024) + 'KB)\n';
  });
  
  rapportTexte += '\n## Analyse automatique\n';
  let totalIssues = 0;
  rapport.forEach(r => {
    rapportTexte += '\n### ' + r.section + '\n';
    if (r.detail && r.detail.issues && r.detail.issues.length > 0) {
      r.detail.issues.forEach(issue => {
        rapportTexte += '- ⚠️ ' + issue + '\n';
        totalIssues++;
      });
    }
    if (r.detail && r.detail.errors && r.detail.errors.length > 0) {
      r.detail.errors.forEach(err => {
        rapportTexte += '- ❌ ' + err + '\n';
        totalIssues++;
      });
    }
    if (r.detail && r.detail.title) {
      rapportTexte += 'Page: ' + r.detail.title + '\n';
      rapportTexte += 'Boutons visibles: ' + (r.detail.buttons || []).join(', ') + '\n';
    }
    if (Array.isArray(r.detail)) {
      r.detail.forEach(d => { rapportTexte += '- ' + d + '\n'; totalIssues++; });
    }
  });
  
  rapportTexte += '\n## Resume\n';
  rapportTexte += '- Screenshots: ' + screenshots.length + '\n';
  rapportTexte += '- Problemes detectes automatiquement: ' + totalIssues + '\n';
  rapportTexte += '- Statut: ' + (totalIssues === 0 ? '✅ RAS' : '⚠️ ' + totalIssues + ' probleme(s) a verifier') + '\n';
  rapportTexte += '\n## Instructions pour Genspark\n';
  rapportTexte += 'Colle ce rapport + les screenshots dans Genspark et demande:\n';
  rapportTexte += '"Analyse ces screenshots de FIMO Check. Identifie tous les bugs visuels:\n';
  rapportTexte += 'alignement, texte tronque, couleurs illisibles, responsive casse,\n';
  rapportTexte += 'boutons inaccessibles. Donne-moi le code CSS/JSX a corriger."\n';
  
  // Sauvegarder le rapport
  const rapportPath = path.join(CONFIG.screenshotDir, 'rapport-qa.md');
  fs.writeFileSync(rapportPath, rapportTexte);
  
  console.log(rapportTexte);
  console.log(c.bold('═══════════════════════════════════════'));
  log('📁', c.green('Screenshots: ' + CONFIG.screenshotDir));
  log('📋', c.green('Rapport: ' + rapportPath));
  log('📊', totalIssues === 0 ? c.green('0 probleme detecte') : c.yellow(totalIssues + ' probleme(s) detecte(s)'));
  console.log(c.bold('═══════════════════════════════════════\n'));
  
  // Arreter le serveur
  try { execSync('pkill -f "node server" 2>/dev/null || true'); } catch(e) {}
  
  process.exit(0);
})();
