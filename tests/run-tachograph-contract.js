const assert = require('assert');
const { validateDecodedTachograph, eligibleForRegulatoryCalculation } = require('../tachograph-contract.js');

const base = {
  schemaVersion: 'fimocheck.tachograph.v1', sourceKind: 'driver_card', generation: 'gen2v2',
  sourceSha256: 'a'.repeat(64), signature: { status: 'verified', algorithm: 'ECDSA-P256-SHA256' }, warnings: [],
  activities: [
    { type: 'work', start: '2026-08-18T06:00:00Z', end: '2026-08-18T06:15:00Z', provenance: { offset: 120, length: 8 } },
    { type: 'driving', start: '2026-08-18T06:15:00Z', end: '2026-08-18T10:45:00Z', provenance: { offset: 128, length: 16 } },
  ],
};
assert.strictEqual(validateDecodedTachograph(base).activities.length, 2, 'contrat valide accepté');
assert.strictEqual(eligibleForRegulatoryCalculation(base), true, 'signature vérifiée et activités connues éligibles');
assert.strictEqual(eligibleForRegulatoryCalculation({ ...base, signature: { status: 'not_supported' } }), false, 'signature non vérifiée non éligible');
assert.strictEqual(eligibleForRegulatoryCalculation({ ...base, activities: [{ ...base.activities[0], type: 'unknown' }] }), false, 'activité inconnue non éligible');
for (const mutation of [
  { ...base, schemaVersion: 'v2-inventée' },
  { ...base, sourceSha256: 'court' },
  { ...base, signature: {} },
  { ...base, activities: [{ ...base.activities[0], end: base.activities[0].start }] },
  { ...base, activities: [base.activities[1], base.activities[0]] },
  { ...base, activities: [{ ...base.activities[0], provenance: null }] },
]) assert.throws(() => validateDecodedTachograph(mutation));
console.log('CONTRAT TACHYGRAPHE: 10/10');
