const path = require('path');
const fs = require('fs');
const { createBackup } = require('../backup-store.js');

const dataDir = process.env.FIMO_DATA_DIR || path.join(__dirname, '..', 'data');
const destination = process.argv[2];
if (!destination) throw new Error('Usage : node tools/backup.js /chemin/sauvegarde.fimobak');
createBackup(dataDir, path.resolve(destination)).then(result => {
  const receipt = path.join(dataDir, 'last-backup.json');
  fs.writeFileSync(receipt, JSON.stringify({ ...result, verifiedRestoreAt: null }, null, 2), { mode: 0o600 });
  process.stdout.write(JSON.stringify(result) + '\n');
}).catch(error => { console.error(error.message); process.exitCode = 1; });
