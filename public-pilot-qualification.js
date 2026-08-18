function header(headers, name) { return String(headers[name.toLowerCase()] || ''); }
function qualifyPublicSnapshot(snapshot) {
  const checks = [];
  const add = (name, ok, detail) => checks.push({ name, status: ok ? 'pass' : 'fail', detail });
  add('transport.https', snapshot.finalUrl?.startsWith('https://'), snapshot.finalUrl || 'URL finale absente');
  add('health.ok', snapshot.healthStatus === 200 && snapshot.health?.status === 'ok', `HTTP ${snapshot.healthStatus}`);
  add('health.version', Boolean(snapshot.health?.version), snapshot.health?.version || 'version absente');
  add('headers.hsts', /max-age=\d+/i.test(header(snapshot.headers, 'strict-transport-security')), header(snapshot.headers, 'strict-transport-security') || 'absent');
  add('headers.csp', Boolean(header(snapshot.headers, 'content-security-policy')), 'Content-Security-Policy');
  add('headers.nosniff', header(snapshot.headers, 'x-content-type-options').toLowerCase() === 'nosniff', header(snapshot.headers, 'x-content-type-options') || 'absent');
  add('headers.frame', Boolean(header(snapshot.headers, 'x-frame-options')) || /frame-ancestors/i.test(header(snapshot.headers, 'content-security-policy')), 'anti-cadrage');
  add('auth.anonymous', snapshot.authStatus === 200 && snapshot.auth?.authenticated === false, `HTTP ${snapshot.authStatus}`);
  add('data.protected', snapshot.protectedStatus === 401, `HTTP ${snapshot.protectedStatus}`);
  add('cors.untrusted', !header(snapshot.corsHeaders || {}, 'access-control-allow-origin'), header(snapshot.corsHeaders || {}, 'access-control-allow-origin') || 'origine refusée');
  return { ready: checks.every(item => item.status === 'pass'), checks };
}
module.exports = { qualifyPublicSnapshot };
