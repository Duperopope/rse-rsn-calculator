#!/usr/bin/env node
const { qualifyPublicSnapshot } = require('../public-pilot-qualification.js');

const base = new URL(process.argv[2] || '');
if (base.protocol !== 'https:') throw new Error('Une URL HTTPS publique est obligatoire.');
const fetchJson = async (pathname, options = {}) => {
  const response = await fetch(new URL(pathname, base), { ...options, redirect: 'follow', signal: AbortSignal.timeout(15_000) });
  let body = null;
  try { body = await response.json(); } catch (_) { /* corps non JSON */ }
  return { response, body };
};
(async () => {
  const health = await fetchJson('/api/health');
  const auth = await fetchJson('/api/auth/status');
  const protectedRoute = await fetchJson('/api/analyses');
  const cors = await fetchJson('/api/health', { headers: { Origin: 'https://origine-non-autorisee.invalid' } });
  const headers = Object.fromEntries(health.response.headers.entries());
  const report = qualifyPublicSnapshot({
    finalUrl: health.response.url, healthStatus: health.response.status, health: health.body, headers,
    authStatus: auth.response.status, auth: auth.body, protectedStatus: protectedRoute.response.status,
    corsHeaders: Object.fromEntries(cors.response.headers.entries()),
  });
  console.log(JSON.stringify({ ...report, target: base.origin, verifiedAt: new Date().toISOString() }, null, 2));
  if (!report.ready) process.exitCode = 1;
})().catch(error => { console.error(error.message); process.exitCode = 1; });
