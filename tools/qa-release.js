'use strict';

const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const json = (p) => JSON.parse(read(p));

const checks = [];
function check(name, ok, detail) {
  checks.push({ name, ok: Boolean(ok), detail: detail || '' });
}

const pkg = json('package.json');
const clientPkg = json('client/package.json');
const manifest = json('client/public/manifest.json');
const server = read('server.js');
const readme = read('README.md');
const sw = read('client/public/sw.js');
const indexHtml = read('client/index.html');
const globalCss = read('client/src/styles/global.css');
const params = read('client/src/components/forms/ParametresPanel.jsx');
const infractions = read('client/src/components/results/InfractionCard.jsx');
const calculator = read('client/src/pages/Calculator.jsx');

check('versions root/client identiques', pkg.version === clientPkg.version, pkg.version + ' / ' + clientPkg.version);
check('README sur la version courante', readme.includes('v' + pkg.version), pkg.version);
check('version serveur centralisee', server.includes("require('./package.json')") && server.includes('APP_VERSION'));
check('aucune ancienne version serveur', !server.includes('7.11.0'));
check('Helmet actif', server.includes('app.use(helmet('));
check('rate limiting actif', server.includes('const apiLimiter = rateLimit(') && server.includes('expensiveLimiter'));
check('x-powered-by desactive', server.includes("app.disable('x-powered-by')"));
check('validation PDF corrigee', !server.includes('!resultat.score === undefined') && server.includes("typeof resultat.score !== 'number'"));
check('CORS non ouvert globalement', !server.includes('app.use(cors());'));
check('upload limite et filtre', server.includes('fileFilter: function') && server.includes('fileSize: 5 * 1024 * 1024'));
check('multer 2.x minimum', /^\^?2\./.test(pkg.dependencies.multer), pkg.dependencies.multer);
check('manifest standalone', manifest.display === 'standalone');
check('manifest sans orientation forcee', !Object.prototype.hasOwnProperty.call(manifest, 'orientation'));
check('service worker ignore API', sw.includes("url.pathname.startsWith('/api/')"));
check('service worker a un app shell', sw.includes('APP_SHELL'));
check('pas de script SW inline', !indexHtml.includes("navigator.serviceWorker.register('/sw.js')"));
check('focus visible global', globalCss.includes(':focus-visible'));
check('reduced motion gere', globalCss.includes('prefers-reduced-motion'));
check('parametres exposes aux lecteurs d ecran', params.includes('htmlFor="type-service"') && params.includes('aria-pressed'));
check('cartes infraction clavier', infractions.includes('onKeyDown={handleKeyDown}'));
check('onglets resultats semantiques', calculator.includes('role="tablist"') && calculator.includes('aria-selected'));
check('README ne documente pas /api/fix fantome', !readme.includes('| `POST` | `/api/fix`'));
check('fichier parasite "=" absent', !fs.existsSync(path.join(root, '=')));
check('server.err absent', !fs.existsSync(path.join(root, 'server.err')));

const failed = checks.filter((c) => !c.ok);
for (const c of checks) {
  console.log((c.ok ? '✓' : '✗') + ' ' + c.name + (c.detail ? ' — ' + c.detail : ''));
}
console.log('\nRelease QA: ' + (checks.length - failed.length) + '/' + checks.length + ' checks OK');

if (failed.length) {
  console.error('\nChecks en echec: ' + failed.map((c) => c.name).join(', '));
  process.exit(1);
}
