/**
 * RSE-RSN Calculator - Tests automatises
 * Version: 7.6.10.1
 * 
 * Envoie le CSV en JSON via POST { csv: "..." } sur /api/analyze
 * et verifie les resultats contre le snapshot de reference.
 * 
 * Usage: node tests/run-tests.js
 * Exit code: 0 = OK, 1 = echec
 */

var http = require('http');
var fs = require('fs');
var path = require('path');

// ============================================================
// CONFIGURATION
// ============================================================
var CONFIG = {
  serverFile: path.join(__dirname, '..', 'server.js'),
  csvFile: path.join(__dirname, 'fixtures', 'test_56jours.csv'),
  referenceFile: path.join(__dirname, 'fixtures', 'reference_v76101.json'),
  port: 3098,
  startupDelay: 4000,
  requestTimeout: 30000
};

// ============================================================
// COMPTEURS
// ============================================================
var serverProcess = null;
var testsPassed = 0;
var testsFailed = 0;
var testsTotal = 0;

function log(msg) {
  console.log('[TEST] ' + msg);
}

function pass(name) {
  testsTotal++;
  testsPassed++;
  console.log('  \x1b[32mOK\x1b[0m    ' + name);
}

function fail(name, expected, got) {
  testsTotal++;
  testsFailed++;
  console.log('  \x1b[31mFAIL\x1b[0m  ' + name);
  console.log('        Attendu: ' + JSON.stringify(expected));
  console.log('        Obtenu:  ' + JSON.stringify(got));
}

function assertEqual(name, actual, expected) {
  if (actual === expected) {
    pass(name);
  } else {
    fail(name, expected, actual);
  }
}

function assertRange(name, actual, min, max) {
  if (typeof actual === 'number' && actual >= min && actual <= max) {
    pass(name + ' = ' + actual + ' [' + min + '-' + max + ']');
  } else {
    fail(name, min + '-' + max, actual);
  }
}

function assertExists(name, obj, key) {
  if (obj && obj[key] !== undefined && obj[key] !== null) {
    pass(name);
  } else {
    fail(name, 'exists', 'undefined/null');
  }
}

function assertType(name, value, expectedType) {
  var actualType = Array.isArray(value) ? 'array' : typeof value;
  if (actualType === expectedType) {
    pass(name + ' (' + expectedType + ')');
  } else {
    fail(name, expectedType, actualType);
  }
}

// ============================================================
// SERVEUR
// ============================================================
function startServer() {
  return new Promise(function(resolve, reject) {
    log('Demarrage serveur sur port ' + CONFIG.port + '...');
    
    var env = {};
    var keys = Object.keys(process.env);
    for (var i = 0; i < keys.length; i++) {
      env[keys[i]] = process.env[keys[i]];
    }
    env.PORT = String(CONFIG.port);
    env.NODE_ENV = 'test';
    
    var spawn = require('child_process').spawn;
    serverProcess = spawn('node', [CONFIG.serverFile], {
      env: env,
      stdio: ['pipe', 'pipe', 'pipe']
    });
    
    serverProcess.stderr.on('data', function(data) {
      var msg = data.toString().trim();
      if (msg.length > 0 && msg.indexOf('ExperimentalWarning') === -1) {
        log('STDERR: ' + msg);
      }
    });
    
    serverProcess.on('error', function(err) {
      reject(new Error('Impossible de demarrer: ' + err.message));
    });
    
    // Attendre que le serveur soit pret
    setTimeout(function() {
      resolve();
    }, CONFIG.startupDelay);
  });
}

function stopServer() {
  if (serverProcess) {
    try { serverProcess.kill('SIGTERM'); } catch (e) { /* ignore */ }
    serverProcess = null;
  }
}

// ============================================================
// HTTP
// ============================================================
function httpGet(urlPath) {
  return new Promise(function(resolve, reject) {
    var req = http.request({
      hostname: 'localhost',
      port: CONFIG.port,
      path: urlPath,
      method: 'GET',
      timeout: CONFIG.requestTimeout
    }, function(res) {
      var body = '';
      res.on('data', function(chunk) { body += chunk; });
      res.on('end', function() {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });
    req.on('error', reject);
    req.on('timeout', function() { req.destroy(); reject(new Error('Timeout GET')); });
    req.end();
  });
}

function httpPostJSON(urlPath, jsonBody) {
  return new Promise(function(resolve, reject) {
    var bodyStr = JSON.stringify(jsonBody);
    
    var req = http.request({
      hostname: 'localhost',
      port: CONFIG.port,
      path: urlPath,
      method: 'POST',
      timeout: CONFIG.requestTimeout,
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(bodyStr)
      }
    }, function(res) {
      var responseBody = '';
      res.on('data', function(chunk) { responseBody += chunk; });
      res.on('end', function() {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(responseBody) });
        } catch (e) {
          resolve({ status: res.statusCode, data: responseBody });
        }
      });
    });
    req.on('error', reject);
    req.on('timeout', function() { req.destroy(); reject(new Error('Timeout POST')); });
    req.write(bodyStr);
    req.end();
  });
}

// ============================================================
// SUITES DE TESTS
// ============================================================
function testHealth(healthData) {
  log('--- HEALTH ENDPOINT ---');
  assertExists('health.status', healthData, 'status');
  assertEqual('health.status = ok', healthData.status, 'ok');
  assertExists('health.version', healthData, 'version');
  assertExists('health.auteur', healthData, 'auteur');
}

function testStructure(data) {
  log('--- STRUCTURE REPONSE ---');
  assertExists('infractions', data, 'infractions');
  assertType('infractions', data.infractions, 'array');
  assertExists('score', data, 'score');
  assertType('score', data.score, 'number');
  assertExists('amende_estimee', data, 'amende_estimee');
  assertExists('details_jours', data, 'details_jours');
  assertType('details_jours', data.details_jours, 'array');
  assertExists('statistiques', data, 'statistiques');
  assertExists('_fix_engine', data, '_fix_engine');
}

function testResultats(data, reference) {
  log('--- RESULTATS vs REFERENCE ---');
  var ref = reference.criteres;
  
  var nbInfr = data.infractions ? data.infractions.length : 0;
  assertEqual('Infractions exactes = ' + ref.infractions_exact, nbInfr, ref.infractions_exact);
  assertRange('Infractions cible', nbInfr, ref.infractions_min, ref.infractions_max);
  
  // Recuperer l'amende (peut etre dans amende_estimee ou _fix_engine.amendes)
  var amende = 0;
  if (typeof data.amende_estimee === 'number') {
    amende = data.amende_estimee;
  }
  if (data._fix_engine && data._fix_engine.amendes) {
    var feAmende = data._fix_engine.amendes.majoree || data._fix_engine.amendes.forfaitaire || 0;
    if (feAmende > amende) { amende = feAmende; }
  }
  
  assertEqual('Amende exacte = ' + ref.amende_exact, amende, ref.amende_exact);
  assertRange('Amende cible', amende, ref.amende_min, ref.amende_max);
  
  assertEqual('Score exact = ' + ref.score_exact, data.score, ref.score_exact);
  assertRange('Score cible', data.score, ref.score_min, ref.score_max);
}

function testCategories(data, reference) {
  log('--- CATEGORIES INFRACTIONS ---');
  var expected = reference.categories_attendues;
  
  // Compter les infractions par categorie
  var counts = {};
  if (data.infractions) {
    data.infractions.forEach(function(infr) {
      var regle = (infr.regle || infr.description || '').toLowerCase();
      var cat = 'Autre: ' + (infr.regle || 'inconnu');
      
      if (regle.indexOf('amplitude') !== -1) {
        cat = 'Amplitude journaliere';
      } else if (regle.indexOf('bi-hebdo') !== -1 || regle.indexOf('bi_hebdo') !== -1 || regle.indexOf('bihebdo') !== -1) {
        cat = 'Conduite bi-hebdomadaire';
      } else if (regle.indexOf('hebdomadaire') !== -1 && regle.indexOf('bi') === -1 && regle.indexOf('repos') === -1) {
        cat = 'Conduite hebdomadaire';
      } else if (regle.indexOf('journali') !== -1 && regle.indexOf('repos') === -1) {
        cat = 'Conduite journaliere';
      } else if (regle.indexOf('repos') !== -1) {
        cat = 'Repos journalier insuffisant';
      }
      
      counts[cat] = (counts[cat] || 0) + 1;
    });
  }
  
  // Verifier chaque categorie attendue
  var expectedKeys = Object.keys(expected);
  for (var i = 0; i < expectedKeys.length; i++) {
    var cat = expectedKeys[i];
    var actual = counts[cat] || 0;
    assertEqual('Cat "' + cat + '" = ' + expected[cat], actual, expected[cat]);
  }
  
  // Verifier pas de categories inattendues
  var countKeys = Object.keys(counts);
  for (var j = 0; j < countKeys.length; j++) {
    if (countKeys[j].indexOf('Autre') !== -1) {
      fail('Categorie inattendue "' + countKeys[j] + '"', 0, counts[countKeys[j]]);
    }
  }
}

function testFixEngine(data, reference) {
  log('--- FIX-ENGINE ---');
  var fe = data._fix_engine;
  var ref = reference.fix_engine;
  
  if (!fe) {
    fail('Fix-engine present', 'object', 'undefined');
    return;
  }
  
  assertExists('fix_engine.version', fe, 'version');
  
  var originales = fe.originales || fe.stats_originales || 0;
  assertRange('fix_engine.originales', originales, ref.originales_min, ref.originales_max);
  
  var retirees = fe.retirees || fe.stats_retirees || 0;
  if (retirees >= ref.retirees_min) {
    pass('fix_engine.retirees >= ' + ref.retirees_min + ' (actual: ' + retirees + ')');
  } else {
    fail('fix_engine.retirees', '>= ' + ref.retirees_min, retirees);
  }
}

function testCoherence(data) {
  log('--- COHERENCE INTERNE ---');
  
  // Score entre 0 et 100
  assertRange('Score [0-100]', data.score, 0, 100);
  
  // Amende non negative
  var amende = data.amende_estimee || 0;
  if (amende >= 0) {
    pass('Amende >= 0');
  } else {
    fail('Amende >= 0', '>= 0', amende);
  }
  
  // Chaque infraction a une regle
  var sansRegle = 0;
  var sansClasse = 0;
  if (data.infractions) {
    for (var i = 0; i < data.infractions.length; i++) {
      if (!data.infractions[i].regle && !data.infractions[i].description) sansRegle++;
      if (!data.infractions[i].classe) sansClasse++;
    }
  }
  assertEqual('Infractions sans regle', sansRegle, 0);
  assertEqual('Infractions sans classe', sansClasse, 0);
  
  // Nombre de jours
  if (data.details_jours) {
    assertEqual('Jours analyses = 56', data.details_jours.length, 56);
    
    var joursNegatifs = 0;
    for (var j = 0; j < data.details_jours.length; j++) {
      var jour = data.details_jours[j];
      if ((jour.conduite_h || 0) < 0 || (jour.travail_h || 0) < 0) joursNegatifs++;
    }
    assertEqual('Jours avec valeurs negatives', joursNegatifs, 0);
  }
  
  // Fix-engine coherence
  if (data._fix_engine) {
    var fe = data._fix_engine;
    var finales = fe.finales || 0;
    var nbInfr = data.infractions ? data.infractions.length : 0;
    assertEqual('fix_engine.finales == infractions.length', finales, nbInfr);
  }
}

// ============================================================
// MAIN
// ============================================================
async function main() {
  console.log('');
  console.log('============================================================');
  console.log(' RSE-RSN Calculator - Tests automatises');
  console.log(' Reference: v7.6.10.1 | Fixture: test_56jours.csv');
  console.log('============================================================');
  console.log('');
  
  // Verifier fichiers
  if (!fs.existsSync(CONFIG.csvFile)) {
    log('ERREUR: Fixture CSV introuvable: ' + CONFIG.csvFile);
    process.exit(1);
  }
  if (!fs.existsSync(CONFIG.referenceFile)) {
    log('ERREUR: Reference introuvable: ' + CONFIG.referenceFile);
    process.exit(1);
  }
  
  var reference = JSON.parse(fs.readFileSync(CONFIG.referenceFile, 'utf8'));
  var csvContent = fs.readFileSync(CONFIG.csvFile, 'utf8');
  
  try {
    await startServer();
    log('Serveur demarre sur port ' + CONFIG.port);
    
    // ---- HEALTH ----
    var healthResp = await httpGet('/api/health');
    assertEqual('GET /api/health -> 200', healthResp.status, 200);
    testHealth(healthResp.data);
    
    // ---- ANALYZE (POST JSON) ----
    log('POST /api/analyze avec CSV (' + csvContent.split('\n').length + ' lignes)...');
    var analyzeResp = await httpPostJSON('/api/analyze', {
      csv: csvContent,
      typeService: 'STANDARD',
      pays: 'FR',
      equipage: 'solo'
    });
    
    assertEqual('POST /api/analyze -> 200', analyzeResp.status, 200);
    
    if (analyzeResp.status !== 200) {
      log('Reponse serveur: ' + JSON.stringify(analyzeResp.data));
      throw new Error('API a retourne HTTP ' + analyzeResp.status);
    }
    
    var data = analyzeResp.data;
    
    // ---- STRUCTURE ----
    testStructure(data);
    
    // ---- RESULTATS ----
    testResultats(data, reference);
    
    // ---- CATEGORIES ----
    testCategories(data, reference);
    
    // ---- FIX-ENGINE ----
    testFixEngine(data, reference);
    
    // ---- COHERENCE ----
    testCoherence(data);
    
  } catch (err) {
    log('ERREUR FATALE: ' + err.message);
    if (err.stack) { log(err.stack); }
    testsFailed++;
  } finally {
    stopServer();
  }
  
  // ---- RESUME ----
  console.log('');
  console.log('============================================================');
  if (testsFailed === 0) {
    console.log(' \x1b[32m TOUS LES TESTS PASSENT: ' + testsPassed + '/' + testsTotal + ' \x1b[0m');
  } else {
    console.log(' \x1b[31m ECHECS: ' + testsFailed + '/' + testsTotal + ' \x1b[0m');
    console.log(' \x1b[31m ' + testsPassed + ' reussis, ' + testsFailed + ' echoues \x1b[0m');
  }
  console.log('============================================================');
  console.log('');
  
  process.exit(testsFailed > 0 ? 1 : 0);
}

main();
