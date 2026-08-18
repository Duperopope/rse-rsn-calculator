const { spawn } = require('child_process');

const PORT = 3099;
const ENDPOINTS = [
  'qa',
  'qa/cas-reels',
  'qa/limites',
  'qa/robustesse',
  'qa/avance',
  'qa/multi-semaines'
];

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function waitForServer() {
  for (let attempt = 0; attempt < 30; attempt++) {
    try {
      const response = await fetch(`http://127.0.0.1:${PORT}/api/health`);
      if (response.ok) return;
    } catch (_) {
      // Le serveur n'est pas encore pret.
    }
    await wait(200);
  }
  throw new Error('Le serveur QA ne repond pas');
}

async function main() {
  const server = spawn(process.execPath, ['server.js'], {
    cwd: require('path').join(__dirname, '..'),
    env: { ...process.env, PORT: String(PORT), NODE_ENV: 'test' },
    stdio: ['ignore', 'ignore', 'pipe']
  });

  let stderr = '';
  server.stderr.on('data', chunk => { stderr += chunk.toString(); });

  try {
    await waitForServer();
    let total = 0;
    let passed = 0;

    for (const endpoint of ENDPOINTS) {
      const response = await fetch(`http://127.0.0.1:${PORT}/api/${endpoint}`);
      if (!response.ok) throw new Error(`${endpoint}: HTTP ${response.status}`);
      const report = await response.json();
      const summary = report.resume || {};
      const endpointTotal = Number(summary.total || 0);
      const endpointPassed = Number(summary.ok || 0);
      total += endpointTotal;
      passed += endpointPassed;
      console.log(`${endpoint.padEnd(22)} ${endpointPassed}/${endpointTotal}`);
    }

    console.log(`\nQA embarquee : ${passed}/${total}`);
    if (total !== 167 || passed !== total) {
      throw new Error(`QA incomplete : ${passed}/${total}, attendu 167/167`);
    }
  } finally {
    server.kill('SIGTERM');
  }

  if (stderr.trim()) process.stderr.write(stderr);
}

main().catch(error => {
  console.error(error.message);
  process.exit(1);
});
