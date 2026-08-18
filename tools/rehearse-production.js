const { execFileSync, spawnSync } = require('child_process');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { sourceEvidence } = require('./source-evidence.js');

const image = process.env.FIMO_REHEARSAL_IMAGE || 'fimocheck:production-candidate';
const stamp = `${process.pid}-${Date.now()}`;
const sourceVolume = `fimocheck-rehearsal-source-${stamp}`;
const restoreVolume = `fimocheck-rehearsal-restore-${stamp}`;
const container = `fimocheck-rehearsal-${stamp}`;
const port = String(process.env.FIMO_REHEARSAL_PORT || 3201);
const dataKey = crypto.randomBytes(32).toString('base64');
const backupKey = crypto.randomBytes(32).toString('base64');
const temporaryPassword = crypto.randomBytes(24).toString('base64url');

function docker(args, options = {}) {
  return execFileSync('docker', args, { encoding: 'utf8', stdio: options.quiet ? 'ignore' : 'pipe' });
}
function envArgs() {
  return ['-e', 'NODE_ENV=production', '-e', 'FIMO_DATA_DIR=/data', '-e', `FIMO_DATA_KEY=${dataKey}`,
    '-e', `FIMO_BACKUP_KEY=${backupKey}`, '-e', 'FIMO_ALLOWED_ORIGINS=https://pilot.fimocheck.invalid',
    '-e', 'FIMO_WEBAUTHN_RP_ID=pilot.fimocheck.invalid', '-e', 'FIMO_WEBAUTHN_ORIGIN=https://pilot.fimocheck.invalid',
    '-e', 'FIMO_TACHOGRAPH_RETENTION_DAYS=90'];
}
function cleanup() {
  spawnSync('docker', ['rm', '-f', container], { stdio: 'ignore' });
  spawnSync('docker', ['volume', 'rm', sourceVolume], { stdio: 'ignore' });
  spawnSync('docker', ['volume', 'rm', restoreVolume], { stdio: 'ignore' });
}
function parseJson(output) {
  const start = output.indexOf('{');
  if (start < 0) throw new Error(`Sortie JSON absente : ${output}`);
  return JSON.parse(output.slice(start));
}

(async function run() {
  let result;
  cleanup();
  try {
    docker(['build', '-t', image, '.'], { quiet: true });
    docker(['volume', 'create', sourceVolume], { quiet: true });
    docker(['volume', 'create', restoreVolume], { quiet: true });
    docker(['run', '--rm', '--user', 'node', '-v', `${sourceVolume}:/data`, ...envArgs(), image,
      'node', 'tools/create-admin.js', 'rehearsal-owner', temporaryPassword], { quiet: true });
    docker(['run', '-d', '--name', container, '--read-only', '--cap-drop', 'ALL',
      '--security-opt', 'no-new-privileges:true', '--tmpfs', '/app/uploads:rw,noexec,nosuid,size=16m',
      '--tmpfs', '/tmp:rw,noexec,nosuid,size=32m', '-p', `127.0.0.1:${port}:3001`,
      '-v', `${sourceVolume}:/data`, ...envArgs(), image], { quiet: true });

    let health;
    for (let attempt = 0; attempt < 20; attempt += 1) {
      await new Promise(resolve => setTimeout(resolve, 250));
      try { health = await fetch(`http://127.0.0.1:${port}/api/health`).then(response => response.ok ? response.json() : null); }
      catch { /* démarrage en cours */ }
      if (health) break;
    }
    if (!health) throw new Error(docker(['logs', container]));

    const readiness = parseJson(docker(['exec', container, 'node', 'tools/readiness-check.js', '--production']));
    if (!readiness.ready) throw new Error('Readiness production refusée.');
    const backup = JSON.parse(docker(['exec', container, 'node', 'tools/backup.js', '/data/rehearsal.fimobak']));

    // Le volume cible est monté sur /data : Docker reprend ainsi le propriétaire
    // node:node préparé dans l'image, au lieu de créer un dossier root non inscriptible.
    const restore = JSON.parse(docker(['run', '--rm', '--user', 'node', '-v', `${sourceVolume}:/source:ro`,
      '-v', `${restoreVolume}:/data`, ...envArgs(), image, 'node', 'tools/restore-backup.js',
      '/source/rehearsal.fimobak', '/data']));
    if (!restore.databaseSha256) throw new Error('Empreinte de la base restaurée absente.');
    const restoredReadiness = parseJson(docker(['run', '--rm', '--user', 'node', '-v', `${restoreVolume}:/data`,
      ...envArgs(), image, 'node', 'tools/readiness-check.js', '--production']));
    if (!restoredReadiness.ready) throw new Error('Readiness de la restauration refusée.');

    const hardening = docker(['inspect', container, '--format', '{{.Config.User}}|{{.HostConfig.ReadonlyRootfs}}|{{json .HostConfig.CapDrop}}']).trim();
    if (hardening !== 'node|true|["ALL"]') throw new Error(`Durcissement inattendu : ${hardening}`);
    result = {
      status: 'passed', image, health: health.status, version: health.version,
      sourceReady: readiness.ready, restoredReady: restoredReadiness.ready,
      backupSha256: backup.sha256, restoredDatabaseSha256: restore.databaseSha256,
      hardening: { user: 'node', readOnlyRoot: true, capabilitiesDropped: ['ALL'] },
      ephemeralResourcesRemoved: true,
      verifiedAt: new Date().toISOString(),
      sourceEvidence: sourceEvidence(path.join(__dirname, '..')),
    };
  } finally { cleanup(); }
  const runtimeDir = path.join(__dirname, '..', '.runtime');
  fs.mkdirSync(runtimeDir, { recursive: true, mode: 0o700 });
  fs.writeFileSync(path.join(runtimeDir, 'production-rehearsal.json'), JSON.stringify(result, null, 2), { mode: 0o600 });
  process.stdout.write(JSON.stringify(result, null, 2) + '\n');
})().catch(error => { console.error(error.message); process.exitCode = 1; });
