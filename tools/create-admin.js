const crypto = require('crypto');
const { createInitialAdmin } = require('../auth-store.js');
const username = process.argv[2] || 'samir';
const password = process.argv[3] || ('Fimo!' + crypto.randomBytes(12).toString('base64url'));
const user = createInitialAdmin(username, password);
process.stdout.write(JSON.stringify({ username: user.username, temporaryPassword: password, mustChangePassword: true }) + '\n');
