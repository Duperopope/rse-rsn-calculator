const assert = require('assert');
const { qualifyPublicSnapshot } = require('../public-pilot-qualification.js');
const valid = { finalUrl: 'https://pilot.example/api/health', healthStatus: 200, health: { status: 'ok', version: '1.0.0' },
  headers: { 'strict-transport-security': 'max-age=31536000', 'content-security-policy': "default-src 'self'; frame-ancestors 'none'", 'x-content-type-options': 'nosniff' },
  authStatus: 200, auth: { authenticated: false }, protectedStatus: 401, corsHeaders: {} };
assert.strictEqual(qualifyPublicSnapshot(valid).ready, true);
assert.strictEqual(qualifyPublicSnapshot({ ...valid, finalUrl: 'http://pilot.example/api/health' }).ready, false);
assert.strictEqual(qualifyPublicSnapshot({ ...valid, protectedStatus: 200 }).ready, false);
assert.strictEqual(qualifyPublicSnapshot({ ...valid, corsHeaders: { 'access-control-allow-origin': '*' } }).ready, false);
assert.strictEqual(qualifyPublicSnapshot({ ...valid, headers: {} }).ready, false);
console.log('QUALIFICATION PILOTE PUBLIC: 5/5');
