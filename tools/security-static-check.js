const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const root = path.join(__dirname, '..');
const files = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard'], { cwd: root, encoding: 'utf8' }).split('\n').filter(Boolean);
const findings = [];
const secretPatterns = [
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  /\bAKIA[0-9A-Z]{16}\b/,
  /\bgh[opusr]_[A-Za-z0-9]{30,}\b/,
  /FIMO_(?:DATA|BACKUP)_KEY\s*[:=]\s*["'][A-Za-z0-9+/=_-]{32,}["']/
];
for (const file of files) {
  if (/\.(?:png|jpg|jpeg|gif|pdf|docx|sqlite|fimobak|woff2?)$/i.test(file) || /(?:^|\/)package-lock\.json$/.test(file)) continue;
  let content; try { content = fs.readFileSync(path.join(root, file), 'utf8'); } catch (_) { continue; }
  for (const pattern of secretPatterns) if (pattern.test(content)) findings.push(`secret-pattern:${file}:${pattern}`);
}

const server = fs.readFileSync(path.join(root, 'server.js'), 'utf8');
for (const route of ['/api/analyze', '/api/rapport/pdf', '/api/upload']) {
  const escaped = route.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  if (!new RegExp(`app\\.post\\(['"]${escaped}['"],\\s*requireComputationAccess`).test(server)) findings.push(`route-not-protected:${route}`);
}
if (!server.includes("'__Host-fimo_session'")) findings.push('cookie-prefix-missing');
if (!server.includes('SameSite=Strict')) findings.push('cookie-samesite-missing');

const packageJson = require(path.join(root, 'package.json'));
const multerMajor = Number(String(packageJson.dependencies.multer || '').match(/\d+/)?.[0]);
if (!(multerMajor >= 2)) findings.push('multer-major-below-2');

const dockerfile = fs.readFileSync(path.join(root, 'Dockerfile'), 'utf8');
const compose = fs.readFileSync(path.join(root, 'compose.yaml'), 'utf8');
if (!/^USER node$/m.test(dockerfile)) findings.push('docker-user-not-unprivileged');
if (!/read_only:\s*true/.test(compose)) findings.push('compose-root-not-readonly');
if (!/cap_drop:\s*\n\s*- ALL/.test(compose)) findings.push('compose-capabilities-not-dropped');
if (!/no-new-privileges:true/.test(compose)) findings.push('compose-privilege-escalation-not-disabled');

if (findings.length) {
  console.error('CONTROLE STATIQUE: ECHEC');
  for (const finding of findings) console.error('- ' + finding);
  process.exit(1);
}
console.log(`CONTROLE STATIQUE: OK (${files.length} fichiers examinés)`);
