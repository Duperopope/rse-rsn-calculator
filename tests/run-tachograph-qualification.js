const assert = require('assert');
const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const root = path.join(__dirname, '..');
const fixture = path.join(__dirname, 'fixtures', 'tachograph-contract');
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'fimocheck-tacho-contract-'));
try {
  const source = path.join(fixture, 'source.synthetic');
  const sha256 = crypto.createHash('sha256').update(fs.readFileSync(source)).digest('hex');
  const reference = {
    schemaVersion: 'fimocheck.tachograph.v1', sourceKind: 'driver_card', generation: 'gen2v2', sourceSha256: sha256,
    signature: { status: 'not_supported' }, warnings: ['fixture synthétique de contrat'],
    activities: [{ type: 'work', start: '2026-08-18T06:00:00.000Z', end: '2026-08-18T06:15:00.000Z', provenance: { offset: 0, length: 8 } }],
  };
  fs.writeFileSync(path.join(temp, 'reference.json'), JSON.stringify(reference));
  fs.copyFileSync(source, path.join(temp, 'source.synthetic'));
  fs.writeFileSync(path.join(temp, 'manifest.json'), JSON.stringify({ schemaVersion: 'fimocheck.tachograph-corpus.v1', cases: [{ id: 'contrat-synthetique', source: 'source.synthetic', sha256, reference: 'reference.json' }] }));
  const run = spawnSync(process.execPath, ['tools/qualify-tachograph-corpus.js', path.join(temp, 'manifest.json')], {
    cwd: root, encoding: 'utf8', env: { ...process.env, FIMO_TACHOGRAPH_DECODER: path.join(fixture, 'decoder-fixture.js') },
  });
  assert.strictEqual(run.status, 0, run.stderr);
  const report = JSON.parse(run.stdout);
  assert.strictEqual(report.status, 'passed');
  assert.strictEqual(report.cases[0].calculationEligible, false, 'fixture sans signature jamais éligible');
  console.log('QUALIFICATION TACHYGRAPHE: 3/3');
} finally { fs.rmSync(temp, { recursive: true, force: true }); }
