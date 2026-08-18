const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'fimocheck-security-'));
process.env.FIMO_DATA_DIR = temp;

try {
  const auth = require('../auth-store.js');
  const secure = require('../secure-store.js');
  const owner = auth.createInitialAdmin('owner-test', 'PhraseTemporaire!12345');
  const second = auth.createUser(owner.id, 'member-test', 'member');
  const marker = 'DONNEE-SENSIBLE-UNIQUE-987654';
  const saved = secure.saveAnalysis(owner.id, { mission:{reference:marker}, score:92 });
  assert.strictEqual(secure.getAnalysis(owner.id, saved.id).payload.mission.reference, marker, 'dechiffrement propriétaire');
  assert.strictEqual(secure.getAnalysis(second.user.id, saved.id), null, 'isolation inter-utilisateur');
  const raw = fs.readFileSync(path.join(temp, 'fimo.sqlite'));
  assert.strictEqual(raw.includes(Buffer.from(marker)), false, 'absence de texte clair dans SQLite');
  assert.strictEqual(fs.statSync(path.join(temp, 'encryption.key')).mode & 0o077, 0, 'permissions clé locale');
  assert.strictEqual(secure.deleteAnalysis(second.user.id, saved.id), false, 'suppression étrangère refusée');
  assert.strictEqual(secure.deleteAnalysis(owner.id, saved.id), true, 'suppression propriétaire');
  console.log('SECURITE DONNEES: 6/6');
} finally {
  fs.rmSync(temp, { recursive:true, force:true });
}
