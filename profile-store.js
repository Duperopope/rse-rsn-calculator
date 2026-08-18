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
  if (local.length !== 32) throw new Error('Clé locale de données invalide.');
  return local;
}

const key = loadKey();
const db = new Database(path.join(dataDir, 'fimo.sqlite'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
db.exec(`CREATE TABLE IF NOT EXISTS profile_avatars (
  user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  ciphertext BLOB NOT NULL,
  iv BLOB NOT NULL,
  auth_tag BLOB NOT NULL,
  content_type TEXT NOT NULL CHECK(content_type='image/webp'),
  content_hash TEXT NOT NULL,
  updated_at TEXT NOT NULL
)`);

function aad(userId) { return Buffer.from(`fimocheck:avatar:user:${userId}`); }
function saveAvatar(userId, webp) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv, { authTagLength: 16 });
  cipher.setAAD(aad(userId));
  const ciphertext = Buffer.concat([cipher.update(webp), cipher.final()]);
  const tag = cipher.getAuthTag();
  const hash = crypto.createHash('sha256').update(webp).digest('hex');
  const updatedAt = new Date().toISOString();
  db.prepare(`INSERT INTO profile_avatars(user_id,ciphertext,iv,auth_tag,content_type,content_hash,updated_at)
    VALUES (?,?,?,?,?,?,?) ON CONFLICT(user_id) DO UPDATE SET
    ciphertext=excluded.ciphertext,iv=excluded.iv,auth_tag=excluded.auth_tag,
    content_type=excluded.content_type,content_hash=excluded.content_hash,updated_at=excluded.updated_at`)
    .run(userId, ciphertext, iv, tag, 'image/webp', hash, updatedAt);
  return { contentType: 'image/webp', hash, updatedAt, bytes: webp.length };
}
function getAvatar(userId) {
  const row = db.prepare('SELECT * FROM profile_avatars WHERE user_id=?').get(userId);
  if (!row) return null;
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, row.iv, { authTagLength: 16 });
  decipher.setAAD(aad(userId));
  decipher.setAuthTag(row.auth_tag);
  const buffer = Buffer.concat([decipher.update(row.ciphertext), decipher.final()]);
  return { buffer, contentType: row.content_type, hash: row.content_hash, updatedAt: row.updated_at };
}
function deleteAvatar(userId) {
  return db.prepare('DELETE FROM profile_avatars WHERE user_id=?').run(userId).changes === 1;
}

module.exports = { saveAvatar, getAvatar, deleteAvatar };
