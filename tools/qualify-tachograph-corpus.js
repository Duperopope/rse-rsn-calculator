#!/usr/bin/env node
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { validateDecodedTachograph, eligibleForRegulatoryCalculation } = require('../tachograph-contract.js');

const manifestPath = path.resolve(process.argv[2] || '');
const decoder = process.env.FIMO_TACHOGRAPH_DECODER;
if (!process.argv[2] || !decoder) {
  console.error('Usage: FIMO_TACHOGRAPH_DECODER=/chemin/decodeur node tools/qualify-tachograph-corpus.js /chemin/manifest.json');
  process.exit(2);
}
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
if (manifest.schemaVersion !== 'fimocheck.tachograph-corpus.v1' || !Array.isArray(manifest.cases) || !manifest.cases.length) {
  throw new Error('Manifest de corpus invalide ou vide.');
}
const base = path.dirname(manifestPath);
const results = [];
for (const item of manifest.cases) {
  const sourcePath = path.resolve(base, item.source);
  const referencePath = path.resolve(base, item.reference);
  const bytes = fs.readFileSync(sourcePath);
  const sourceSha256 = crypto.createHash('sha256').update(bytes).digest('hex');
  if (sourceSha256 !== item.sha256) throw new Error(`${item.id}: empreinte source différente du manifeste.`);
  const run = spawnSync(decoder, ['--input', sourcePath, '--format', 'fimocheck.tachograph.v1'], {
    encoding: 'utf8', timeout: 30_000, maxBuffer: 10 * 1024 * 1024, shell: false,
    env: { PATH: process.env.PATH || '', LANG: 'C.UTF-8' },
  });
  if (run.error || run.status !== 0) throw new Error(`${item.id}: décodeur en échec (${run.error?.message || run.stderr || run.status}).`);
  const actual = validateDecodedTachograph(JSON.parse(run.stdout));
  const expected = validateDecodedTachograph(JSON.parse(fs.readFileSync(referencePath, 'utf8')));
  if (actual.sourceSha256 !== sourceSha256) throw new Error(`${item.id}: le décodeur ne restitue pas l’empreinte de l’original.`);
  if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error(`${item.id}: résultat différent de la référence indépendante.`);
  results.push({ id: item.id, sourceKind: actual.sourceKind, generation: actual.generation, signature: actual.signature.status, activities: actual.activities.length, calculationEligible: eligibleForRegulatoryCalculation(actual) });
}
console.log(JSON.stringify({ status: 'passed', cases: results, decoder: path.basename(decoder), verifiedAt: new Date().toISOString() }, null, 2));
