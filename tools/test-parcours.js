var puppeteer = require("puppeteer-core");
function sleep(ms) { return new Promise(function(r) { setTimeout(r, ms); }); }

(async function() {
  var erreurs = [];
  var ok = [];
  var browser;
  try {
    browser = await puppeteer.launch({
      executablePath: process.env.PREFIX + "/lib/chromium/chromium-launcher.sh",
      headless: true,
      args: ["--no-sandbox", "--disable-gpu", "--disable-setuid-sandbox", "--single-process"]
    });
    var page = await browser.newPage();
    await page.setViewport({ width: 375, height: 812, isMobile: true });

    // === PARCOURS 1 : Chargement ===
    console.log("[1/5] Chargement...");
    await page.goto("http://localhost:3001", { timeout: 20000, waitUntil: "networkidle2" });
    await sleep(3000);
    var hasHeader = await page.evaluate(function() { return !!document.querySelector("[data-tour='header']"); });
    if (hasHeader) { ok.push("Chargement OK"); } else { erreurs.push("Header absent au chargement"); }

    // Fermer tour
    await page.evaluate(function() { var b = Array.from(document.querySelectorAll("button")).find(function(x) { return x.textContent.includes("Passer"); }); if (b) b.click(); });
    await sleep(1000);

    // === PARCOURS 2 : Saisie template ===
    console.log("[2/5] Saisie...");
    await page.evaluate(function() { var b = Array.from(document.querySelectorAll("button")).find(function(x) { return x.textContent.includes("longue"); }); if (b) b.click(); });
    await sleep(1000);
    var nbActivites = await page.evaluate(function() { return document.querySelectorAll("[id^='activite-']").length; });
    if (nbActivites >= 3) { ok.push("Saisie template OK (" + nbActivites + " activites)"); } else { erreurs.push("Template charge " + nbActivites + " activites (attendu >= 3)"); }

    // === PARCOURS 3 : Analyse ===
    console.log("[3/5] Analyse...");
    await page.evaluate(function() { var b = Array.from(document.querySelectorAll("button")).find(function(x) { return x.textContent.toLowerCase().includes("analyser"); }); if (b) b.click(); });
    await sleep(4000);
    var hasScore = await page.evaluate(function() {
      var els = document.querySelectorAll("*");
      for (var i = 0; i < els.length; i++) {
        var t = els[i].textContent;
        if (t && t.match && t.match(/Score FIMO/)) return true;
      }
      return false;
    });
    if (hasScore) { ok.push("Analyse OK — score affiche"); } else { erreurs.push("Score non affiche apres analyse"); }

    // === PARCOURS 4 : Resultats ===
    console.log("[4/5] Resultats...");
    await page.evaluate(function() {
      var tabs = Array.from(document.querySelectorAll("button,[role='tab']"));
      var res = tabs.find(function(t) { return t.textContent.toLowerCase().includes("result"); });
      if (res) res.click();
    });
    await sleep(1500);
    var hasResultPanel = await page.evaluate(function() {
      return !!document.querySelector("[class*='ResultPanel'], [class*='resultPanel'], [class*='result']");
    });
    if (hasResultPanel) { ok.push("Resultats affiches"); } else { erreurs.push("Panel resultats absent"); }

    // === PARCOURS 5 : PDF ===
    console.log("[5/5] PDF...");
    var hasPdfBtn = await page.evaluate(function() {
      var btns = Array.from(document.querySelectorAll("button"));
      return btns.some(function(b) { return b.textContent.toLowerCase().includes("pdf") || b.textContent.toLowerCase().includes("telecharger"); });
    });
    if (hasPdfBtn) { ok.push("Bouton PDF present"); } else { erreurs.push("Bouton PDF absent"); }

    // Screenshots
    var fsNode = require("fs");
    var dir = process.env.HOME + "/fimo-screenshots";
    if (!fsNode.existsSync(dir)) fsNode.mkdirSync(dir, { recursive: true });
    await page.screenshot({ path: dir + "/parcours-test.png", fullPage: true });
    ok.push("Screenshot sauvegarde");

  } catch(e) {
    erreurs.push("Erreur fatale: " + e.message.substring(0, 100));
  }
  if (browser) await browser.close();

  console.log("\n=== RESULTAT PARCOURS ===");
  console.log("OK: " + ok.length);
  ok.forEach(function(o) { console.log("  ✓ " + o); });
  if (erreurs.length) {
    console.log("ERREURS: " + erreurs.length);
    erreurs.forEach(function(e) { console.log("  ✗ " + e); });
  } else {
    console.log("\n✅ TOUS LES PARCOURS OK");
  }
})();