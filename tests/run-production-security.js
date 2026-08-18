const assert = require('assert');
const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn, spawnSync } = require('child_process');

const root = path.join(__dirname, '..');
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'fimocheck-production-security-'));
const port = 3198;
const allowedOrigin = 'https://pilot.fimocheck.example';
const password = 'ProductionTest!Phrase-12345';
const env = {
  ...process.env, NODE_ENV: 'production', PORT: String(port), FIMO_DATA_DIR: temp,
  FIMO_UPLOAD_DIR: path.join(temp, 'uploads'), FIMO_DATA_KEY: crypto.randomBytes(32).toString('base64'),
  FIMO_BACKUP_KEY: crypto.randomBytes(32).toString('base64'), FIMO_ALLOWED_ORIGINS: allowedOrigin
};
let server;
async function wait() { for (let i=0;i<50;i+=1) { try { if ((await fetch(`http://127.0.0.1:${port}/api/health`)).ok) return; } catch (_) {} await new Promise(r=>setTimeout(r,100)); } throw new Error('serveur production indisponible'); }

(async function() {
  try {
    const bootstrap=spawnSync(process.execPath,['tools/create-admin.js','production-owner',password],{cwd:root,env,encoding:'utf8'});
    assert.strictEqual(bootstrap.status,0,bootstrap.stderr);
    server=spawn(process.execPath,['server.js'],{cwd:root,env,stdio:'ignore'}); await wait();
    let response=await fetch(`http://127.0.0.1:${port}/api/analyze`,{method:'POST',headers:{'Content-Type':'application/json',Origin:allowedOrigin},body:JSON.stringify({csv:'x'})});
    assert.strictEqual(response.status,401,'calcul protégé en production');
    response=await fetch(`http://127.0.0.1:${port}/api/auth/login`,{method:'POST',headers:{'Content-Type':'application/json',Origin:allowedOrigin},body:JSON.stringify({username:'production-owner',password})});
    assert.strictEqual(response.status,200,'connexion depuis origine autorisée');
    const cookie=response.headers.get('set-cookie')||'';
    assert.ok(cookie.startsWith('__Host-fimo_session='),'préfixe __Host-');
    assert.ok(/; Secure/i.test(cookie),'attribut Secure');
    assert.ok(/; HttpOnly/i.test(cookie),'attribut HttpOnly');
    assert.ok(/SameSite=Strict/i.test(cookie),'SameSite strict');
    assert.ok(/Priority=High/i.test(cookie),'priorité haute');
    response=await fetch(`http://127.0.0.1:${port}/api/auth/status`,{headers:{Origin:'https://hostile.example'}});
    assert.strictEqual(response.status,403,'origine étrangère refusée');
    console.log('CONFIGURATION PRODUCTION: 7/7');
  } finally { if(server)server.kill('SIGTERM'); fs.rmSync(temp,{recursive:true,force:true}); }
})().catch(error=>{console.error(error.stack||error.message);process.exitCode=1;});
