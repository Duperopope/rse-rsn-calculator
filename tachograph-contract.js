const SOURCE_KINDS = new Set(['driver_card', 'vehicle_unit']);
const GENERATIONS = new Set(['gen1', 'gen2v1', 'gen2v2']);
const ACTIVITY_TYPES = new Set(['driving', 'work', 'availability', 'break_rest', 'unknown']);
const SIGNATURE_STATES = new Set(['verified', 'failed', 'not_present', 'not_supported']);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
function iso(value, field) {
  assert(typeof value === 'string' && !Number.isNaN(Date.parse(value)), `${field} doit être une date ISO valide.`);
  return new Date(value).toISOString();
}
function validateDecodedTachograph(input) {
  assert(input && typeof input === 'object' && !Array.isArray(input), 'Sortie décodeur absente.');
  assert(input.schemaVersion === 'fimocheck.tachograph.v1', 'Version de contrat non prise en charge.');
  assert(SOURCE_KINDS.has(input.sourceKind), 'Source tachygraphe non reconnue.');
  assert(GENERATIONS.has(input.generation), 'Génération tachygraphe non reconnue.');
  assert(/^[a-f0-9]{64}$/.test(input.sourceSha256 || ''), 'Empreinte source SHA-256 invalide.');
  assert(input.signature && SIGNATURE_STATES.has(input.signature.status), 'État de signature explicite requis.');
  assert(Array.isArray(input.activities), 'Liste d’activités requise.');
  let previousEnd = null;
  const activities = input.activities.map((activity, index) => {
    assert(activity && typeof activity === 'object', `Activité ${index} invalide.`);
    assert(ACTIVITY_TYPES.has(activity.type), `Type d’activité ${index} invalide.`);
    const start = iso(activity.start, `activities[${index}].start`);
    const end = iso(activity.end, `activities[${index}].end`);
    assert(Date.parse(end) > Date.parse(start), `Activité ${index} de durée nulle ou négative.`);
    assert(!previousEnd || Date.parse(start) >= Date.parse(previousEnd), `Activités non ordonnées ou superposées à l’index ${index}.`);
    previousEnd = end;
    assert(activity.provenance && Number.isInteger(activity.provenance.offset) && activity.provenance.offset >= 0, `Provenance binaire absente à l’index ${index}.`);
    assert(Number.isInteger(activity.provenance.length) && activity.provenance.length > 0, `Longueur de provenance invalide à l’index ${index}.`);
    return { type: activity.type, start, end, provenance: { offset: activity.provenance.offset, length: activity.provenance.length } };
  });
  return {
    schemaVersion: input.schemaVersion,
    sourceKind: input.sourceKind,
    generation: input.generation,
    sourceSha256: input.sourceSha256,
    signature: { status: input.signature.status, ...(input.signature.algorithm ? { algorithm: String(input.signature.algorithm) } : {}) },
    activities,
    warnings: Array.isArray(input.warnings) ? input.warnings.map(String) : [],
  };
}
function eligibleForRegulatoryCalculation(decoded) {
  const validated = validateDecodedTachograph(decoded);
  return validated.signature.status === 'verified' && validated.activities.every(item => item.type !== 'unknown');
}

module.exports = { validateDecodedTachograph, eligibleForRegulatoryCalculation };
