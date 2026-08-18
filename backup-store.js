const Database = require('better-sqlite3');
const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');

const MAGIC = Buffer.from('FIMOBK1\n');
const AAD = Buffer.from('fimocheck:backup:v1');

function backupKey() {
  const value = process.env.FIMO_BACKUP_KEY || '';
  const key = Buffer.from(value, 'base64');
  if (key.length !== 32) throw new Error('FIMO_BACKUP_KEY doit contenir exactement 32 octets encodés en base64.');
  return key;
}

function dataKey(dataDir) {
  if (process.env.FIMO_DATA_KEY) {
    const key = Buffer.from(process.env.FIMO_DATA_KEY, 'base64');
    if (key.length !== 32) throw new Error('FIMO_DATA_KEY invalide.');
    return key;
  }
  const keyPath = path.join(dataDir, 'encryption.key');
  const key = fs.readFileSync(keyPath);
  if (key.length !== 32) throw new Error('Clé locale de données invalide.');
  return key;
}

function encryptBundle(payload) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', backupKey(), iv);
  cipher.setAAD(AAD);
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify(payload)), cipher.final()]);
  return Buffer.concat([MAGIC, iv, cipher.getAuthTag(), ciphertext]);
}

function decryptBundle(buffer) {
  if (!buffer.subarray(0, MAGIC.length).equals(MAGIC)) throw new Error('Format de sauvegarde inconnu.');
  const iv = buffer.subarray(MAGIC.length, MAGIC.length + 12);
  const tag = buffer.subarray(MAGIC.length + 12, MAGIC.length + 28);
  const ciphertext = buffer.subarray(MAGIC.length + 28);
  const decipher = crypto.createDecipheriv('aes-256-gcm', backupKey(), iv);
  decipher.setAAD(AAD);
  decipher.setAuthTag(tag);
  return JSON.parse(Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8'));
}

async function createBackup(dataDir, destination) {
  const source = path.join(dataDir, 'fimo.sqlite');
  if (!fs.existsSync(source)) throw new Error('Base FIMOCheck introuvable.');
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fimocheck-backup-'));
  const snapshot = path.join(tempDir, 'snapshot.sqlite');
  try {
    const db = new Database(source, { readonly: true, fileMustExist: true });
    await db.backup(snapshot);
    db.close();
    const database = fs.readFileSync(snapshot);
    const payload = {
      format: 1,
      createdAt: new Date().toISOString(),
      databaseSha256: crypto.createHash('sha256').update(database).digest('hex'),
      database: database.toString('base64'),
      dataKey: dataKey(dataDir).toString('base64')
    };
    fs.writeFileSync(destination, encryptBundle(payload), { mode: 0o600, flag: 'wx' });
    return { destination, createdAt: payload.createdAt, sha256: crypto.createHash('sha256').update(fs.readFileSync(destination)).digest('hex') };
  } finally { fs.rmSync(tempDir, { recursive: true, force: true }); }
}

function restoreBackup(source, targetDir) {
  const targetDb = path.join(targetDir, 'fimo.sqlite');
  if (fs.existsSync(targetDb)) throw new Error('La restauration refuse d’écraser une base existante.');
  const payload = decryptBundle(fs.readFileSync(source));
  if (payload.format !== 1) throw new Error('Version de sauvegarde non prise en charge.');
  const database = Buffer.from(payload.database, 'base64');
  const expected = crypto.createHash('sha256').update(database).digest('hex');
  if (expected !== payload.databaseSha256) throw new Error('Intégrité de la base restaurée invalide.');
  const restoredDataKey = Buffer.from(payload.dataKey, 'base64');
  if (restoredDataKey.length !== 32) throw new Error('Clé de données restaurée invalide.');
  fs.mkdirSync(targetDir, { recursive: true, mode: 0o700 });
  const staging = path.join(targetDir, '.restore-staging.sqlite');
  try {
    fs.writeFileSync(staging, database, { mode: 0o600, flag: 'wx' });
    const checkDb = new Database(staging, { readonly: true, fileMustExist: true });
    const integrity = checkDb.pragma('integrity_check', { simple: true });
    const tables = checkDb.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map(row => row.name);
    checkDb.close();
    if (integrity !== 'ok' || !tables.includes('users') || !tables.includes('analyses')) throw new Error('La base restaurée ne passe pas le contrôle SQLite/FIMOCheck.');
    fs.renameSync(staging, targetDb);
    if (!process.env.FIMO_DATA_KEY) fs.writeFileSync(path.join(targetDir, 'encryption.key'), restoredDataKey, { mode: 0o600, flag: 'wx' });
    return { restoredAt: new Date().toISOString(), sourceCreatedAt: payload.createdAt, databaseSha256: expected };
  } finally { if (fs.existsSync(staging)) fs.rmSync(staging, { force: true }); }
}

module.exports = { createBackup, restoreBackup };
