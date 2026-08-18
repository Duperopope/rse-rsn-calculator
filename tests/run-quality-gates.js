const assert = require('assert');
const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const root = path.join(__dirname, '..');
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'fimocheck-quality-gates-'));
const baseEnv = { ...process.env, FIMO_DATA_DIR: temp };

function run(args, env) {
  return spawnSync(process.execPath, args, {
    cwd: root,
    env,
    encoding: 'utf8',
  });
}

function parse(result) {
  assert.ok(result.stdout, result.stderr || 'sortie JSON absente');
  return JSON.parse(result.stdout);
}

try {
  const admin = run(
    ['tools/create-admin.js', 'quality-owner', 'QualityGate!Phrase-12345'],
    baseEnv,
  );
  assert.strictEqual(admin.status, 0, admin.stderr);
  const storage = run(['-e', "require('./secure-store.js');require('./profile-store.js');require('./tachograph-store.js')"], baseEnv);
  assert.strictEqual(storage.status, 0, storage.stderr);

  const missingSecrets = run(['tools/readiness-check.js', '--production'], baseEnv);
  assert.notStrictEqual(missingSecrets.status, 0, 'la porte doit refuser les secrets absents');
  const missingReport = parse(missingSecrets);
  assert.strictEqual(missingReport.ready, false);
  assert.ok(
    missingReport.checks.filter((item) => item.status === 'fail').length >= 3,
    'les trois exigences de production doivent échouer',
  );

  const insecureOriginEnv = {
    ...baseEnv,
    FIMO_DATA_KEY: crypto.randomBytes(32).toString('base64'),
    FIMO_BACKUP_KEY: crypto.randomBytes(32).toString('base64'),
    FIMO_ALLOWED_ORIGINS: 'http://pilot.fimocheck.example',
    FIMO_WEBAUTHN_RP_ID: 'pilot.fimocheck.example',
    FIMO_WEBAUTHN_ORIGIN: 'http://pilot.fimocheck.example',
  };
  const insecureOrigin = run(['tools/readiness-check.js', '--production'], insecureOriginEnv);
  assert.notStrictEqual(insecureOrigin.status, 0, 'la porte doit refuser une origine HTTP');
  assert.strictEqual(parse(insecureOrigin).ready, false);

  const validEnv = {
    ...insecureOriginEnv,
    FIMO_ALLOWED_ORIGINS: 'https://pilot.fimocheck.example',
    FIMO_WEBAUTHN_ORIGIN: 'https://pilot.fimocheck.example',
  };
  const valid = run(['tools/readiness-check.js', '--production'], validEnv);
  assert.strictEqual(valid.status, 0, valid.stderr || valid.stdout);
  assert.strictEqual(parse(valid).ready, true, 'une configuration complète doit passer');
  const validReport = parse(valid);
  assert.strictEqual(validReport.checks.find(item => item.name === 'production.webauthn-rp-id').status, 'pass');
  assert.strictEqual(validReport.checks.find(item => item.name === 'production.webauthn-origin').status, 'pass');

  console.log('PORTES QUALITE: 9/9');
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}
