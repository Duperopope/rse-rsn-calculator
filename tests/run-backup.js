const assert = require('assert');
const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'fimocheck-backup-test-'));
const source = path.join(root, 'source');
const restored = path.join(root, 'restored');
const backupFile = path.join(root, 'backup.fimobak');
fs.mkdirSync(source, { mode: 0o700 });
process.env.FIMO_DATA_DIR = source;
process.env.FIMO_BACKUP_KEY = crypto.randomBytes(32).toString('base64');

(async function() {
  try {
    const auth = require('../auth-store.js');
    const secure = require('../secure-store.js');
    const backup = require('../backup-store.js');
    const owner = auth.createInitialAdmin('backup-owner', 'PhraseSauvegarde!12345');
    const marker = 'SAUVEGARDE-SENSIBLE-24680';
    secure.saveAnalysis(owner.id, { mission: { reference: marker }, score: 91 });
    await backup.createBackup(source, backupFile);
    assert.strictEqual(fs.statSync(backupFile).mode & 0o077, 0, 'permissions sauvegarde');
    assert.strictEqual(fs.readFileSync(backupFile).includes(Buffer.from(marker)), false, 'sauvegarde chiffrée');
    backup.restoreBackup(backupFile, restored);
    assert.strictEqual(fs.statSync(path.join(restored, 'encryption.key')).mode & 0o077, 0, 'permissions clé restaurée');
    const verifyScript = `process.env.FIMO_DATA_DIR=${JSON.stringify(restored)};const s=require(${JSON.stringify(path.join(__dirname,'..','secure-store.js'))});const rows=s.listAnalyses(${owner.id},10);if(rows[0].payload.mission.reference!==${JSON.stringify(marker)})process.exit(2);`;
    const result = require('child_process').spawnSync(process.execPath, ['-e', verifyScript]);
    assert.strictEqual(result.status, 0, 'déchiffrement après restauration');
    const corrupt = Buffer.from(fs.readFileSync(backupFile)); corrupt[corrupt.length - 1] ^= 1;
    const corruptPath = path.join(root, 'corrupt.fimobak'); fs.writeFileSync(corruptPath, corrupt);
    assert.throws(() => backup.restoreBackup(corruptPath, path.join(root, 'corrupt-out')), 'altération détectée');
    assert.throws(() => backup.restoreBackup(backupFile, restored), /refuse/, 'écrasement refusé');
    console.log('SAUVEGARDE/RESTAURATION: 6/6');
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
})().catch(error => { console.error(error.stack || error.message); process.exitCode = 1; });
