const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const Database = require('better-sqlite3');

const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'fimocheck-maintenance-'));
process.env.FIMO_DATA_DIR = temp;
try {
  const auth = require('../auth-store.js');
  const secure = require('../secure-store.js');
  const tachograph = require('../tachograph-store.js');
  const maintenance = require('../maintenance.js');
  const owner = auth.createInitialAdmin('retention-owner', 'PhraseRetention!12345');
  const old = secure.saveAnalysis(owner.id, { mission: { reference: 'ANCIENNE' } });
  secure.saveAnalysis(owner.id, { mission: { reference: 'RECENTE' } });
  const db = new Database(path.join(temp, 'fimo.sqlite'));
  db.prepare('UPDATE analyses SET created_at=? WHERE id=?').run('2020-01-01T00:00:00.000Z', old.id);
  db.close();
  const result = secure.purgeExpiredAnalyses(365);
  assert.strictEqual(result.removed, 1, 'analyse ancienne purgée');
  assert.strictEqual(secure.listAnalyses(owner.id, 10).length, 1, 'analyse récente conservée');

  const oldTacho = tachograph.saveImport(owner.id, Buffer.from('00010203040506070809abcdef', 'hex'), { originalName: 'ancien.ddd', declaredMime: 'application/octet-stream', sourceHint: 'unknown_ddd' });
  tachograph.saveImport(owner.id, Buffer.from('10111213141516171819abcdef', 'hex'), { originalName: 'recent.ddd', declaredMime: 'application/octet-stream', sourceHint: 'unknown_ddd' });
  const tachoDb = new Database(path.join(temp, 'fimo.sqlite'));
  tachoDb.prepare('UPDATE tachograph_imports SET created_at=? WHERE id=?').run('2020-01-01T00:00:00.000Z', oldTacho.id);
  tachoDb.close();
  const tachoPurge = tachograph.purgeExpiredImports(90);
  assert.strictEqual(tachoPurge.removed, 1, 'original tachygraphe ancien purgé');
  assert.strictEqual(tachograph.listImports(owner.id).length, 1, 'original tachygraphe récent conservé');
  assert.strictEqual(tachoPurge.retentionDays, 90, 'durée tachygraphe explicite');

  const feedbackFile = path.join(temp, 'feedback.ndjson');
  fs.writeFileSync(feedbackFile, [
    JSON.stringify({ createdAt: '2020-01-01T00:00:00.000Z', message: 'ancien' }),
    JSON.stringify({ createdAt: new Date().toISOString(), message: 'récent' }),
    '{ligne-invalide'
  ].join('\n') + '\n', { mode: 0o600 });
  const feedback = maintenance.purgeFeedback(temp, 365);
  assert.strictEqual(feedback.removed, 1, 'retour ancien purgé');
  assert.strictEqual(feedback.kept, 2, 'retour récent et ligne prudente conservés');
  assert.strictEqual(fs.readFileSync(feedbackFile, 'utf8').includes('ancien'), false, 'contenu expiré absent');
  assert.strictEqual(fs.statSync(feedbackFile).mode & 0o077, 0, 'permissions privées maintenues');
  auth.recordAudit(owner.id, 'retention.test', 'avant purge');
  const auditPurge = auth.purgeAuditEvents(30, Date.now() + 31 * 24 * 60 * 60 * 1000);
  assert.ok(auditPurge.removed >= 2, 'anciens événements d’audit purgés');
  assert.strictEqual(auth.verifyAuditChain().ok, true, 'checkpoint valide après purge totale');
  auth.recordAudit(owner.id, 'retention.after', 'après purge');
  assert.strictEqual(auth.verifyAuditChain().ok, true, 'chaîne prolongeable après checkpoint');
  console.log('CONSERVATION/PURGE: 12/12');
} finally { fs.rmSync(temp, { recursive: true, force: true }); }
