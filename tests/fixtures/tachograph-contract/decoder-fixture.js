#!/usr/bin/env node
const crypto = require('crypto');
const fs = require('fs');
const input = process.argv[process.argv.indexOf('--input') + 1];
const hash = crypto.createHash('sha256').update(fs.readFileSync(input)).digest('hex');
process.stdout.write(JSON.stringify({
  schemaVersion: 'fimocheck.tachograph.v1', sourceKind: 'driver_card', generation: 'gen2v2', sourceSha256: hash,
  signature: { status: 'not_supported' }, warnings: ['fixture synthétique de contrat'],
  activities: [{ type: 'work', start: '2026-08-18T06:00:00.000Z', end: '2026-08-18T06:15:00.000Z', provenance: { offset: 0, length: 8 } }],
}));
