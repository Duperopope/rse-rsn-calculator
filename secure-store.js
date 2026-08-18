const Database = require('better-sqlite3');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const dataDir = process.env.FIMO_DATA_DIR || path.join(__dirname, 'data');
fs.mkdirSync(dataDir, { recursive: true, mode: 0o700 });

function loadKey() {
  if (process.env.FIMO_DATA_KEY) {
    const key = Buffer.from(process.env.FIMO_DATA_KEY, 'base64');
    if (key.length !== 32) throw new Error('FIMO_DATA_KEY doit contenir exactement 32 octets encodes en base64.');
    return key;
  }
  if (process.env.NODE_ENV === 'production') throw new Error('FIMO_DATA_KEY est obligatoire en production.');
  const keyPath = path.join(dataDir, 'encryption.key');
  if (!fs.existsSync(keyPath)) fs.writeFileSync(keyPath, crypto.randomBytes(32), { mode: 0o600, flag: 'wx' });
  const key = fs.readFileSync(keyPath);
  if (key.length !== 32) throw new Error('Cle locale de donnees invalide.');
  return key;
}

const key = loadKey();
const db = new Database(path.join(dataDir, 'fimo.sqlite'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
db.exec(`CREATE TABLE IF NOT EXISTS analyses (
  id TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  ciphertext BLOB NOT NULL,
  iv BLOB NOT NULL,
  auth_tag BLOB NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
)`);

function aad(id, userId) { return Buffer.from('fimocheck:analysis:' + id + ':user:' + userId); }
function encrypt(id, userId, value) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv, { authTagLength: 16 });
  cipher.setAAD(aad(id, userId));
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify(value), 'utf8'), cipher.final()]);
  return { ciphertext, iv, tag: cipher.getAuthTag() };
}
function decrypt(row) {
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, row.iv, { authTagLength: 16 });
  decipher.setAAD(aad(row.id, row.user_id));
  decipher.setAuthTag(row.auth_tag);
  return JSON.parse(Buffer.concat([decipher.update(row.ciphertext), decipher.final()]).toString('utf8'));
}
function saveAnalysis(userId, payload) {
  const id = crypto.randomUUID(); const ts = new Date().toISOString(); const enc = encrypt(id, userId, payload);
  db.prepare('INSERT INTO analyses(id,user_id,ciphertext,iv,auth_tag,created_at,updated_at) VALUES (?,?,?,?,?,?,?)').run(id,userId,enc.ciphertext,enc.iv,enc.tag,ts,ts);
  return { id, createdAt: ts };
}
function listAnalyses(userId, limit) {
  return db.prepare('SELECT * FROM analyses WHERE user_id=? ORDER BY created_at DESC LIMIT ?').all(userId, Math.min(Math.max(Number(limit)||50,1),100)).map(function(row) {
    const payload=decrypt(row); return { id:row.id, createdAt:row.created_at, payload };
  });
}
function getAnalysis(userId,id) { const row=db.prepare('SELECT * FROM analyses WHERE id=? AND user_id=?').get(id,userId); return row?{id:row.id,createdAt:row.created_at,payload:decrypt(row)}:null; }
function deleteAnalysis(userId,id) { return db.prepare('DELETE FROM analyses WHERE id=? AND user_id=?').run(id,userId).changes===1; }
function deleteAllAnalyses(userId) { return db.prepare('DELETE FROM analyses WHERE user_id=?').run(userId).changes; }
function updateAnalysis(userId,id,payload){const existing=db.prepare('SELECT id FROM analyses WHERE id=? AND user_id=?').get(id,userId);if(!existing)return false;const enc=encrypt(id,userId,payload);db.prepare('UPDATE analyses SET ciphertext=?,iv=?,auth_tag=?,updated_at=? WHERE id=? AND user_id=?').run(enc.ciphertext,enc.iv,enc.tag,new Date().toISOString(),id,userId);return true;}
function purgeExpiredAnalyses(retentionDays) {
  const days = Math.min(Math.max(Number(retentionDays) || 365, 1), 3650);
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  return { removed: db.prepare('DELETE FROM analyses WHERE created_at < ?').run(cutoff).changes, cutoff, retentionDays: days };
}

module.exports={saveAnalysis,listAnalyses,getAnalysis,deleteAnalysis,deleteAllAnalyses,updateAnalysis,purgeExpiredAnalyses};
