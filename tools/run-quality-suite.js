#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { sourceEvidence } = require('./source-evidence.js');

const root = path.join(__dirname, '..');
const gates = [
  ['functional', 'tests/run-tests.js', /TOUS LES TESTS PASSENT:\s*(\d+)\/(\d+)/],
  ['embeddedQa', 'tests/run-qa.js', /QA embarquee\s*:\s*(\d+)\/(\d+)/],
  ['dataSecurity', 'tests/run-security.js', /SECURITE DONNEES:\s*(\d+)\/(\d+)/],
  ['apiSecurity', 'tests/run-auth-api.js', /SECURITE API:\s*(\d+)\/(\d+)/],
  ['backupRestore', 'tests/run-backup.js', /SAUVEGARDE\/RESTAURATION:\s*(\d+)\/(\d+)/],
  ['retention', 'tests/run-maintenance.js', /CONSERVATION\/PURGE:\s*(\d+)\/(\d+)/],
  ['productionConfiguration', 'tests/run-production-security.js', /CONFIGURATION PRODUCTION:\s*(\d+)\/(\d+)/],
  ['qualityGates', 'tests/run-quality-gates.js', /PORTES QUALITE:\s*(\d+)\/(\d+)/],
  ['localizationKeys', 'tests/run-i18n.js', /LOCALISATION:\s*(\d+) clés/],
  ['commonIcons', 'tests/run-assets.js', /ASSETS:\s*(\d+) icônes/],
  ['tachographContract', 'tests/run-tachograph-contract.js', /CONTRAT TACHYGRAPHE:\s*(\d+)\/(\d+)/],
  ['tachographQualification', 'tests/run-tachograph-qualification.js', /QUALIFICATION TACHYGRAPHE:\s*(\d+)\/(\d+)/],
  ['publicPilotQualification', 'tests/run-public-pilot-qualification.js', /QUALIFICATION PILOTE PUBLIC:\s*(\d+)\/(\d+)/],
];
const results = {};
for (const [name, file, pattern] of gates) {
  const run = spawnSync(process.execPath, [file], { cwd: root, encoding: 'utf8', env: process.env, maxBuffer: 20 * 1024 * 1024 });
  process.stdout.write(run.stdout || '');
  process.stderr.write(run.stderr || '');
  if (run.status !== 0) process.exit(run.status || 1);
  const match = String(run.stdout).match(pattern);
  if (!match) throw new Error(`${name}: résultat chiffré introuvable dans la sortie du test.`);
  const passed = Number(match[1]);
  const total = Number(match[2] || match[1]);
  if (passed !== total) throw new Error(`${name}: porte incomplète ${passed}/${total}.`);
  results[name] = { passed, total };
}
const report = { schema: 1, generatedAt: new Date().toISOString(), sourceEvidence: sourceEvidence(root), results };
const runtimeDir = path.join(root, '.runtime');
fs.mkdirSync(runtimeDir, { recursive: true, mode: 0o700 });
fs.writeFileSync(path.join(runtimeDir, 'quality-suite.json'), JSON.stringify(report, null, 2), { mode: 0o600 });
console.log(`SUITE QUALITE: ${Object.keys(results).length}/${Object.keys(results).length} portes attestées`);
