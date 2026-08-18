const path = require('path');
const fs = require('fs');
const { restoreBackup } = require('../backup-store.js');

const source = process.argv[2];
const target = process.argv[3];
if (!source || !target) throw new Error('Usage : node tools/restore-backup.js sauvegarde.fimobak /dossier/vide');
const result = restoreBackup(path.resolve(source), path.resolve(target));
fs.writeFileSync(path.join(path.resolve(target), 'last-restore.json'), JSON.stringify(result, null, 2), { mode: 0o600 });
process.stdout.write(JSON.stringify(result) + '\n');
