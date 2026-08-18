const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { sourceEvidence } = require('./source-evidence.js');

const root = path.join(__dirname, '..');
const runtimeDir = path.join(root, '.runtime');
fs.mkdirSync(runtimeDir, { recursive: true, mode: 0o700 });
const evidence = sourceEvidence(root);
let commit = null;
try { commit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(); } catch {}
let productionRehearsal = null;
try { productionRehearsal = JSON.parse(fs.readFileSync(path.join(runtimeDir, 'production-rehearsal.json'), 'utf8')); } catch {}
let qualitySuite = null;
try { qualitySuite = JSON.parse(fs.readFileSync(path.join(runtimeDir, 'quality-suite.json'), 'utf8')); } catch {}
if (!qualitySuite || qualitySuite.sourceEvidence?.sha256 !== evidence.sha256) {
  throw new Error('La suite qualité manque ou ne correspond pas exactement aux sources courantes. Exécutez npm test.');
}
const rehearsalCurrent = productionRehearsal?.status === 'passed' && productionRehearsal?.sourceEvidence?.sha256 === evidence.sha256;
const attestation = {
  schema: 2,
  generatedAt: new Date().toISOString(),
  version: require('../package.json').version,
  commit,
  evidenceSha256: evidence.sha256,
  evidenceFiles: evidence.files,
  gate: 'npm run verify',
  results: {
    ...qualitySuite.results,
    productionRehearsal: rehearsalCurrent ? { passed: 9, total: 9 } : { passed: 0, total: 9 },
  },
  productionRehearsal: rehearsalCurrent ? productionRehearsal : null,
  limitations: [
    'Attestation interne automatisée, sans certification externe.',
    'La validation réglementaire indépendante reste requise.',
  ],
};
const target = path.join(runtimeDir, 'quality-attestation.json');
const staging = target + '.tmp';
fs.writeFileSync(staging, JSON.stringify(attestation, null, 2), { mode: 0o600 });
fs.renameSync(staging, target);
process.stdout.write(`ATTESTATION QUALITE: ${attestation.evidenceSha256.slice(0, 12)}\n`);
