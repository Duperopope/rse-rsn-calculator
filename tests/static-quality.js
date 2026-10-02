const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const failures = [];

function fail(message) { failures.push(message); }
function read(rel) { return fs.readFileSync(path.join(ROOT, rel), 'utf8'); }
function exists(rel) { return fs.existsSync(path.join(ROOT, rel)); }

function walk(dir, out) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

const rootPkg = JSON.parse(read('package.json'));
const clientPkg = JSON.parse(read('client/package.json'));
if (rootPkg.version !== '8.0.0') fail('package.json version doit etre 8.0.0');
if (clientPkg.version !== '8.0.0') fail('client/package.json version doit etre 8.0.0');

if (!exists('tests/fixtures/test_56jours.csv')) fail('fixture 56 jours absente');
if (exists('server.err')) fail('server.err ne doit pas etre versionne');
if (exists('=')) fail('fichier parasite "=" present');
if (exists('client/src/components/results/FixEnginePanel.jsx')) fail('FixEnginePanel obsolete present');
if (exists('client/src/components/layout/Onboarding.jsx')) fail('Onboarding duplique present');

const server = read('server.js');
if (!server.includes('app.use(helmet())')) fail('Helmet non active');
if (!server.includes('rateLimit({')) fail('Rate limit non active');
if (/app\.use\(cors\(\)\)/.test(server)) fail('CORS ouvert globalement');
if (!server.includes("version: '8.0.0'")) fail('health.version non aligne');
if (server.includes('!resultat.score === undefined')) fail('ancienne validation PDF incorrecte presente');

const sourceFiles = walk(path.join(ROOT, 'client', 'src'), [])
  .filter((p) => /\.(js|jsx|css)$/.test(p));

const forbidden = [
  ['window.__', 'etat global window.__ interdit'],
  ['#00d4ff', 'ancien cyan neon'],
  ['#00ff88', 'ancien vert neon'],
  ['#ff4444', 'ancien rouge legacy'],
  ['#ffaa00', 'ancien orange legacy'],
  ['#9c27b0', 'ancien violet legacy']
];

for (const file of sourceFiles) {
  const content = fs.readFileSync(file, 'utf8');
  const lower = content.toLowerCase();
  for (const [needle, label] of forbidden) {
    if (lower.includes(needle.toLowerCase())) {
      fail(path.relative(ROOT, file) + ': ' + label);
    }
  }
  if (/outline\s*:\s*none/i.test(content)) {
    fail(path.relative(ROOT, file) + ': outline:none interdit');
  }
}

const readme = read('README.md');
if (!readme.includes('v8.0.0')) fail('README ne reference pas v8.0.0');

if (failures.length) {
  console.error('\nQUALITY GATE: ECHEC');
  failures.forEach((m) => console.error(' - ' + m));
  process.exit(1);
}

console.log('QUALITY GATE: OK');
console.log(' - versions alignees');
console.log(' - securite backend presente');
console.log(' - fixture integration presente');
console.log(' - pas de fichiers parasites connus');
console.log(' - pas de palette legacy ni window.__ dans client/src');
