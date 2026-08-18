const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const iconSource = fs.readFileSync(path.join(root, 'client/src/platform/assets/Icon.jsx'), 'utf8');
const names = [...iconSource.matchAll(/^  ([a-zA-Z][a-zA-Z0-9]+):/gm)].map(match => match[1]);
assert.ok(names.length >= 10, 'registre commun suffisamment structuré');
assert.strictEqual(new Set(names).size, names.length, 'aucun nom d’icône dupliqué');
assert.ok(iconSource.includes("throw new Error(`Icône inconnue"), 'nom inconnu refusé explicitement');
assert.ok(iconSource.includes("aria-hidden={title ? undefined : 'true'}"), 'icônes décoratives masquées aux lecteurs d’écran');
assert.ok(iconSource.includes("<title>{title}</title>"), 'icônes informatives nommables');

const migrated = [
  'client/src/components/auth/AccountMenu.jsx',
  'client/src/components/forms/TachographImportPanel.jsx',
  'client/src/components/gauges/JaugeLineaire.jsx',
];
for (const relative of migrated) {
  const source = fs.readFileSync(path.join(root, relative), 'utf8');
  assert.ok(source.includes("platform/assets/Icon.jsx"), `${relative}: registre utilisé`);
  assert.strictEqual(/[⚠⏱✅💡]/u.test(source), false, `${relative}: aucun emoji fonctionnel dépendant du système`);
}

for (const file of ['favicon.svg', 'icon-192.svg', 'icon-512.svg']) {
  const source = fs.readFileSync(path.join(root, 'client/public', file), 'utf8');
  assert.ok(/viewBox=/i.test(source), `${file}: viewBox responsive`);
  assert.strictEqual(/<script|\b(?:xlink:)?href\s*=\s*["']https?:/i.test(source), false, `${file}: autonome et sans script`);
}

console.log(`ASSETS: ${names.length} icônes communes, 3 parcours migrés, 3 SVG publics contrôlés`);
