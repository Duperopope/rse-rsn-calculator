const assert = require('assert');
const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn, spawnSync } = require('child_process');
const sharp = require('sharp');
const { encodeCBOR } = require('@levischuck/tiny-cbor');

const root = path.join(__dirname, '..');
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'fimocheck-auth-api-'));
const port = 3197;
const base = `http://127.0.0.1:${port}`;
const ownerPassword = 'PhraseTemporaire!API-12345';
const uploadDir = path.join(temp, 'uploads');
const env = { ...process.env, FIMO_DATA_DIR: temp, FIMO_UPLOAD_DIR: uploadDir, PORT: String(port), NODE_ENV: 'test' };
let server;
const b64url = value => Buffer.from(value).toString('base64url');
function webauthnClientData(type, challenge, origin) {
  return Buffer.from(JSON.stringify({ type, challenge, origin, crossOrigin: false }));
}
function rawEcdsaToDer(raw) {
  const integer = bytes => {
    let value = Buffer.from(bytes);
    while (value.length > 1 && value[0] === 0) value = value.subarray(1);
    if (value[0] & 0x80) value = Buffer.concat([Buffer.from([0]), value]);
    return Buffer.concat([Buffer.from([0x02, value.length]), value]);
  };
  const r = integer(raw.subarray(0, 32));
  const s = integer(raw.subarray(32));
  return Buffer.concat([Buffer.from([0x30, r.length + s.length]), r, s]);
}
async function createSoftwarePasskey(options, origin) {
  const keys = await crypto.webcrypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
  const jwk = await crypto.webcrypto.subtle.exportKey('jwk', keys.publicKey);
  const credentialId = crypto.randomBytes(32);
  const coseKey = new Map([[1, 2], [3, -7], [-1, 1], [-2, Buffer.from(jwk.x, 'base64url')], [-3, Buffer.from(jwk.y, 'base64url')]]);
  const rpHash = crypto.createHash('sha256').update(options.rp.id).digest();
  const authenticatorData = Buffer.concat([rpHash, Buffer.from([0x45]), Buffer.alloc(4), Buffer.alloc(16), Buffer.from([0, credentialId.length]), credentialId, Buffer.from(encodeCBOR(coseKey))]);
  const attestation = encodeCBOR(new Map([['fmt', 'none'], ['attStmt', new Map()], ['authData', authenticatorData]]));
  return {
    credentialId, privateKey: keys.privateKey,
    response: { id: b64url(credentialId), rawId: b64url(credentialId), type: 'public-key', authenticatorAttachment: 'platform',
      response: { clientDataJSON: b64url(webauthnClientData('webauthn.create', options.challenge, origin)), attestationObject: b64url(attestation), transports: ['internal'] },
      clientExtensionResults: {} },
  };
}
async function createSoftwareAssertion(options, origin, passkey) {
  const authenticatorData = Buffer.concat([crypto.createHash('sha256').update(options.rpId).digest(), Buffer.from([0x05]), Buffer.from([0, 0, 0, 1])]);
  const clientData = webauthnClientData('webauthn.get', options.challenge, origin);
  const signed = Buffer.concat([authenticatorData, crypto.createHash('sha256').update(clientData).digest()]);
  const rawSignature = Buffer.from(await crypto.webcrypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, passkey.privateKey, signed));
  return { id: b64url(passkey.credentialId), rawId: b64url(passkey.credentialId), type: 'public-key', authenticatorAttachment: 'platform',
    response: { clientDataJSON: b64url(clientData), authenticatorData: b64url(authenticatorData), signature: b64url(rawEcdsaToDer(rawSignature)), userHandle: null }, clientExtensionResults: {} };
}

function cookieFrom(response) {
  const raw = response.headers.get('set-cookie') || '';
  return raw.split(';', 1)[0];
}

async function request(route, options = {}, cookie = '') {
  const headers = { ...(options.headers || {}) };
  if (cookie) headers.Cookie = cookie;
  if (typeof options.body === 'string' && !headers['Content-Type']) headers['Content-Type'] = 'application/json';
  return fetch(base + route, { ...options, headers });
}

async function waitForServer() {
  for (let i = 0; i < 50; i += 1) {
    try {
      const response = await request('/api/health');
      if (response.ok) return;
    } catch (_) { /* démarrage en cours */ }
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error('Le serveur de recette ne démarre pas.');
}

(async function run() {
  try {
    const bootstrap = spawnSync(process.execPath, ['tools/create-admin.js', 'owner-api', ownerPassword], { cwd: root, env, encoding: 'utf8' });
    assert.strictEqual(bootstrap.status, 0, bootstrap.stderr);
    server = spawn(process.execPath, ['server.js'], { cwd: root, env, stdio: ['ignore', 'ignore', 'pipe'] });
    await waitForServer();

    let response = await request('/api/analyses');
    assert.strictEqual(response.status, 401, 'historique sans session refusé');
    response = await request('/api/analyze', { method: 'POST', body: JSON.stringify({ csv: 'x' }) });
    assert.strictEqual(response.status, 401, 'analyse sans session refusée');
    response = await request('/api/rapport/pdf', { method: 'POST', body: JSON.stringify({ resultat: { score: 100 } }) });
    assert.strictEqual(response.status, 401, 'PDF sans session refusé');

    response = await request('/api/auth/login', { method: 'POST', body: JSON.stringify({ username: 'owner-api', password: ownerPassword }) });
    assert.strictEqual(response.status, 200, 'connexion propriétaire');
    const ownerCookie = cookieFrom(response);

    response = await request('/api/auth/recovery-codes', { method: 'POST', body: JSON.stringify({ currentPassword: ownerPassword }) }, ownerCookie);
    assert.strictEqual(response.status, 200, 'génération codes de récupération');
    const recovery = await response.json();
    assert.strictEqual(recovery.codes.length, 8, 'huit codes uniques');

    response = await request('/api/admin/users', { method: 'POST', body: JSON.stringify({ username: 'member-api', role: 'member' }) }, ownerCookie);
    assert.strictEqual(response.status, 201, 'création membre');
    const created = await response.json();

    response = await request('/api/auth/login', { method: 'POST', body: JSON.stringify({ username: 'member-api', password: created.temporaryPassword }) });
    assert.strictEqual(response.status, 200, 'connexion membre');
    const memberCookie = cookieFrom(response);

    response = await request('/api/auth/passkeys', {}, memberCookie);
    assert.strictEqual(response.status, 200, 'inventaire passkeys accessible');
    assert.deepStrictEqual((await response.json()).passkeys, [], 'aucune passkey au départ');
    response = await request('/api/auth/passkeys/register/options', {
      method: 'POST', body: JSON.stringify({ currentPassword: 'mot-de-passe-incorrect' }),
    }, memberCookie);
    assert.strictEqual(response.status, 403, 'mot de passe actuel exigé avant enrôlement passkey');
    response = await request('/api/auth/passkeys/register/options', {
      method: 'POST', body: JSON.stringify({ currentPassword: created.temporaryPassword, label: 'Navigateur de recette' }),
    }, memberCookie);
    assert.strictEqual(response.status, 200, 'options passkey générées');
    const passkeyOptions = await response.json();
    assert.strictEqual(passkeyOptions.options.authenticatorSelection.userVerification, 'required', 'vérification utilisateur obligatoire');
    assert.strictEqual(passkeyOptions.options.authenticatorSelection.residentKey, 'required', 'identifiant découvrable obligatoire');
    response = await request('/api/auth/passkeys/register/verify', {
      method: 'POST', body: JSON.stringify({ challengeId: passkeyOptions.challengeId, label: 'Recette', response: { id: 'invalide' } }),
    }, memberCookie);
    assert.strictEqual(response.status, 400, 'attestation invalide refusée');
    response = await request('/api/auth/passkeys/register/verify', {
      method: 'POST', body: JSON.stringify({ challengeId: passkeyOptions.challengeId, label: 'Recette', response: { id: 'invalide' } }),
    }, memberCookie);
    assert.strictEqual(response.status, 400, 'challenge consommé impossible à rejouer');
    response = await request('/api/auth/passkeys/login/options', {
      method: 'POST', body: JSON.stringify({ username: 'member-api' }),
    });
    assert.strictEqual(response.status, 400, 'connexion passkey refusée sans clé enregistrée');

    response = await request('/api/auth/passkeys/register/options', {
      method: 'POST', body: JSON.stringify({ currentPassword: created.temporaryPassword, label: 'Authentificateur logiciel de recette' }),
    }, memberCookie);
    const registrationPayload = await response.json();
    const softwarePasskey = await createSoftwarePasskey(registrationPayload.options, base);
    response = await request('/api/auth/passkeys/register/verify', {
      method: 'POST', body: JSON.stringify({ challengeId: registrationPayload.challengeId, label: 'Authentificateur logiciel de recette', response: softwarePasskey.response }),
    }, memberCookie);
    assert.strictEqual(response.status, 201, 'attestation WebAuthn cryptographique acceptée');
    response = await request('/api/auth/passkeys/login/options', { method: 'POST', body: JSON.stringify({ username: 'member-api' }) });
    assert.strictEqual(response.status, 200, 'options de connexion passkey disponibles');
    const authenticationPayload = await response.json();
    const assertion = await createSoftwareAssertion(authenticationPayload.options, base, softwarePasskey);
    response = await request('/api/auth/passkeys/login/verify', {
      method: 'POST', body: JSON.stringify({ username: 'member-api', challengeId: authenticationPayload.challengeId, response: assertion }),
    });
    assert.strictEqual(response.status, 200, 'signature WebAuthn vérifiée et session créée');
    assert.ok(cookieFrom(response).startsWith('fimo_session='), 'cookie de session passkey émis');

    response = await request('/api/account/avatar', {}, memberCookie);
    assert.strictEqual(response.status, 404, 'avatar absent au départ');
    const avatarPng = await sharp({
      create: { width: 48, height: 64, channels: 4, background: { r: 19, g: 111, b: 108, alpha: 1 } },
    }).png().toBuffer();
    const avatarForm = new FormData();
    avatarForm.append('avatar', new Blob([avatarPng], { type: 'image/png' }), 'portrait-test.png');
    response = await request('/api/account/avatar', { method: 'PUT', body: avatarForm }, memberCookie);
    assert.strictEqual(response.status, 200, 'avatar synthétique accepté');
    const avatarSaved = await response.json();
    assert.strictEqual(avatarSaved.avatar.contentType, 'image/webp', 'avatar réencodé en WebP');
    response = await request('/api/account/avatar', {}, memberCookie);
    assert.strictEqual(response.status, 200, 'avatar restitué au propriétaire');
    assert.strictEqual(response.headers.get('content-type'), 'image/webp', 'type de sortie maîtrisé');
    const renderedAvatar = Buffer.from(await response.arrayBuffer());
    const avatarMetadata = await sharp(renderedAvatar).metadata();
    assert.deepStrictEqual([avatarMetadata.width, avatarMetadata.height], [256, 256], 'avatar carré standardisé');
    const invalidAvatarForm = new FormData();
    invalidAvatarForm.append('avatar', new Blob(['pas-une-image'], { type: 'image/png' }), 'fausse-image.png');
    response = await request('/api/account/avatar', { method: 'PUT', body: invalidAvatarForm }, memberCookie);
    assert.strictEqual(response.status, 400, 'contenu falsifié refusé');
    response = await request('/api/account/avatar', { method: 'DELETE' }, memberCookie);
    assert.strictEqual(response.status, 200, 'avatar supprimable');
    response = await request('/api/account/avatar', {}, memberCookie);
    assert.strictEqual(response.status, 404, 'suppression avatar effective');

    response = await request('/api/tachograph/capabilities', {}, memberCookie);
    assert.strictEqual(response.status, 200, 'capacités tachygraphe accessibles');
    const capabilities = await response.json();
    assert.strictEqual(capabilities.analysisEnabled, false, 'analyse binaire honnêtement désactivée');
    assert.strictEqual(capabilities.signatureVerification.configured, false, 'signature non prétendue');
    const tachoBytes = crypto.randomBytes(1024);
    tachoBytes.write('FIMO-TACHO-FIXTURE', 50, 'ascii');
    const tachoForm = new FormData();
    tachoForm.append('tachograph', new Blob([tachoBytes], { type: 'application/octet-stream' }), 'fixture-anonyme.ddd');
    response = await request('/api/tachograph/imports', { method: 'POST', body: tachoForm }, memberCookie);
    assert.strictEqual(response.status, 201, 'enveloppe binaire tachygraphe reçue');
    const tachoImport = await response.json();
    assert.strictEqual(tachoImport.status, 'received_unverified', 'statut non vérifié explicite');
    assert.strictEqual(tachoImport.analysisEnabled, false, 'aucune analyse déclenchée');
    const duplicateForm = new FormData();
    duplicateForm.append('tachograph', new Blob([tachoBytes], { type: 'application/octet-stream' }), 'copie.ddd');
    response = await request('/api/tachograph/imports', { method: 'POST', body: duplicateForm }, memberCookie);
    assert.strictEqual(response.status, 200, 'doublon reconnu sans deuxième stockage');
    assert.strictEqual((await response.json()).duplicate, true, 'doublon signalé');
    response = await request('/api/tachograph/imports', {}, memberCookie);
    assert.strictEqual((await response.json()).imports.length, 1, 'inventaire isolé par utilisateur');
    const tachoDbFiles = ['fimo.sqlite', 'fimo.sqlite-wal'].filter(name => fs.existsSync(path.join(temp, name)));
    const rawTachoDb = Buffer.concat(tachoDbFiles.map(name => fs.readFileSync(path.join(temp, name))));
    assert.strictEqual(rawTachoDb.includes(Buffer.from('FIMO-TACHO-FIXTURE')), false, 'contenu tachygraphe absent en clair de SQLite/WAL');
    response = await request(`/api/tachograph/imports/${tachoImport.id}/original`, {}, ownerCookie);
    assert.strictEqual(response.status, 404, 'lecture tachygraphe croisée refusée');
    response = await request(`/api/tachograph/imports/${tachoImport.id}/original`, {}, memberCookie);
    assert.strictEqual(response.status, 200, 'original restitué au propriétaire');
    assert.deepStrictEqual(Buffer.from(await response.arrayBuffer()), tachoBytes, 'octets originaux préservés');
    const fakeTachoForm = new FormData();
    fakeTachoForm.append('tachograph', new Blob(['date;debut;fin;type\n2026-08-18;06:00;07:00;C\n'], { type: 'application/octet-stream' }), 'csv-renomme.ddd');
    response = await request('/api/tachograph/imports', { method: 'POST', body: fakeTachoForm }, memberCookie);
    assert.strictEqual(response.status, 400, 'CSV renommé en DDD refusé');
    response = await request(`/api/tachograph/imports/${tachoImport.id}`, { method: 'DELETE' }, memberCookie);
    assert.strictEqual(response.status, 200, 'import tachygraphe supprimable');

    const form = new FormData();
    form.append('fichier', new Blob(['date;debut;fin;type\n2026-08-18;06:00;07:00;C\n'], { type: 'text/csv' }), 'recette.csv');
    response = await request('/api/upload', { method: 'POST', body: form }, memberCookie);
    assert.strictEqual(response.status, 200, 'upload CSV authentifié');
    const uploadResult = await response.json();
    assert.strictEqual(uploadResult.nom_fichier, 'recette.csv', 'nom de fichier restitué');
    assert.strictEqual(uploadResult.csv.includes('2026-08-18'), true, 'contenu CSV restitué');
    assert.strictEqual(fs.readdirSync(uploadDir).length, 0, 'fichier temporaire supprimé');

    response = await request('/api/admin/metrics', {}, memberCookie);
    assert.strictEqual(response.status, 403, 'métriques refusées au membre');

    const marker = 'API-DONNEE-SENSIBLE-13579';
    response = await request('/api/analyses', { method: 'POST', body: JSON.stringify({ payload: { mission: { reference: marker }, score: 88 } }) }, ownerCookie);
    assert.strictEqual(response.status, 201, 'enregistrement analyse');
    const saved = await response.json();

    response = await request('/api/admin/metrics', {}, ownerCookie);
    assert.strictEqual(response.status, 200, 'métriques accessibles à l’administrateur');
    const metrics = await response.json();
    assert.strictEqual(metrics.usage.analysesTotal, 1, 'analyse comptée depuis la base');
    assert.strictEqual(metrics.economics.revenueGrossCents, 0, 'revenu suivi explicitement nul');
    assert.strictEqual(metrics.economics.paymentProviderConnected, false, 'absence de paiement explicitée');
    response = await request('/api/admin/control-room', {}, memberCookie);
    assert.strictEqual(response.status, 403, 'centre de commandement refusé au membre');
    response = await request('/api/admin/control-room', {}, ownerCookie);
    assert.strictEqual(response.status, 200, 'centre de commandement accessible à l’administrateur');
    let controlRoom = await response.json();
    assert.strictEqual(controlRoom.application.status, 'operational', 'état runtime mesuré');
    assert.strictEqual(controlRoom.security.audit.ok, true, 'intégrité audit remontée');
    assert.strictEqual(controlRoom.metrics.usage.analysesTotal, 1, 'métriques non dupliquées');
    assert.ok(controlRoom.alerts.some(item => item.code === 'backup-missing'), 'absence de sauvegarde rendue visible');
    response = await request('/api/admin/maintenance', { method: 'POST' }, ownerCookie);
    assert.strictEqual(response.status, 200, 'maintenance déclenchable par administrateur');
    response = await request('/api/admin/control-room', {}, ownerCookie);
    controlRoom = await response.json();
    assert.ok(controlRoom.maintenance.lastRun && controlRoom.maintenance.lastRun.ranAt, 'preuve de maintenance exposée');

    response = await request('/api/analyses/' + saved.id, {}, memberCookie);
    assert.strictEqual(response.status, 404, 'lecture croisée refusée');
    response = await request('/api/analyses/' + saved.id, { method: 'DELETE' }, memberCookie);
    assert.strictEqual(response.status, 404, 'suppression croisée refusée');

    response = await request('/api/analyses/export', {}, ownerCookie);
    assert.strictEqual(response.status, 200, 'export propriétaire');
    const exported = await response.json();
    assert.strictEqual(exported.analyses[0].payload.mission.reference, marker, 'export déchiffré pour le propriétaire');

    const files = ['fimo.sqlite', 'fimo.sqlite-wal'].filter(name => fs.existsSync(path.join(temp, name)));
    const raw = Buffer.concat(files.map(name => fs.readFileSync(path.join(temp, name))));
    assert.strictEqual(raw.includes(Buffer.from(marker)), false, 'aucun contenu métier en clair dans SQLite/WAL');

    response = await request('/api/analyses/' + saved.id, { method: 'DELETE' }, ownerCookie);
    assert.strictEqual(response.status, 200, 'suppression propriétaire');
    const recoveredPassword = 'NouveauSecret!API-67890';
    response = await request('/api/auth/recover', { method: 'POST', body: JSON.stringify({ username: 'owner-api', code: recovery.codes[0], newPassword: recoveredPassword }) });
    assert.strictEqual(response.status, 200, 'récupération du compte');
    response = await request('/api/auth/login', { method: 'POST', body: JSON.stringify({ username: 'owner-api', password: ownerPassword }) });
    assert.strictEqual(response.status, 401, 'ancien mot de passe révoqué');
    response = await request('/api/auth/login', { method: 'POST', body: JSON.stringify({ username: 'owner-api', password: recoveredPassword }) });
    assert.strictEqual(response.status, 200, 'connexion après récupération');
    const recoveredCookie = cookieFrom(response);
    response = await request('/api/auth/recover', { method: 'POST', body: JSON.stringify({ username: 'owner-api', code: recovery.codes[1], newPassword: ownerPassword }) });
    assert.strictEqual(response.status, 400, 'tous les codes sont révoqués après usage');
    response = await request('/api/analyses', { method: 'POST', body: JSON.stringify({ payload: { mission: { reference: 'A-EFFACER' } } }) }, recoveredCookie);
    assert.strictEqual(response.status, 201, 'donnée créée avant suppression compte');
    response = await request('/api/account', { method: 'DELETE', body: JSON.stringify({ password: recoveredPassword, confirmation: 'mauvais-identifiant' }) }, recoveredCookie);
    assert.strictEqual(response.status, 400, 'confirmation de suppression stricte');
    response = await request('/api/account', { method: 'DELETE', body: JSON.stringify({ password: recoveredPassword, confirmation: 'owner-api' }) }, recoveredCookie);
    assert.strictEqual(response.status, 200, 'suppression complète du compte');
    const deleted = await response.json();
    assert.strictEqual(deleted.deleted.analysesDeleted, 1, 'donnée rattachée supprimée en cascade');
    response = await request('/api/auth/login', { method: 'POST', body: JSON.stringify({ username: 'owner-api', password: recoveredPassword }) });
    assert.strictEqual(response.status, 401, 'compte supprimé inutilisable');
    console.log('SECURITE API: 79/79');
  } finally {
    if (server) server.kill('SIGTERM');
    fs.rmSync(temp, { recursive: true, force: true });
  }
})().catch(error => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
