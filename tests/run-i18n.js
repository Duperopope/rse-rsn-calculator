const assert = require('assert');
const path = require('path');
const { pathToFileURL } = require('url');

const root = path.join(__dirname, '..');
function flatten(value, prefix = '', result = {}) {
  for (const [key, child] of Object.entries(value)) {
    const next = prefix ? `${prefix}.${key}` : key;
    if (child && typeof child === 'object' && !Array.isArray(child)) flatten(child, next, result);
    else result[next] = child;
  }
  return result;
}
function variables(message) {
  return [...String(message).matchAll(/\{([a-zA-Z0-9_]+)\}/g)].map((match) => match[1]).sort();
}

(async function run() {
  const fr = (await import(pathToFileURL(path.join(root, 'client/src/platform/i18n/catalogs/fr.js')))).default;
  const en = (await import(pathToFileURL(path.join(root, 'client/src/platform/i18n/catalogs/en.js')))).default;
  const source = flatten(fr);
  const translated = flatten(en);
  const sourceKeys = Object.keys(source).sort();
  const translatedKeys = Object.keys(translated).sort();

  assert.deepStrictEqual(translatedKeys, sourceKeys, 'les catalogues doivent contenir exactement les mêmes clés');
  for (const key of sourceKeys) {
    assert.strictEqual(typeof source[key], 'string', `${key}: texte français invalide`);
    assert.strictEqual(typeof translated[key], 'string', `${key}: texte anglais invalide`);
    assert.ok(source[key].trim(), `${key}: texte français vide`);
    assert.ok(translated[key].trim(), `${key}: texte anglais vide`);
    assert.deepStrictEqual(variables(translated[key]), variables(source[key]), `${key}: variables incompatibles`);
  }
  assert.ok(sourceKeys.length >= 30, 'le socle doit couvrir les parcours compte et connexion');
  console.log(`LOCALISATION: ${sourceKeys.length} clés FR/EN vérifiées`);
})().catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
