const Database = require('better-sqlite3');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const dataDir = process.env.FIMO_DATA_DIR || path.join(__dirname, 'data');
fs.mkdirSync(dataDir, { recursive: true, mode: 0o700 });
const db = new Database(path.join(dataDir, 'fimo.sqlite'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
db.pragma('busy_timeout = 5000');
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE COLLATE NOCASE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('admin','member','reviewer')),
    must_change_password INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS sessions (
    token_hash TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL,
    expires_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS audit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    event TEXT NOT NULL,
    detail TEXT,
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS recovery_codes (
    code_hash TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS audit_checkpoints (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pruned_through_id INTEGER NOT NULL,
    head_hash TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS webauthn_credentials (
    id TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    public_key BLOB NOT NULL,
    counter INTEGER NOT NULL DEFAULT 0,
    transports TEXT NOT NULL DEFAULT '[]',
    device_type TEXT,
    backed_up INTEGER NOT NULL DEFAULT 0,
    label TEXT NOT NULL,
    created_at TEXT NOT NULL,
    last_used_at TEXT
  );
  CREATE TABLE IF NOT EXISTS webauthn_challenges (
    id TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    purpose TEXT NOT NULL CHECK(purpose IN ('registration','authentication')),
    challenge TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
`);
try { db.exec('ALTER TABLE users ADD COLUMN active INTEGER NOT NULL DEFAULT 1'); } catch (_) { /* colonne deja presente */ }
try { db.exec('ALTER TABLE audit_log ADD COLUMN prev_hash TEXT'); } catch (_) { /* colonne deja presente */ }
try { db.exec('ALTER TABLE audit_log ADD COLUMN entry_hash TEXT'); } catch (_) { /* colonne deja presente */ }

function now() { return new Date().toISOString(); }
function normalizeUsername(value) { return String(value || '').trim().toLowerCase(); }
function validUsername(value) { return /^[a-z0-9][a-z0-9._-]{2,39}$/.test(value); }
function validPassword(value) { return typeof value === 'string' && value.length >= 15 && value.length <= 200; }
function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(password, salt, 64, { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 });
  return `scrypt$32768$${salt.toString('hex')}$${hash.toString('hex')}`;
}
function verifyPassword(password, encoded) {
  try {
    const [, n, saltHex, hashHex] = encoded.split('$');
    const expected = Buffer.from(hashHex, 'hex');
    const actual = crypto.scryptSync(password, Buffer.from(saltHex, 'hex'), expected.length, { N: Number(n), r: 8, p: 1, maxmem: 64 * 1024 * 1024 });
    return crypto.timingSafeEqual(expected, actual);
  } catch { return false; }
}
function auditDigest(previous, event, detail, createdAt) { return crypto.createHash('sha256').update([previous || '', event, detail || '', createdAt].join('\n')).digest('hex'); }
function ensureAuditChain() {
  const checkpoint = db.prepare('SELECT pruned_through_id,head_hash FROM audit_checkpoints ORDER BY id DESC LIMIT 1').get();
  let previous = checkpoint ? checkpoint.head_hash : '';
  const rows = db.prepare('SELECT id,event,detail,created_at,prev_hash,entry_hash FROM audit_log WHERE id>? ORDER BY id').all(checkpoint ? checkpoint.pruned_through_id : 0);
  const update = db.prepare('UPDATE audit_log SET prev_hash=?,entry_hash=? WHERE id=?');
  for (const row of rows) {
    const expected = auditDigest(previous, row.event, row.detail, row.created_at);
    if (!row.entry_hash) update.run(previous || null, expected, row.id);
    previous = row.entry_hash || expected;
  }
}
ensureAuditChain();
function audit(userId, event, detail) {
  const previous = db.prepare('SELECT entry_hash FROM audit_log ORDER BY id DESC LIMIT 1').get();
  const checkpoint = previous ? null : db.prepare('SELECT head_hash FROM audit_checkpoints ORDER BY id DESC LIMIT 1').get();
  const createdAt = now(); const prevHash = previous && previous.entry_hash || checkpoint && checkpoint.head_hash || '';
  const entryHash = auditDigest(prevHash, event, detail, createdAt);
  db.prepare('INSERT INTO audit_log(user_id,event,detail,created_at,prev_hash,entry_hash) VALUES (?,?,?,?,?,?)').run(userId || null, event, detail || null, createdAt, prevHash || null, entryHash);
}
function verifyAuditChain() {
  const checkpoint = db.prepare('SELECT pruned_through_id,head_hash FROM audit_checkpoints ORDER BY id DESC LIMIT 1').get();
  let previous = checkpoint ? checkpoint.head_hash : '';
  const rows = db.prepare('SELECT id,event,detail,created_at,prev_hash,entry_hash FROM audit_log WHERE id>? ORDER BY id').all(checkpoint ? checkpoint.pruned_through_id : 0);
  for (const row of rows) {
    const expected = auditDigest(previous, row.event, row.detail, row.created_at);
    if ((row.prev_hash || '') !== previous || row.entry_hash !== expected) return { ok: false, count: rows.length, brokenAt: row.id };
    previous = row.entry_hash;
  }
  return { ok: true, count: rows.length, head: previous || null, checkpoint: checkpoint || null };
}
function purgeAuditEvents(retentionDays, referenceTime) {
  const days = Math.min(Math.max(Number(retentionDays) || 730, 30), 3650);
  const cutoff = new Date((referenceTime || Date.now()) - days * 24 * 60 * 60 * 1000).toISOString();
  const rows = db.prepare('SELECT id,created_at,entry_hash FROM audit_log ORDER BY id').all();
  let last = null;
  for (const row of rows) { if (row.created_at < cutoff) last = row; else break; }
  if (!last) return { removed: 0, cutoff, retentionDays: days };
  const removed = db.transaction(function() {
    const count = db.prepare('DELETE FROM audit_log WHERE id<=?').run(last.id).changes;
    db.prepare('INSERT INTO audit_checkpoints(pruned_through_id,head_hash,created_at) VALUES (?,?,?)').run(last.id, last.entry_hash, now());
    return count;
  })();
  return { removed, cutoff, retentionDays: days, checkpointHead: last.entry_hash };
}
function createInitialAdmin(username, password) {
  username = normalizeUsername(username);
  if (!validUsername(username) || !validPassword(password)) throw new Error('Identifiant ou mot de passe invalide.');
  if (db.prepare('SELECT COUNT(*) AS n FROM users').get().n > 0) throw new Error('Un compte existe deja.');
  const ts = now();
  const result = db.prepare('INSERT INTO users(username,password_hash,role,must_change_password,created_at,updated_at) VALUES (?,?,?,?,?,?)').run(username, hashPassword(password), 'admin', 1, ts, ts);
  audit(result.lastInsertRowid, 'account.bootstrap', 'Compte administrateur initial');
  return { id: Number(result.lastInsertRowid), username, role: 'admin', mustChangePassword: true };
}
function login(username, password) {
  username = normalizeUsername(username);
  const user = db.prepare('SELECT * FROM users WHERE username=? AND active=1').get(username);
  if (!user || !verifyPassword(password, user.password_hash)) { audit(user && user.id, 'auth.failure', 'Identifiants invalides'); return null; }
  return issueSession(user, 'auth.login');
}
function issueSession(user, event = 'auth.login') {
  const token = crypto.randomBytes(32).toString('base64url');
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const expires = new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString();
  db.prepare('DELETE FROM sessions WHERE expires_at < ?').run(now());
  db.prepare('INSERT INTO sessions(token_hash,user_id,created_at,expires_at) VALUES (?,?,?,?)').run(tokenHash, user.id, now(), expires);
  audit(user.id, event, null);
  return { token, expires, user: publicUser(user) };
}
function publicUser(user) {
  const count = db.prepare('SELECT COUNT(*) AS n FROM webauthn_credentials WHERE user_id=?').get(user.id).n;
  return { id: user.id, username: user.username, role: user.role, mustChangePassword: Boolean(user.must_change_password), passkeyCount: count };
}
function getSession(token) {
  if (!token) return null;
  const hash = crypto.createHash('sha256').update(token).digest('hex');
  const row = db.prepare('SELECT s.token_hash,s.expires_at,u.* FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires_at>? AND u.active=1').get(hash, now());
  return row ? { tokenHash: hash, user: publicUser(row) } : null;
}
function logout(token) {
  const session = getSession(token);
  if (!session) return;
  db.prepare('DELETE FROM sessions WHERE token_hash=?').run(session.tokenHash);
  audit(session.user.id, 'auth.logout', null);
}
function changePassword(userId, currentPassword, newPassword) {
  if (!validPassword(newPassword)) throw new Error('Le nouveau mot de passe doit contenir au moins 15 caracteres.');
  const user = db.prepare('SELECT * FROM users WHERE id=?').get(userId);
  if (!user || !verifyPassword(currentPassword, user.password_hash)) throw new Error('Mot de passe actuel incorrect.');
  db.prepare('UPDATE users SET password_hash=?,must_change_password=0,updated_at=? WHERE id=?').run(hashPassword(newPassword), now(), userId);
  db.prepare('DELETE FROM sessions WHERE user_id=?').run(userId);
  audit(userId, 'auth.password_changed', null);
}

function issueRecoveryCodes(userId, currentPassword) {
  const user = db.prepare('SELECT * FROM users WHERE id=? AND active=1').get(userId);
  if (!user || !verifyPassword(currentPassword, user.password_hash)) throw new Error('Mot de passe actuel incorrect.');
  const codes = Array.from({ length: 8 }, function() { return crypto.randomBytes(18).toString('base64url'); });
  const insert = db.prepare('INSERT INTO recovery_codes(code_hash,user_id,created_at) VALUES (?,?,?)');
  db.transaction(function() {
    db.prepare('DELETE FROM recovery_codes WHERE user_id=?').run(userId);
    for (const code of codes) insert.run(crypto.createHash('sha256').update(code).digest('hex'), userId, now());
  })();
  audit(userId, 'auth.recovery_codes_issued', 'count=' + codes.length);
  return codes;
}

function recoverAccount(username, code, newPassword) {
  username = normalizeUsername(username);
  if (!validPassword(newPassword)) throw new Error('Le nouveau mot de passe doit contenir au moins 15 caracteres.');
  const user = db.prepare('SELECT * FROM users WHERE username=? AND active=1').get(username);
  const codeHash = crypto.createHash('sha256').update(String(code || '')).digest('hex');
  const match = user && db.prepare('SELECT code_hash FROM recovery_codes WHERE user_id=? AND code_hash=?').get(user.id, codeHash);
  if (!user || !match) { audit(user && user.id, 'auth.recovery_failure', null); return false; }
  db.transaction(function() {
    db.prepare('UPDATE users SET password_hash=?,must_change_password=0,updated_at=? WHERE id=?').run(hashPassword(newPassword), now(), user.id);
    db.prepare('DELETE FROM sessions WHERE user_id=?').run(user.id);
    db.prepare('DELETE FROM recovery_codes WHERE user_id=?').run(user.id);
  })();
  audit(user.id, 'auth.recovered', 'Toutes les sessions et tous les codes ont ete revoques');
  return true;
}

function deleteOwnAccount(userId, password, confirmation) {
  const user = db.prepare('SELECT * FROM users WHERE id=? AND active=1').get(userId);
  if (!user || !verifyPassword(password, user.password_hash)) throw new Error('Mot de passe actuel incorrect.');
  if (normalizeUsername(confirmation) !== user.username) throw new Error('Saisissez exactement votre identifiant pour confirmer.');
  const analyses = db.prepare('SELECT COUNT(*) AS n FROM analyses WHERE user_id=?').get(userId).n;
  db.transaction(function() {
    audit(userId, 'account.deleted', 'Compte ' + user.username + '; analyses_supprimees=' + analyses);
    db.prepare('DELETE FROM users WHERE id=?').run(userId);
  })();
  return { username: user.username, analysesDeleted: analyses };
}

function listUsers() {
  return db.prepare('SELECT id,username,role,must_change_password,active,created_at,updated_at FROM users ORDER BY id').all().map(function(u) {
    return { id:u.id, username:u.username, role:u.role, mustChangePassword:Boolean(u.must_change_password), active:Boolean(u.active), createdAt:u.created_at, updatedAt:u.updated_at };
  });
}
function createUser(actorId, username, role) {
  username = normalizeUsername(username);
  if (!validUsername(username)) throw new Error('Identifiant invalide.');
  if (!['admin','member'].includes(role)) role = 'member';
  const password = 'Fimo!' + crypto.randomBytes(18).toString('base64url');
  const ts = now();
  const result = db.prepare('INSERT INTO users(username,password_hash,role,must_change_password,active,created_at,updated_at) VALUES (?,?,?,?,?,?,?)').run(username, hashPassword(password), role, 1, 1, ts, ts);
  audit(actorId, 'account.created', 'Compte ' + username + ' role=' + role);
  return { user: publicUser(db.prepare('SELECT * FROM users WHERE id=?').get(result.lastInsertRowid)), temporaryPassword: password };
}
function revokeUserSessions(actorId, userId) {
  db.prepare('DELETE FROM sessions WHERE user_id=?').run(userId);
  audit(actorId, 'account.sessions_revoked', 'user_id=' + userId);
}
function setUserActive(actorId, userId, active) {
  db.prepare('UPDATE users SET active=?,updated_at=? WHERE id=?').run(active ? 1 : 0, now(), userId);
  if (!active) db.prepare('DELETE FROM sessions WHERE user_id=?').run(userId);
  audit(actorId, active ? 'account.enabled' : 'account.disabled', 'user_id=' + userId);
}
function recordAudit(userId,event,detail){ audit(userId,event,detail); }
function getProductMetrics() {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  return {
    generatedAt: now(),
    accounts: {
      total: db.prepare('SELECT COUNT(*) AS n FROM users').get().n,
      active: db.prepare('SELECT COUNT(*) AS n FROM users WHERE active=1').get().n,
      byRole: db.prepare('SELECT role,COUNT(*) AS count FROM users WHERE active=1 GROUP BY role').all()
    },
    usage: {
      analysesTotal: db.prepare('SELECT COUNT(*) AS n FROM analyses').get().n,
      analysesLast30Days: db.prepare('SELECT COUNT(*) AS n FROM analyses WHERE created_at>=?').get(since).n,
      successfulLoginsLast30Days: db.prepare("SELECT COUNT(*) AS n FROM audit_log WHERE event='auth.login' AND created_at>=?").get(since).n
    },
    economics: {
      currency: 'EUR', revenueGrossCents: 0, revenueNetCents: 0,
      paymentProviderConnected: false,
      evidence: 'Aucun prestataire de paiement ni registre de transactions connecté.'
    }
  };
}
function purgeExpiredSessions() {
  const timestamp = now();
  const removed = db.prepare('DELETE FROM sessions WHERE expires_at < ?').run(timestamp).changes;
  db.prepare('DELETE FROM webauthn_challenges WHERE expires_at < ?').run(timestamp);
  return removed;
}

function getActiveUserByUsername(username) {
  return db.prepare('SELECT * FROM users WHERE username=? AND active=1').get(normalizeUsername(username)) || null;
}
function verifyCurrentPassword(userId, password) {
  const user = db.prepare('SELECT * FROM users WHERE id=? AND active=1').get(userId);
  return Boolean(user && verifyPassword(password, user.password_hash));
}
function listPasskeys(userId, includePublicKey = false) {
  const columns = includePublicKey ? '*' : 'id,label,transports,device_type,backed_up,created_at,last_used_at';
  return db.prepare(`SELECT ${columns} FROM webauthn_credentials WHERE user_id=? ORDER BY created_at`).all(userId).map(row => ({
    id: row.id, label: row.label, transports: JSON.parse(row.transports || '[]'), deviceType: row.device_type,
    backedUp: Boolean(row.backed_up), createdAt: row.created_at, lastUsedAt: row.last_used_at,
    ...(includePublicKey ? { publicKey: new Uint8Array(row.public_key), counter: row.counter } : {}),
  }));
}
function savePasskey(userId, credential, metadata = {}) {
  const label = String(metadata.label || 'Passkey').trim().slice(0, 60) || 'Passkey';
  db.prepare(`INSERT INTO webauthn_credentials(id,user_id,public_key,counter,transports,device_type,backed_up,label,created_at)
    VALUES (?,?,?,?,?,?,?,?,?)`).run(credential.id, userId, Buffer.from(credential.publicKey), credential.counter || 0,
    JSON.stringify(credential.transports || []), metadata.deviceType || null, metadata.backedUp ? 1 : 0, label, now());
  audit(userId, 'auth.passkey_registered', `credential=${crypto.createHash('sha256').update(credential.id).digest('hex').slice(0,16)};device=${metadata.deviceType || 'unknown'};backed_up=${Boolean(metadata.backedUp)}`);
  return listPasskeys(userId).find(item => item.id === credential.id);
}
function getPasskeyForUser(userId, credentialId) {
  return listPasskeys(userId, true).find(item => item.id === credentialId) || null;
}
function updatePasskeyUsage(userId, credentialId, counter, backedUp) {
  db.prepare('UPDATE webauthn_credentials SET counter=?,backed_up=?,last_used_at=? WHERE id=? AND user_id=?')
    .run(counter, backedUp ? 1 : 0, now(), credentialId, userId);
}
function deletePasskey(userId, credentialId, currentPassword) {
  const user = db.prepare('SELECT * FROM users WHERE id=? AND active=1').get(userId);
  if (!user || !verifyPassword(currentPassword, user.password_hash)) throw new Error('Mot de passe actuel incorrect.');
  const removed = db.prepare('DELETE FROM webauthn_credentials WHERE id=? AND user_id=?').run(credentialId, userId).changes;
  if (removed) audit(userId, 'auth.passkey_deleted', `credential=${crypto.createHash('sha256').update(credentialId).digest('hex').slice(0,16)}`);
  return removed === 1;
}
function saveWebAuthnChallenge(userId, purpose, challenge) {
  db.prepare('DELETE FROM webauthn_challenges WHERE expires_at<? OR (user_id=? AND purpose=?)').run(now(), userId, purpose);
  const id = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
  db.prepare('INSERT INTO webauthn_challenges(id,user_id,purpose,challenge,expires_at,created_at) VALUES (?,?,?,?,?,?)')
    .run(id, userId, purpose, challenge, expiresAt, now());
  return id;
}
function consumeWebAuthnChallenge(id, userId, purpose) {
  const row = db.prepare('SELECT * FROM webauthn_challenges WHERE id=? AND user_id=? AND purpose=? AND expires_at>?').get(id, userId, purpose, now());
  db.prepare('DELETE FROM webauthn_challenges WHERE id=?').run(id);
  return row ? row.challenge : null;
}
function issuePasskeySession(userId) {
  const user = db.prepare('SELECT * FROM users WHERE id=? AND active=1').get(userId);
  return user ? issueSession(user, 'auth.passkey_login') : null;
}

module.exports = { createInitialAdmin, login, getSession, logout, changePassword, issueRecoveryCodes, recoverAccount, deleteOwnAccount, listUsers, createUser, revokeUserSessions, setUserActive, recordAudit, verifyAuditChain, getProductMetrics, purgeExpiredSessions, purgeAuditEvents, getActiveUserByUsername, verifyCurrentPassword, listPasskeys, savePasskey, getPasskeyForUser, updatePasskeyUsage, deletePasskey, saveWebAuthnChallenge, consumeWebAuthnChallenge, issuePasskeySession };
