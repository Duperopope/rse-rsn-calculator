var http = require("http");
var { execSync } = require("child_process");

console.log("=== PRE-DEPLOIEMENT FIMO Check ===\n");
var erreurs = [];
var ok = [];

// 1. Build client
console.log("[1/5] Build client...");
try {
  var buildOut = execSync("cd client && npm run build 2>&1", { encoding: "utf8", timeout: 60000 });
  if (buildOut.indexOf("built in") !== -1) {
    ok.push("Build client OK");
    console.log("  ✓ Build OK");
  } else {
    erreurs.push("Build client: sortie inattendue");
    console.log("  ✗ Sortie inattendue");
  }
} catch(e) {
  erreurs.push("Build client ECHOUE: " + e.message.substring(0, 100));
  console.log("  ✗ ECHEC");
}

// 2. Syntaxe server.js
console.log("[2/5] Syntaxe serveur...");
try {
  execSync("node --check server.js 2>&1", { encoding: "utf8" });
  ok.push("Syntaxe server.js OK");
  console.log("  ✓ server.js OK");
} catch(e) {
  erreurs.push("Syntaxe server.js ECHOUE");
  console.log("  ✗ ECHEC");
}
try {
  execSync("node --check fix-engine.js 2>&1", { encoding: "utf8" });
  ok.push("Syntaxe fix-engine.js OK");
  console.log("  ✓ fix-engine.js OK");
} catch(e) {
  erreurs.push("Syntaxe fix-engine.js ECHOUE");
  console.log("  ✗ ECHEC");
}

// 3. Health check
console.log("[3/5] Health check API...");
function healthCheck() {
  return new Promise(function(resolve) {
    var req = http.get("http://localhost:3001/api/health", function(res) {
      var data = "";
      res.on("data", function(c) { data += c; });
      res.on("end", function() {
        try {
          var j = JSON.parse(data);
          if (j.status === "ok") {
            ok.push("Health check OK (v" + j.version + ")");
            console.log("  ✓ API OK — v" + j.version);
          } else {
            erreurs.push("Health check: status != ok");
            console.log("  ✗ Status != ok");
          }
        } catch(e) {
          erreurs.push("Health check: reponse invalide");
          console.log("  ✗ Reponse invalide");
        }
        resolve();
      });
    });
    req.on("error", function() {
      erreurs.push("Health check: serveur inaccessible (demarrer avec node server.js)");
      console.log("  ✗ Serveur inaccessible");
      resolve();
    });
    req.setTimeout(5000, function() { req.destroy(); });
  });
}

// 4. Test API analyze
console.log("[4/5] Test API analyze...");
function testAnalyze() {
  return new Promise(function(resolve) {
    var body = JSON.stringify({
      csv: "2026-02-10;06:00;06:15;T\n2026-02-10;06:15;10:45;C\n2026-02-10;10:45;11:30;P\n2026-02-10;11:30;16:00;C\n2026-02-10;16:00;16:15;T",
      typeService: "SLO", pays: "FR", equipage: "solo"
    });
    var req = http.request({
      hostname: "localhost", port: 3001, path: "/api/analyze",
      method: "POST", headers: { "Content-Type": "application/json" }
    }, function(res) {
      var data = "";
      res.on("data", function(c) { data += c; });
      res.on("end", function() {
        try {
          var r = JSON.parse(data);
          if (r.score !== undefined && r.details_jours) {
            ok.push("API analyze OK (score " + r.score + ", " + r.details_jours.length + " jours)");
            console.log("  ✓ Analyze OK — score " + r.score);
          } else {
            erreurs.push("API analyze: reponse incomplete");
            console.log("  ✗ Reponse incomplete");
          }
        } catch(e) {
          erreurs.push("API analyze: JSON invalide");
          console.log("  ✗ JSON invalide");
        }
        resolve();
      });
    });
    req.on("error", function() {
      erreurs.push("API analyze: serveur inaccessible");
      console.log("  ✗ Serveur inaccessible");
      resolve();
    });
    req.write(body);
    req.end();
  });
}

// 5. Git status
console.log("[5/5] Git status...");
try {
  var gitStatus = execSync("git status --short 2>&1", { encoding: "utf8" });
  var nbModified = gitStatus.split("\n").filter(function(l) { return l.trim(); }).length;
  if (nbModified > 0) {
    console.log("  ℹ " + nbModified + " fichier(s) modifie(s) non commite(s)");
  } else {
    ok.push("Git propre");
    console.log("  ✓ Git propre");
  }
} catch(e) {}

// Execution
healthCheck().then(testAnalyze).then(function() {
  console.log("\n=== RESULTAT ===");
  console.log("✓ OK: " + ok.length);
  ok.forEach(function(o) { console.log("  ✓ " + o); });
  if (erreurs.length > 0) {
    console.log("✗ ERREURS: " + erreurs.length);
    erreurs.forEach(function(e) { console.log("  ✗ " + e); });
    console.log("\n⛔ NE PAS DEPLOYER — corriger les erreurs d abord");
  } else {
    console.log("\n✅ PRET POUR DEPLOIEMENT");
  }
});