const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const root = path.join(__dirname, '..');
const dataDir = process.env.FIMO_DATA_DIR || path.join(root, 'data');
const production = process.argv.includes('--production');
const checks = [];
function check(name, ok, detail, required = true) { checks.push({ name, status: ok ? 'pass' : required ? 'fail' : 'warn', detail }); }

try {
  const auth = require('../auth-store.js');
  const dbPath = path.join(dataDir, 'fimo.sqlite');
  check('database.exists', fs.existsSync(dbPath), dbPath);
  if (fs.existsSync(dbPath)) {
    const db = new Database(dbPath, { readonly: true, fileMustExist: true });
    check('database.integrity', db.pragma('integrity_check', { simple: true }) === 'ok', 'PRAGMA integrity_check');
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map(row => row.name);
    for (const table of ['users', 'sessions', 'audit_log', 'audit_checkpoints', 'recovery_codes', 'analyses', 'profile_avatars', 'tachograph_imports', 'webauthn_credentials', 'webauthn_challenges']) check('schema.' + table, tables.includes(table), 'table requise');
    check('accounts.admin', db.prepare("SELECT COUNT(*) AS n FROM users WHERE role='admin' AND active=1").get().n >= 1, 'au moins un administrateur actif', production);
    check('accounts.supported-roles', db.prepare("SELECT COUNT(*) AS n FROM users WHERE role NOT IN ('admin','member')").get().n === 0, 'aucun rôle sans workflow livré');
    db.close();
  }
  const audit = auth.verifyAuditChain();
  check('audit.chain', audit.ok, audit.ok ? `${audit.count} événements, tête ${audit.head || 'vide'}` : `rupture à ${audit.brokenAt}`);
  const keyPath = path.join(dataDir, 'encryption.key');
  if (fs.existsSync(keyPath)) check('key.permissions', (fs.statSync(keyPath).mode & 0o077) === 0, 'clé locale mode 0600');
  check('production.data-key', Boolean(process.env.FIMO_DATA_KEY), 'secret FIMO_DATA_KEY injecté', production);
  check('production.backup-key', Boolean(process.env.FIMO_BACKUP_KEY), 'secret FIMO_BACKUP_KEY injecté', production);
  check('production.origins', Boolean(process.env.FIMO_ALLOWED_ORIGINS), 'origine HTTPS explicite', production);
  check('production.https-origin', !process.env.FIMO_ALLOWED_ORIGINS || process.env.FIMO_ALLOWED_ORIGINS.split(',').every(value => value.trim().startsWith('https://')), 'toutes les origines sont HTTPS', production);
  check('production.webauthn-rp-id', Boolean(process.env.FIMO_WEBAUTHN_RP_ID), 'RP ID WebAuthn injecté', production);
  check('production.webauthn-origin', Boolean(process.env.FIMO_WEBAUTHN_ORIGIN) && process.env.FIMO_WEBAUTHN_ORIGIN.startsWith('https://'), 'origine WebAuthn HTTPS explicite', production);
} catch (error) { check('readiness.execution', false, error.message); }

const failures = checks.filter(item => item.status === 'fail');
process.stdout.write(JSON.stringify({ ready: failures.length === 0, mode: production ? 'production' : 'local', checkedAt: new Date().toISOString(), checks }, null, 2) + '\n');
if (failures.length) process.exitCode = 1;
