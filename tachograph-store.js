const Database = require('better-sqlite3');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const dataDir = process.env.FIMO_DATA_DIR || path.join(__dirname, 'data');
fs.mkdirSync(dataDir, { recursive: true, mode: 0o700 });
function loadKey() {
  if (process.env.FIMO_DATA_KEY) {
    const configured = Buffer.from(process.env.FIMO_DATA_KEY, 'base64');
    if (configured.length !== 32) throw new Error('FIMO_DATA_KEY invalide.');
    return configured;
  }
  if (process.env.NODE_ENV === 'production') throw new Error('FIMO_DATA_KEY est obligatoire en production.');
  const keyPath = path.join(dataDir, 'encryption.key');
  if (!fs.existsSync(keyPath)) fs.writeFileSync(keyPath, crypto.randomBytes(32), { mode: 0o600, flag: 'wx' });
  const local = fs.readFileSync(keyPath);
  if (local.length !== 32) throw new Error('Clé locale invalide.');
  return local;
}
const key = loadKey();
const db = new Database(path.join(dataDir, 'fimo.sqlite'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
db.exec(`CREATE TABLE IF NOT EXISTS tachograph_imports (
  id TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content_hash TEXT NOT NULL,
  source_hint TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('received_unverified','parsed','rejected')),
  ciphertext BLOB NOT NULL,
  iv BLOB NOT NULL,
  auth_tag BLOB NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE(user_id,content_hash)
)`);
function aad(id, userId) { return Buffer.from(`fimocheck:tachograph:${id}:user:${userId}`); }
function encrypt(id, userId, value) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv, { authTagLength: 16 });
  cipher.setAAD(aad(id, userId));
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify(value), 'utf8'), cipher.final()]);
  return { ciphertext, iv, authTag: cipher.getAuthTag() };
}
function decrypt(row) {
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, row.iv, { authTagLength: 16 });
  decipher.setAAD(aad(row.id, row.user_id));
  decipher.setAuthTag(row.auth_tag);
  return JSON.parse(Buffer.concat([decipher.update(row.ciphertext), decipher.final()]).toString('utf8'));
}
function saveImport(userId, buffer, metadata) {
  const hash = crypto.createHash('sha256').update(buffer).digest('hex');
  const duplicate = db.prepare('SELECT id,created_at,status FROM tachograph_imports WHERE user_id=? AND content_hash=?').get(userId, hash);
  if (duplicate) return { duplicate: true, id: duplicate.id, createdAt: duplicate.created_at, status: duplicate.status, sha256: hash };
  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();
  const payload = { originalName: metadata.originalName, declaredMime: metadata.declaredMime, bytes: buffer.toString('base64') };
  const encrypted = encrypt(id, userId, payload);
  db.prepare(`INSERT INTO tachograph_imports(id,user_id,content_hash,source_hint,status,ciphertext,iv,auth_tag,created_at)
    VALUES (?,?,?,?,?,?,?,?,?)`).run(id, userId, hash, metadata.sourceHint, 'received_unverified', encrypted.ciphertext, encrypted.iv, encrypted.authTag, createdAt);
  return { duplicate: false, id, createdAt, status: 'received_unverified', sha256: hash, sourceHint: metadata.sourceHint, bytes: buffer.length };
}
function listImports(userId) {
  return db.prepare('SELECT id,content_hash,source_hint,status,created_at FROM tachograph_imports WHERE user_id=? ORDER BY created_at DESC LIMIT 100').all(userId).map(row => ({
    id: row.id, sha256: row.content_hash, sourceHint: row.source_hint, status: row.status, createdAt: row.created_at,
  }));
}
function getImport(userId, id) {
  const row = db.prepare('SELECT * FROM tachograph_imports WHERE id=? AND user_id=?').get(id, userId);
  if (!row) return null;
  const payload = decrypt(row);
  return { ...payload, buffer: Buffer.from(payload.bytes, 'base64'), sha256: row.content_hash, status: row.status, createdAt: row.created_at };
}
function deleteImport(userId, id) { return db.prepare('DELETE FROM tachograph_imports WHERE id=? AND user_id=?').run(id, userId).changes === 1; }
function purgeExpiredImports(retentionDays, nowMs = Date.now()) {
  const days = Math.min(Math.max(Number(retentionDays) || 90, 1), 3650);
  const cutoff = new Date(nowMs - days * 24 * 60 * 60 * 1000).toISOString();
  const result = db.prepare('DELETE FROM tachograph_imports WHERE created_at < ?').run(cutoff);
  return { removed: result.changes, retentionDays: days };
}

module.exports = { saveImport, listImports, getImport, deleteImport, purgeExpiredImports };
