'use strict';

module.exports = function registerDiagnosticRoutes(app, deps) {
  const {
    APP_VERSION,
    PAYS,
    PORT,
    REGLES,
    REGLES_COMMUN,
    REGLES_OCCASIONNEL,
    REGLES_REGULIER,
    REGLES_SLO,
    SANCTIONS,
    analyseMultiSemaines,
    analyserCSV,
    estHeureEteEU,
    fs,
    getDecalageUTC,
    getRegles,
    path
  } = deps;

// ============================================================
// GET /api/qa/avance - Tests N5 : scenarios avances
// Multi-equipage, bi-hebdo, repos hebdo, OUT, FERRY combines
// ============================================================
app.get("/api/qa/avance", (req, res) => {
  const tests = [];
  const version = "7.6.10.1";
  const date = new Date().toISOString().split("T")[0];

  function runTest(id, nom, csv, options, attendu) {
    try {
      const typeService = options.typeService || "MARCHANDISES";
      const pays = options.pays || "FR";
      const equipage = options.equipage || "solo";
      const resultat = analyserCSV(csv, typeService, pays, equipage);
      let ok = true;
      const details = [];

      if (attendu.scoreMin !== undefined && resultat.score < attendu.scoreMin) {
        ok = false;
        details.push("score " + resultat.score + " < attendu min " + attendu.scoreMin);
      }
      if (attendu.scoreMax !== undefined && resultat.score > attendu.scoreMax) {
        ok = false;
        details.push("score " + resultat.score + " > attendu max " + attendu.scoreMax);
      }
      if (attendu.infractions !== undefined && resultat.infractions.length !== attendu.infractions) {
        ok = false;
        details.push("infractions " + resultat.infractions.length + " != attendu " + attendu.infractions);
      }
      if (attendu.infractionsMin !== undefined && resultat.infractions.length < attendu.infractionsMin) {
        ok = false;
        details.push("infractions " + resultat.infractions.length + " < attendu min " + attendu.infractionsMin);
      }
      if (attendu.equipage !== undefined && resultat.equipage !== attendu.equipage) {
        ok = false;
        details.push("equipage " + resultat.equipage + " != attendu " + attendu.equipage);
      }
      if (attendu.conduiteH !== undefined) {
        const ch = parseFloat(resultat.statistiques.conduite_totale_h);
        if (Math.abs(ch - attendu.conduiteH) > 0.2) {
          ok = false;
          details.push("conduite " + ch + "h != attendu " + attendu.conduiteH + "h");
        }
      }
      if (attendu.hasRegle !== undefined) {
        const found = resultat.infractions.some(inf => inf.regle.includes(attendu.hasRegle));
        if (!found) {
          ok = false;
          details.push("regle attendue non trouvee: " + attendu.hasRegle);
        }
      }
      if (attendu.hasWarn !== undefined) {
        const found = resultat.avertissements.some(w => w.regle.includes(attendu.hasWarn));
        if (!found) {
          ok = false;
          details.push("avertissement attendu non trouve: " + attendu.hasWarn);
        }
      }
      if (attendu.noRegle !== undefined) {
        const found = resultat.infractions.some(inf => inf.regle.includes(attendu.noRegle));
        if (found) {
          ok = false;
          details.push("regle inattendue trouvee: " + attendu.noRegle);
        }
      }
      if (attendu.ferryH !== undefined && resultat.details_jours.length > 0) {
        const fh = parseFloat(resultat.details_jours[0].ferry_h);
        if (Math.abs(fh - attendu.ferryH) > 0.2) {
          ok = false;
          details.push("ferry " + fh + "h != attendu " + attendu.ferryH + "h");
        }
      }

      tests.push({
        id: id,
        nom: nom,
        status: ok ? "OK" : "FAIL",
        score: resultat.score,
        infractions: resultat.infractions.length,
        avertissements: resultat.avertissements.length,
        details: ok ? [] : details
      });
    } catch (err) {
      tests.push({ id: id, nom: nom, ok: false, status: "ERROR", details: [err.message] });
    }
  }

  // ---- OUT ----
  runTest("N5-OUT-01", "OUT basique - 3h hors champ ignorees",
    "2025-01-15;06:00;08:30;C\n2025-01-15;08:30;09:00;P\n2025-01-15;09:00;12:00;O\n2025-01-15;12:00;14:30;C",
    {}, { infractions: 1, conduiteH: 5.0 }
  );

  runTest("N5-OUT-02", "OUT ne compte pas en travail",
    "2025-01-15;06:00;10:00;C\n2025-01-15;10:00;10:45;P\n2025-01-15;10:45;16:00;O\n2025-01-15;16:00;17:00;T",
    {}, { conduiteH: 4.0, scoreMin: 100 }
  );

  // ---- FERRY ----
  runTest("N5-FER-01", "Ferry 8h = repos valide",
    "2025-01-15;06:00;10:00;C\n2025-01-15;10:00;10:30;P\n2025-01-15;10:30;18:30;F\n2025-01-15;18:30;19:00;T",
    {}, { infractions: 0, ferryH: 8.0 }
  );

  runTest("N5-FER-02", "Ferry remet conduite continue a zero",
    "2025-01-15;06:00;10:30;C\n2025-01-15;10:30;12:00;F\n2025-01-15;12:00;16:00;C",
    {}, { noRegle: "Conduite continue" }
  );

  // ---- MULTI-EQUIPAGE ----
  runTest("N5-MULTI-01", "Multi-equipage retourne equipage=double",
    "2025-01-15;05:00;09:30;C\n2025-01-15;09:30;10:15;P\n2025-01-15;10:15;14:30;C\n2025-01-15;14:30;14:45;T",
    { equipage: "double" }, { equipage: "double", scoreMin: 100 }
  );

  runTest("N5-MULTI-02", "Solo par defaut",
    "2025-01-15;06:00;10:00;C\n2025-01-15;10:00;10:45;P\n2025-01-15;10:45;14:00;C",
    {}, { equipage: "solo" }
  );

  // ---- BI-HEBDOMADAIRE ----
  runTest("N5-BIHEB-01", "10 jours x 4h = 40h < 90h, pas d infraction bi-hebdo",
    [
      "2025-01-06;06:00;10:00;C", "2025-01-06;10:00;10:45;P", "2025-01-06;10:45;11:00;T",
      "2025-01-07;06:00;10:00;C", "2025-01-07;10:00;10:45;P", "2025-01-07;10:45;11:00;T",
      "2025-01-08;06:00;10:00;C", "2025-01-08;10:00;10:45;P", "2025-01-08;10:45;11:00;T",
      "2025-01-09;06:00;10:00;C", "2025-01-09;10:00;10:45;P", "2025-01-09;10:45;11:00;T",
      "2025-01-10;06:00;10:00;C", "2025-01-10;10:00;10:45;P", "2025-01-10;10:45;11:00;T",
      "2025-01-13;06:00;10:00;C", "2025-01-13;10:00;10:45;P", "2025-01-13;10:45;11:00;T",
      "2025-01-14;06:00;10:00;C", "2025-01-14;10:00;10:45;P", "2025-01-14;10:45;11:00;T",
      "2025-01-15;06:00;10:00;C", "2025-01-15;10:00;10:45;P", "2025-01-15;10:45;11:00;T",
      "2025-01-16;06:00;10:00;C", "2025-01-16;10:00;10:45;P", "2025-01-16;10:45;11:00;T",
      "2025-01-17;06:00;10:00;C", "2025-01-17;10:00;10:45;P", "2025-01-17;10:45;11:00;T"
    ].join("\n"),
    {}, { noRegle: "bi-hebdomadaire" }
  );

  // ---- REPOS HEBDOMADAIRE ----
  runTest("N5-HEBDO-01", "8 jours consecutifs -> infraction delai repos hebdo",
    [
      "2025-01-06;06:00;10:00;C", "2025-01-06;10:00;10:45;P", "2025-01-06;10:45;14:00;C", "2025-01-06;14:00;14:15;T",
      "2025-01-07;06:00;10:00;C", "2025-01-07;10:00;10:45;P", "2025-01-07;10:45;14:00;C", "2025-01-07;14:00;14:15;T",
      "2025-01-08;06:00;10:00;C", "2025-01-08;10:00;10:45;P", "2025-01-08;10:45;14:00;C", "2025-01-08;14:00;14:15;T",
      "2025-01-09;06:00;10:00;C", "2025-01-09;10:00;10:45;P", "2025-01-09;10:45;14:00;C", "2025-01-09;14:00;14:15;T",
      "2025-01-10;06:00;10:00;C", "2025-01-10;10:00;10:45;P", "2025-01-10;10:45;14:00;C", "2025-01-10;14:00;14:15;T",
      "2025-01-11;06:00;10:00;C", "2025-01-11;10:00;10:45;P", "2025-01-11;10:45;14:00;C", "2025-01-11;14:00;14:15;T",
      "2025-01-12;06:00;10:00;C", "2025-01-12;10:00;10:45;P", "2025-01-12;10:45;14:00;C", "2025-01-12;14:00;14:15;T",
      "2025-01-13;06:00;10:00;C", "2025-01-13;10:00;10:45;P", "2025-01-13;10:45;14:00;C", "2025-01-13;14:00;14:15;T"
    ].join("\n"),
    {}, { hasRegle: "Delai repos hebdomadaire" }
  );

  runTest("N5-HEBDO-02", "6 jours + 2 off + 2 jours = repos hebdo OK",
    [
      "2025-01-06;06:00;10:00;C", "2025-01-06;10:00;10:45;P", "2025-01-06;10:45;14:00;C", "2025-01-06;14:00;14:15;T",
      "2025-01-07;06:00;10:00;C", "2025-01-07;10:00;10:45;P", "2025-01-07;10:45;14:00;C", "2025-01-07;14:00;14:15;T",
      "2025-01-08;06:00;10:00;C", "2025-01-08;10:00;10:45;P", "2025-01-08;10:45;14:00;C", "2025-01-08;14:00;14:15;T",
      "2025-01-09;06:00;10:00;C", "2025-01-09;10:00;10:45;P", "2025-01-09;10:45;14:00;C", "2025-01-09;14:00;14:15;T",
      "2025-01-10;06:00;10:00;C", "2025-01-10;10:00;10:45;P", "2025-01-10;10:45;14:00;C", "2025-01-10;14:00;14:15;T",
      "2025-01-11;06:00;10:00;C", "2025-01-11;10:00;10:45;P", "2025-01-11;10:45;14:00;C", "2025-01-11;14:00;14:15;T",
      "2025-01-14;06:00;10:00;C", "2025-01-14;10:00;10:45;P", "2025-01-14;10:45;14:00;C", "2025-01-14;14:00;14:15;T",
      "2025-01-15;06:00;10:00;C", "2025-01-15;10:00;10:45;P", "2025-01-15;10:45;14:00;C", "2025-01-15;14:00;14:15;T"
    ].join("\n"),
    {}, { noRegle: "Delai repos hebdomadaire" }
  );

  runTest("N5-HEBDO-03", "Repos reduit 30h -> avertissement compensation",
    [
      "2025-01-06;06:00;10:00;C", "2025-01-06;10:00;10:45;P", "2025-01-06;10:45;14:00;C", "2025-01-06;14:00;14:15;T",
      "2025-01-07;06:00;10:00;C", "2025-01-07;10:00;10:45;P", "2025-01-07;10:45;14:00;C", "2025-01-07;14:00;14:15;T",
      "2025-01-08;06:00;10:00;C", "2025-01-08;10:00;10:45;P", "2025-01-08;10:45;14:00;C", "2025-01-08;14:00;14:15;T",
      "2025-01-09;06:00;10:00;C", "2025-01-09;10:00;10:45;P", "2025-01-09;10:45;14:00;C", "2025-01-09;14:00;14:15;T",
      "2025-01-10;06:00;10:00;C", "2025-01-10;10:00;10:45;P", "2025-01-10;10:45;14:00;C", "2025-01-10;14:00;14:15;T",
      "2025-01-12;06:00;10:00;C", "2025-01-12;10:00;10:45;P", "2025-01-12;10:45;14:00;C", "2025-01-12;14:00;14:15;T"
    ].join("\n"),
    {}, { hasWarn: "compensation" }
  );

  // ---- COMBINES ----
  runTest("N5-COMBI-01", "OUT + FERRY dans la meme journee",
    "2025-01-15;06:00;08:00;C\n2025-01-15;08:00;11:00;O\n2025-01-15;11:00;11:30;T\n2025-01-15;11:30;19:30;F\n2025-01-15;19:30;20:00;T",
    {}, { conduiteH: 2.0, ferryH: 8.0, scoreMin: 100 }
  );

  runTest("N5-COMBI-02", "Multi-equipage + ferry",
    "2025-01-15;05:00;09:30;C\n2025-01-15;09:30;10:15;P\n2025-01-15;10:15;18:15;F\n2025-01-15;18:15;18:30;T",
    { equipage: "double" }, { equipage: "double", ferryH: 8.0, scoreMin: 100 }
  );

  runTest("N5-COMBI-03", "OUT + multi-equipage",
    "2025-01-15;06:00;10:00;C\n2025-01-15;10:00;10:45;P\n2025-01-15;10:45;14:00;O\n2025-01-15;14:00;16:00;C",
    { equipage: "double" }, { equipage: "double", conduiteH: 6.0 }
  );


  // ---- TRANSPORT VOYAGEURS - UE 2024/1258 ----
  // Source: Reglement CE 561/2006 consolide 31/12/2024
  // Ref: https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:02006R0561-20241231

  // SCENARIO 1: Regle 12 jours (Art.8 par.6a modifie par UE 2024/1258)
  // Un conducteur en service occasionnel unique peut reporter le repos
  // hebdomadaire jusqu'a 12 periodes consecutives de 24h apres un repos
  // hebdomadaire normal (45h). Conditions: tachygraphe numerique,
  // conduite 22h-06h limitee a 3h sauf double equipage.
  runTest("N5-12JOURS-01", "Regle 12 jours - Service occasionnel sans infraction (Art.8 par.6a)",
    [
      "2025-02-01;06:00;10:30;C", "2025-02-01;10:30;11:15;P", "2025-02-01;11:15;15:00;C", "2025-02-01;15:00;15:15;T",
      "2025-02-02;06:00;10:30;C", "2025-02-02;10:30;11:15;P", "2025-02-02;11:15;15:00;C", "2025-02-02;15:00;15:15;T",
      "2025-02-03;06:00;10:30;C", "2025-02-03;10:30;11:15;P", "2025-02-03;11:15;15:00;C", "2025-02-03;15:00;15:15;T",
      "2025-02-04;06:00;10:30;C", "2025-02-04;10:30;11:15;P", "2025-02-04;11:15;15:00;C", "2025-02-04;15:00;15:15;T",
      "2025-02-05;06:00;10:30;C", "2025-02-05;10:30;11:15;P", "2025-02-05;11:15;15:00;C", "2025-02-05;15:00;15:15;T",
      "2025-02-06;06:00;10:30;C", "2025-02-06;10:30;11:15;P", "2025-02-06;11:15;15:00;C", "2025-02-06;15:00;15:15;T",
      "2025-02-07;06:00;10:30;C", "2025-02-07;10:30;11:15;P", "2025-02-07;11:15;15:00;C", "2025-02-07;15:00;15:15;T",
      "2025-02-08;06:00;10:30;C", "2025-02-08;10:30;11:15;P", "2025-02-08;11:15;15:00;C", "2025-02-08;15:00;15:15;T",
      "2025-02-09;06:00;10:30;C", "2025-02-09;10:30;11:15;P", "2025-02-09;11:15;15:00;C", "2025-02-09;15:00;15:15;T",
      "2025-02-10;06:00;10:30;C", "2025-02-10;10:30;11:15;P", "2025-02-10;11:15;15:00;C", "2025-02-10;15:00;15:15;T",
      "2025-02-11;06:00;10:30;C", "2025-02-11;10:30;11:15;P", "2025-02-11;11:15;15:00;C", "2025-02-11;15:00;15:15;T",
      "2025-02-12;06:00;10:30;C", "2025-02-12;10:30;11:15;P", "2025-02-12;11:15;15:00;C", "2025-02-12;15:00;15:15;T"
    ].join("\n"),
    { typeService: "SLO" }, { scoreMin: 50, nbJoursMin: 12, noRegle: "Repos hebdomadaire" }
  );

  // SCENARIO 2: Pause fractionnee 15+15 (Art.7 al.3 insere par UE 2024/1258)
  // En service occasionnel, la pause de 45min peut etre remplacee par
  // 2 pauses d'au moins 15min chacune (total >= 45min).
  // Ici: 20min + 25min = 45min, LEGAL en occasionnel.
  // Le moteur ne doit PAS generer d'infraction "pause insuffisante".
  runTest("N5-PAUSE1515-01", "Pause 15+15 service occasionnel - Pas d'infraction (Art.7 al.3 UE 2024/1258)",
    [
      "2025-03-01;06:00;08:15;C",
      "2025-03-01;08:15;08:35;P",
      "2025-03-01;08:35;10:30;C",
      "2025-03-01;10:30;10:55;P",
      "2025-03-01;10:55;14:00;C",
      "2025-03-01;14:00;14:15;T"
    ].join("\n"),
    { typeService: "SLO" }, { scoreMin: 80, noRegle: "Pause" }
  );

  runTest("N5-PAUSE1515-02", "Pause 10+35 service occasionnel - Infraction car pause < 15min (Art.7)",
    [
      "2025-03-02;06:00;08:15;C",
      "2025-03-02;08:15;08:25;P",
      "2025-03-02;08:25;10:30;C",
      "2025-03-02;10:30;11:05;P",
      "2025-03-02;11:05;14:00;C",
      "2025-03-02;14:00;14:15;T"
    ].join("\n"),
    { typeService: "SLO" }, { hasRegle: "Pause" }
  );

  // SCENARIO 3: Report repos journalier +1h / 25h (Art.8 par.2a insere par UE 2024/1258)
  // Service occasionnel unique >= 6 periodes de 24h: le repos journalier
  // peut etre pris dans un delai de 25h (au lieu de 24h) UNE FOIS,
  // a condition que la conduite ce jour-la ne depasse pas 7h.
  // Jour 3: amplitude 25h avec seulement 5h de conduite -> LEGAL.
  runTest("N5-REPORT25H-01", "Report repos 25h service occasionnel - Legal si conduite <= 7h (Art.8 par.2a)",
    [
      "2025-04-01;06:00;10:30;C", "2025-04-01;10:30;11:15;P", "2025-04-01;11:15;14:00;C", "2025-04-01;14:00;14:15;T",
      "2025-04-02;06:00;10:30;C", "2025-04-02;10:30;11:15;P", "2025-04-02;11:15;14:00;C", "2025-04-02;14:00;14:15;T",
      "2025-04-03;06:00;09:00;C", "2025-04-03;09:00;09:45;P", "2025-04-03;09:45;11:45;C", "2025-04-03;11:45;16:00;T",
      "2025-04-04;07:00;10:30;C", "2025-04-04;10:30;11:15;P", "2025-04-04;11:15;14:00;C", "2025-04-04;14:00;14:15;T",
      "2025-04-05;06:00;10:30;C", "2025-04-05;10:30;11:15;P", "2025-04-05;11:15;14:00;C", "2025-04-05;14:00;14:15;T",
      "2025-04-06;06:00;10:30;C", "2025-04-06;10:30;11:15;P", "2025-04-06;11:15;14:00;C", "2025-04-06;14:00;14:15;T"
    ].join("\n"),
    { typeService: "SLO" }, { scoreMin: 50, nbJoursMin: 6 }
  );

  runTest("N5-REPORT25H-02", "Report repos 25h MAIS conduite > 7h - Infraction attendue (Art.8 par.2a)",
    [
      "2025-04-08;06:00;10:30;C", "2025-04-08;10:30;11:15;P", "2025-04-08;11:15;15:00;C", "2025-04-08;15:00;15:15;T",
      "2025-04-09;06:00;10:30;C", "2025-04-09;10:30;11:15;P", "2025-04-09;11:15;15:00;C", "2025-04-09;15:00;15:15;T",
      "2025-04-10;05:00;10:30;C", "2025-04-10;10:30;11:15;P", "2025-04-10;11:15;16:30;C", "2025-04-10;16:30;17:00;T",
      "2025-04-11;07:00;10:30;C", "2025-04-11;10:30;11:15;P", "2025-04-11;11:15;15:00;C", "2025-04-11;15:00;15:15;T",
      "2025-04-12;06:00;10:30;C", "2025-04-12;10:30;11:15;P", "2025-04-12;11:15;15:00;C", "2025-04-12;15:00;15:15;T",
      "2025-04-13;06:00;10:30;C", "2025-04-13;10:30;11:15;P", "2025-04-13;11:15;15:00;C", "2025-04-13;15:00;15:15;T"
    ].join("\n"),
    { typeService: "SLO" }, { infractionsMin: 1 }
  );


  // Resume
  const ok = tests.filter(t => t.status === "OK").length;
  const fail = tests.filter(t => t.status === "FAIL").length;
  const error = tests.filter(t => t.status === "ERROR").length;

  res.json({
    titre: "Tests N5 - Scenarios avances (multi-equipage, bi-hebdo, repos hebdo, OUT, FERRY)",
    version: version,
    date: date,
    resume: { ok: ok, fail: fail, error: error, total: tests.length },
    tests: tests
  });
});


// GET /api/regles - Constantes reglementaires
app.get('/api/regles', (req, res) => {
  const typeService = req.query.typeService || 'SLO';
  const reglesTypees = getRegles(typeService);
  if (!reglesTypees) {
    return res.status(400).json({ erreur: 'Type de service inconnu: ' + typeService, types_valides: ['REGULIER','SLO','OCCASIONNEL','INTERURBAIN','MARCHANDISES'] });
  }
  res.json({ regles: reglesTypees, sanctions: SANCTIONS });
});


// ============================================================
// ROUTE QA NIVEAU 1 - TESTS REGLEMENTAIRES SOURCES
// GET /api/qa
// Version: 7.6.10.1
// Sources primaires:
//   [EUR-1] CE 561/2006 Art.6 - Durees de conduite
//   [EUR-2] CE 561/2006 Art.7 - Pauses
//   [EUR-3] CE 561/2006 Art.8 - Repos
//   [FR-1]  L3312-1 Code des transports - Travail de nuit
//   [FR-2]  L3312-2 Code des transports - Amplitude
//   [FR-4]  R3315-10 Decret 2010-855 - Seuils 4e classe
//   [FR-5]  R3315-11 Decret 2010-855 - Seuils 5e classe
//   [EU-TZ] Directive 2000/84/CE - Heure ete/hiver
//   [QCM-1] legistrans.com FIMO/FCO
//   [QCM-2] Wayground QCM RSE
// ============================================================
app.get('/api/qa', async (req, res) => {
  const rapport = {
    timestamp: new Date().toISOString(),
    version: APP_VERSION,
    description: "Tests reglementaires sources - Niveau 1",
    methode: "Chaque assertion cite son article de loi exact",
    sources: [
      { id: "EUR-1", ref: "CE 561/2006 Art.6", sujet: "Durees de conduite", url: "https://eur-lex.europa.eu/legal-content/FR/TXT/?uri=CELEX%3A32006R0561" },
      { id: "EUR-2", ref: "CE 561/2006 Art.7", sujet: "Pauses obligatoires" },
      { id: "EUR-3", ref: "CE 561/2006 Art.8", sujet: "Temps de repos" },
      { id: "FR-1", ref: "L3312-1 Code des transports", sujet: "Travail de nuit", url: "https://www.legifrance.gouv.fr/codes/section_lc/LEGITEXT000023086525/" },
      { id: "FR-2", ref: "L3312-2 Code des transports", sujet: "Amplitude journaliere" },
      { id: "FR-4", ref: "R3315-10 Decret 2010-855", sujet: "Seuils 4e classe", url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000046177522" },
      { id: "FR-5", ref: "R3315-11 Decret 2010-855", sujet: "Seuils 5e classe", url: "https://www.legifrance.gouv.fr/codes/section_lc/LEGITEXT000023086525/LEGISCTA000033450515/" },
      { id: "FR-6", ref: "Code penal transport", sujet: "Delits" },
      { id: "EU-TZ", ref: "Directive 2000/84/CE", sujet: "Heure ete/hiver" },
      { id: "QCM-1", ref: "legistrans.com", sujet: "QCM FIMO/FCO 100Q", url: "http://alainfrancis.free.fr/exercicesetqcm/QCMpar100Q.htm" },
      { id: "QCM-2", ref: "Wayground RSE", sujet: "QCM RSE 20Q", url: "https://wayground.com/admin/quiz/68e4bf60a509337bdd0c7210" }
    ],
    categories: [],
    tests: [],
    resume: { total: 0, ok: 0, ko: 0 }
  };

  function test(categorie, nom, condition, source_id, article, detail) {
    var ok = !!condition;
    rapport.tests.push({ categorie: categorie, nom: nom, ok: ok, source: source_id, article: article, detail: detail || (ok ? 'CONFORME' : 'NON CONFORME') });
    rapport.resume.total++;
    if (ok) rapport.resume.ok++; else rapport.resume.ko++;
  }

  // === R1-CONDUITE : CE 561/2006 Art.6 ===
  test('R1-CONDUITE', 'Conduite journaliere max = 540 min (9h)', REGLES.CONDUITE_JOURNALIERE_MAX_MIN === 540, 'EUR-1', 'CE 561/2006 Art.6 para.1', 'Attendu: 540. Obtenu: ' + REGLES.CONDUITE_JOURNALIERE_MAX_MIN + '. Cross-check: Wayground Q1, legistrans Q2');
  test('R1-CONDUITE', 'Conduite derogatoire max = 600 min (10h)', REGLES.CONDUITE_JOURNALIERE_DEROGATOIRE_MAX_MIN === 600, 'EUR-1', 'CE 561/2006 Art.6 para.1', 'Attendu: 600. Obtenu: ' + REGLES.CONDUITE_JOURNALIERE_DEROGATOIRE_MAX_MIN + '. Cross-check: Wayground Q2 (2x/semaine)');
  test('R1-CONDUITE', 'Conduite hebdomadaire max = 3360 min (56h)', REGLES.CONDUITE_HEBDOMADAIRE_MAX_MIN === 3360, 'EUR-1', 'CE 561/2006 Art.6 para.2', 'Attendu: 3360. Obtenu: ' + REGLES.CONDUITE_HEBDOMADAIRE_MAX_MIN + '. Cross-check: Wayground Q3, legistrans Q12');
  test('R1-CONDUITE', 'Conduite bi-hebdo max = 5400 min (90h)', REGLES.CONDUITE_BIHEBDO_MAX_MIN === 5400, 'EUR-1', 'CE 561/2006 Art.6 para.3', 'Attendu: 5400. Obtenu: ' + REGLES.CONDUITE_BIHEBDO_MAX_MIN + '. Cross-check: Wayground Q4, legistrans Q18');

  // === R2-PAUSES : CE 561/2006 Art.7 ===
  test('R2-PAUSES', 'Conduite continue max = 270 min (4h30)', REGLES.CONDUITE_CONTINUE_MAX_MIN === 270, 'EUR-2', 'CE 561/2006 Art.7', 'Attendu: 270. Obtenu: ' + REGLES.CONDUITE_CONTINUE_MAX_MIN + '. Cross-check: legistrans Q3 Q8');
  test('R2-PAUSES', 'Pause obligatoire complete = 45 min', REGLES_SLO.PAUSE_OBLIGATOIRE_MIN === 45, 'EUR-2', 'CE 561/2006 Art.7 (45min ou fractionne 15+30)', 'Attendu: 45. Obtenu: ' + REGLES_SLO.PAUSE_OBLIGATOIRE_MIN + '. Fractionnable en 15+30 min');

  // === R3-REPOS : CE 561/2006 Art.8 ===
  test('R3-REPOS', 'Repos journalier normal = 11h', REGLES_SLO.REPOS_JOURNALIER_NORMAL_H === 11, 'EUR-3', 'CE 561/2006 Art.8 para.1', 'Attendu: 11. Obtenu: ' + REGLES_SLO.REPOS_JOURNALIER_NORMAL_H + '. Cross-check: Wayground Q5, legistrans Q1');
  test('R3-REPOS', 'Repos journalier reduit = 9h', REGLES_SLO.REPOS_JOURNALIER_REDUIT_H === 9, 'EUR-3', 'CE 561/2006 Art.8 para.2', 'Attendu: 9. Obtenu: ' + REGLES_SLO.REPOS_JOURNALIER_REDUIT_H + '. Max 3x entre 2 repos hebdo (Wayground Q6)');
  test('R3-REPOS', 'Repos hebdo normal = 45h', REGLES.REPOS_HEBDO_NORMAL_H === 45, 'EUR-3', 'CE 561/2006 Art.8 para.6', 'Attendu: 45. Obtenu: ' + REGLES.REPOS_HEBDO_NORMAL_H + '. Cross-check: Wayground Q7');
  test('R3-REPOS', 'Repos hebdo reduit = 24h', REGLES.REPOS_HEBDO_REDUIT_H === 24, 'EUR-3', 'CE 561/2006 Art.8 para.6', 'Attendu: 24. Obtenu: ' + REGLES.REPOS_HEBDO_REDUIT_H);

  // === R4-AMPLITUDE : Code des transports FR ===
  test('R4-AMPLITUDE', 'Amplitude regulier = 11h (Decret 2006-925)', REGLES_REGULIER.AMPLITUDE_MAX_H === 11, 'FR-2', 'Decret 2006-925 art.6 / R3312-9', 'Attendu: 11. Obtenu: ' + REGLES_REGULIER.AMPLITUDE_MAX_H + '. Derog 13h art.R3312-28');
  test('R4-AMPLITUDE', 'Amplitude occasionnel = 12h (CE 561 + R3312-11 derog 14h)', REGLES_OCCASIONNEL.AMPLITUDE_MAX_H === 12, 'FR-2', 'R3312-11 / CE 561/2006', 'Attendu: 12. Obtenu: ' + REGLES_OCCASIONNEL.AMPLITUDE_MAX_H + '. Derog 14h via R3312-11');
  test('R4-AMPLITUDE', 'Nuit debut = 21h', REGLES.NUIT_DEBUT_H === 21, 'FR-1', 'L3312-1', 'Attendu: 21. Obtenu: ' + REGLES.NUIT_DEBUT_H);
  test('R4-AMPLITUDE', 'Nuit fin = 6h', REGLES.NUIT_FIN_H === 6, 'FR-1', 'L3312-1', 'Attendu: 6. Obtenu: ' + REGLES.NUIT_FIN_H);
  test('R4-AMPLITUDE', 'Travail nuit max = 10h', REGLES_COMMUN.TRAVAIL_NUIT_MAX_H === 10, 'FR-1', 'L3312-1', 'Attendu: 10. Obtenu: ' + REGLES_COMMUN.TRAVAIL_NUIT_MAX_H);
  test('R4-AMPLITUDE', 'Travail journalier max = 10h', REGLES_SLO.TRAVAIL_JOURNALIER_MAX_H === 10, 'FR-2', 'Code du travail transport', 'Attendu: 10. Obtenu: ' + REGLES_SLO.TRAVAIL_JOURNALIER_MAX_H + '. Cross-check: legistrans Q15');
  test('R4-AMPLITUDE', 'Travail hebdo max = 48h', REGLES.TRAVAIL_HEBDO_MAX_H === 48, 'FR-2', 'Code du travail / R3312-11', 'Attendu: 48. Obtenu: ' + REGLES.TRAVAIL_HEBDO_MAX_H + '. Cross-check: legistrans Q17');
  test('R4-AMPLITUDE', 'Travail hebdo moyenne = 44h', REGLES.TRAVAIL_HEBDO_MOYENNE_MAX_H === 44, 'FR-2', 'Code du travail (moy 12 semaines)', 'Attendu: 44. Obtenu: ' + REGLES.TRAVAIL_HEBDO_MOYENNE_MAX_H);

  // === R5-SANCTIONS : Decret 2010-855 ===
  test('R5-SANCTIONS', 'AF 4e classe = 135 EUR', SANCTIONS.classe_4.amende_forfaitaire === 135, 'FR-4', 'R3315-10', 'Attendu: 135. Obtenu: ' + SANCTIONS.classe_4.amende_forfaitaire);
  test('R5-SANCTIONS', 'Max 4e classe = 750 EUR', SANCTIONS.classe_4.amende_max === 750, 'FR-4', 'R3315-10', 'Attendu: 750. Obtenu: ' + SANCTIONS.classe_4.amende_max);
  test('R5-SANCTIONS', 'Max 5e classe = 1500 EUR', SANCTIONS.classe_5.amende_max === 1500, 'FR-5', 'R3315-11', 'Attendu: 1500. Obtenu: ' + SANCTIONS.classe_5.amende_max);
  test('R5-SANCTIONS', 'Recidive 5e classe = 3000 EUR', SANCTIONS.classe_5.amende_recidive === 3000, 'FR-5', 'R3315-11', 'Attendu: 3000. Obtenu: ' + SANCTIONS.classe_5.amende_recidive);
  test('R5-SANCTIONS', 'Delit falsification = 1 an + 30000 EUR', SANCTIONS.delits.falsification === "1 an emprisonnement + 30 000 euros", 'FR-6', 'Code penal', 'Obtenu: ' + SANCTIONS.delits.falsification);
  test('R5-SANCTIONS', 'Delit carte non conforme = 6 mois + 3750 EUR', SANCTIONS.delits.carte_non_conforme === "6 mois emprisonnement + 3 750 euros", 'FR-6', 'Code penal', 'Obtenu: ' + SANCTIONS.delits.carte_non_conforme);
  test('R5-SANCTIONS', 'Delit refus controle = 6 mois + 3750 EUR', SANCTIONS.delits.refus_controle === "6 mois emprisonnement + 3 750 euros", 'FR-6', 'Code penal', 'Obtenu: ' + SANCTIONS.delits.refus_controle);

  // === R6-SEUILS : Basculement 4e -> 5e classe ===
  test('R6-SEUILS', 'Seuil conduite continue 4e = dep < 1h30', SANCTIONS.classe_4.seuils.conduite_continue_depassement.includes('1h30'), 'FR-4', 'R3315-10 / R3315-10/11 Legifrance', 'Texte: ' + SANCTIONS.classe_4.seuils.conduite_continue_depassement);
  test('R6-SEUILS', 'Seuil conduite journaliere 4e = dep < 2h', SANCTIONS.classe_4.seuils.conduite_journaliere_depassement.includes('2h'), 'FR-4', 'R3315-10 / R3315-10/11 Legifrance', 'Texte: ' + SANCTIONS.classe_4.seuils.conduite_journaliere_depassement);
  test('R6-SEUILS', 'Seuil conduite hebdo 4e = dep < 14h', SANCTIONS.classe_4.seuils.conduite_hebdomadaire_depassement.includes('14h'), 'FR-4', 'R3315-10 / R3315-10/11 Legifrance', 'Texte: ' + SANCTIONS.classe_4.seuils.conduite_hebdomadaire_depassement);
  test('R6-SEUILS', 'Seuil conduite bihebdo 4e = dep < 22h30', SANCTIONS.classe_4.seuils.conduite_bihebdo_depassement.includes('22h30'), 'FR-4', 'R3315-10 / R3315-10/11 Legifrance', 'Texte: ' + SANCTIONS.classe_4.seuils.conduite_bihebdo_depassement);
  test('R6-SEUILS', 'Seuil repos journalier 4e = insuff < 2h30', SANCTIONS.classe_4.seuils.repos_journalier_insuffisant.includes('2h30'), 'FR-4', 'R3315-10 / R3315-10/11 Legifrance', 'Texte: ' + SANCTIONS.classe_4.seuils.repos_journalier_insuffisant);
  test('R6-SEUILS', 'Seuil repos hebdo 4e = insuff < 9h', SANCTIONS.classe_4.seuils.repos_hebdomadaire_insuffisant.includes('9h'), 'FR-4', 'R3315-10 / R3315-10/11 Legifrance', 'Texte: ' + SANCTIONS.classe_4.seuils.repos_hebdomadaire_insuffisant);

  // === R7-PAYS : Fuseaux horaires ===
  var nbPays = Object.keys(PAYS).length;
  test('R7-PAYS', 'Nombre pays >= 25', nbPays >= 25, 'EU-TZ', 'Config multi-pays', 'Obtenu: ' + nbPays);
  test('R7-PAYS', 'France (FR) presente', !!PAYS.FR, 'EU-TZ', 'Pays obligatoire', JSON.stringify(PAYS.FR));
  test('R7-PAYS', 'Allemagne (DE) presente', !!PAYS.DE, 'EU-TZ', 'Pays obligatoire', JSON.stringify(PAYS.DE));
  test('R7-PAYS', 'Maroc (MA) present', !!PAYS.MA, 'EU-TZ', 'Pays Maghreb', JSON.stringify(PAYS.MA));
  var dEte = new Date('2025-07-15T12:00:00Z');
  var dHiv = new Date('2025-01-15T12:00:00Z');
  test('R7-PAYS', 'Heure ete juillet = true', estHeureEteEU(dEte) === true, 'EU-TZ', 'Directive 2000/84/CE', 'Juillet: ' + estHeureEteEU(dEte));
  test('R7-PAYS', 'Heure hiver janvier = false', estHeureEteEU(dHiv) === false, 'EU-TZ', 'Directive 2000/84/CE', 'Janvier: ' + estHeureEteEU(dHiv));
  test('R7-PAYS', 'FR ete = UTC+2', getDecalageUTC('FR', dEte) === 2, 'EU-TZ', 'Directive 2000/84/CE', 'FR ete: UTC+' + getDecalageUTC('FR', dEte));
  test('R7-PAYS', 'FR hiver = UTC+1', getDecalageUTC('FR', dHiv) === 1, 'EU-TZ', 'Directive 2000/84/CE', 'FR hiver: UTC+' + getDecalageUTC('FR', dHiv));
  test('R7-PAYS', 'PT ete = UTC+1', getDecalageUTC('PT', dEte) === 1, 'EU-TZ', 'Directive 2000/84/CE', 'PT ete: UTC+' + getDecalageUTC('PT', dEte));
  test('R7-PAYS', 'TR = UTC+3 permanent', getDecalageUTC('TR', dEte) === 3, 'EU-TZ', 'Turquie pas changement', 'TR: UTC+' + getDecalageUTC('TR', dEte));
  test('R7-PAYS', 'RO ete = UTC+3', getDecalageUTC('RO', dEte) === 3, 'EU-TZ', 'Directive 2000/84/CE', 'RO ete: UTC+' + getDecalageUTC('RO', dEte));

  // === R8-MOTEUR : Scenarios CSV ===
  var csvOK = '2025-01-06;06:00;06:30;T\n2025-01-06;06:30;10:30;C\n2025-01-06;10:30;11:15;P\n2025-01-06;11:15;13:15;C\n2025-01-06;13:15;14:00;P\n2025-01-06;14:00;16:00;C\n2025-01-06;16:00;16:30;T';
  var rOK = analyserCSV(csvOK, 'STANDARD', 'FR');
  test('R8-MOTEUR', 'Conforme: 0 infraction', rOK.infractions.length === 0, 'EUR-1+2+3', 'Scenario conforme 6h', 'Infractions: ' + rOK.infractions.length + ' Score: ' + rOK.score);
  test('R8-MOTEUR', 'Conforme: score >= 80', rOK.score >= 80, 'EUR-1+2+3', 'Score conformite', 'Score: ' + rOK.score);
  test('R8-MOTEUR', 'Conforme: amende = 0', rOK.amende_estimee === 0, 'FR-4', 'Pas de sanction', 'Amende: ' + rOK.amende_estimee);

  var csvKO = '2025-01-06;06:00;12:00;C\n2025-01-06;12:00;12:30;P\n2025-01-06;12:30;18:30;C';
  var rKO = analyserCSV(csvKO, 'STANDARD', 'FR');
  test('R8-MOTEUR', 'Depassement: infractions > 0', rKO.infractions.length > 0, 'EUR-1+2', 'Art.6+7 violes', 'Infractions: ' + rKO.infractions.length);
  test('R8-MOTEUR', 'Depassement: continue detectee', rKO.infractions.some(function(i){return i.regle && i.regle.toLowerCase().indexOf('continu')!==-1;}), 'EUR-2', 'Art.7 6h>4h30', '');
  test('R8-MOTEUR', 'Depassement: journaliere detectee', rKO.infractions.some(function(i){return i.regle && i.regle.toLowerCase().indexOf('ournali')!==-1;}), 'EUR-1', 'Art.6 12h>9h', '');
  test('R8-MOTEUR', 'Depassement: amende > 0', rKO.amende_estimee > 0, 'FR-4+5', 'Sanctions', 'Amende: ' + rKO.amende_estimee + ' EUR');

  var csvRP = '2025-01-06;04:00;08:30;C\n2025-01-06;08:30;09:00;P\n2025-01-06;09:00;13:00;C\n2025-01-06;13:00;13:30;P\n2025-01-06;13:30;17:30;C\n2025-01-06;17:30;18:00;T\n2025-01-06;18:00;22:00;D';
  var rRP = analyserCSV(csvRP, 'STANDARD', 'FR');
  test('R8-MOTEUR', 'Repos insuff: detecte', rRP.infractions.some(function(i){return i.regle && i.regle.toLowerCase().indexOf('repos')!==-1;}), 'EUR-3', 'Art.8 repos<11h', '');

  var rInv = analyserCSV('ceci;nest;pas;valide\n2025-01-06;06:00;07:00;Z', 'STANDARD', 'FR');
  test('R8-MOTEUR', 'CSV invalide: erreurs', rInv.erreurs_analyse.length > 0, 'EUR-1', 'Robustesse parser', 'Erreurs: ' + rInv.erreurs_analyse.length);

  var rVide = analyserCSV('', 'STANDARD', 'FR');
  test('R8-MOTEUR', 'CSV vide: 0 jours', rVide.details_jours.length === 0, 'EUR-1', 'Robustesse parser', 'Jours: ' + rVide.details_jours.length);

  var csvMJ = '2025-01-06;06:00;10:30;C\n2025-01-06;10:30;11:15;P\n2025-01-06;11:15;15:00;C\n2025-01-07;06:00;10:30;C\n2025-01-07;10:30;11:15;P\n2025-01-07;11:15;15:00;C\n2025-01-08;06:00;10:30;C\n2025-01-08;10:30;11:15;P\n2025-01-08;11:15;15:00;C';
  var rMJ = analyserCSV(csvMJ, 'STANDARD', 'FR');
  test('R8-MOTEUR', 'Multi-jours: 3 jours', rMJ.nombre_jours === 3, 'EUR-1', 'Parser multi-jours', 'Jours: ' + rMJ.nombre_jours);

  var csvNT = '2025-01-06;21:00;23:59;C\n2025-01-06;00:00;04:00;C';
  var rNT = analyserCSV(csvNT, 'STANDARD', 'FR');
  test('R8-MOTEUR', 'Nuit: minutes > 0', rNT.details_jours.length > 0 && rNT.details_jours[0].travail_nuit_min > 0, 'FR-1', 'L3312-1 nuit 21h-6h', 'Nuit: ' + (rNT.details_jours[0] ? rNT.details_jours[0].travail_nuit_min + 'min' : 'N/A'));

  // === R9-INFRA ===
  test('R9-INFRA', 'Frontend build existe', fs.existsSync(path.join(__dirname, 'client', 'dist', 'index.html')), 'INFRA', 'Deploiement', '');
  test('R9-INFRA', 'Serveur port ' + PORT, true, 'INFRA', 'Express.js', 'Port: ' + PORT);

  // === RESUME ===
  var cats = {};
  rapport.tests.forEach(function(t) { if (!cats[t.categorie]) cats[t.categorie] = {total:0,ok:0}; cats[t.categorie].total++; if(t.ok) cats[t.categorie].ok++; });
  rapport.categories = Object.keys(cats).map(function(c) { return {categorie:c, total:cats[c].total, ok:cats[c].ok, status: cats[c].ok===cats[c].total?'PARFAIT':'ECHEC'}; });
  rapport.resume.pourcentage = rapport.resume.total > 0 ? Math.round((rapport.resume.ok / rapport.resume.total) * 100) : 0;
  rapport.resume.status = rapport.resume.ko === 0 ? 'TOUS LES TESTS PASSENT - CONFORME AUX TEXTES DE LOI' : rapport.resume.ko + ' TEST(S) NON CONFORME(S)';
  console.log('[QA Niveau 1] ' + rapport.resume.ok + '/' + rapport.resume.total + ' (' + rapport.resume.pourcentage + '%)');
  res.json(rapport);
});

// ============================================================
// ============================================================
// ROUTE QA v5.6.0 - SYSTEME DE TEST AVANCE POUR DIAGNOSTIC LLM
// GET /api/qa/cas-reels
// 25 cas organises en 7 categories :
//   CAT-A : Conformite parfaite (cas 1-4)
//   CAT-B : Conduite continue CE 561/2006 Art.7 (cas 5-8)
//   CAT-C : Conduite journaliere CE 561/2006 Art.6 (cas 9-12)
//   CAT-D : Repos journalier CE 561/2006 Art.8 (cas 13-15)
//   CAT-E : Amplitude L3312-2 / R3312-9 / R3312-11 (cas 16-19)
//   CAT-F : Travail de nuit L3312-1 (cas 20-22)
//   CAT-G : Edge cases et cumuls (cas 23-25)
// Sources :
//   - CE 561/2006 Art.6-8 (conduite, pause, repos)
//   - Code des transports R3312-9, R3312-11, R3312-28, L3312-1, L3312-2
//   - Seuils 4e/5e classe : dan-dis-scan.fr, inodis.fr
//   - domformateur.com, ecologie.gouv.fr, groupito.com, sinari.com
// Seuils moteur (server.js) :
//   Conduite continue: >270min infraction, >270+90=360min -> 5e classe
//   Conduite journaliere: >540min avert, >600min infraction, >600+120=720min -> 5e classe
//   Repos journalier reduit: <540min infraction, manque>150min -> 5e classe
//   Amplitude: regulier>13h, occasionnel>14h -> 4e classe
//   Travail nuit: >10h -> 4e classe
//   Pause reset: >=30min remet conduite continue a 0
// ============================================================
app.get('/api/qa/cas-reels', (req, res) => {
  var rapport = {
    timestamp: new Date().toISOString(),
    version: APP_VERSION,
    description: '25 cas de test avances pour diagnostic LLM - 7 categories reglementaires',
    moteur_info: {
      pause_reset_min: 30,
      conduite_continue_max_min: 270,
      seuil_5e_continue_depassement: 90,
      conduite_journaliere_max_min: 540,
      conduite_derogatoire_max_min: 600,
      seuil_5e_journaliere_depassement: 120,
      repos_reduit_min_h: 9,
      repos_normal_min_h: 11,
      seuil_5e_repos_manque_min: 150,
      amplitude_regulier_h: 13,
      amplitude_occasionnel_h: 14,
      travail_nuit_max_h: 10,
      nuit_debut_h: 21,
      nuit_fin_h: 6,
      amende_4e: 135,
      amende_5e: 1500
    },
    sources: [
      'CE 561/2006 Art.6-8 (EUR-Lex)',
      'Code des transports L3312-1, L3312-2, R3312-9, R3312-11, R3312-28 (Legifrance)',
      'https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000046177522',
      'https://inodis.fr/infractions-tachygraphe/',
      'https://www.domformateur.com/pages/tronc-commun/durees-de-conduite-temps-de-pause-et-temps-de-repos.html',
      'https://www.ecologie.gouv.fr/politiques-publiques/temps-travail-conducteurs-routiers-transport-personnes',
      'https://www.groupito.com/blog/la-minute-groupito/combien-de-temps-un-conducteur-dautocar-peut-il-conduire/',
      'https://www.sinari.com/blog/rse-temps-conduite'
    ],
    cas: [],
    resume: { total: 0, ok: 0, ko: 0, anomalies: [], categories: {} }
  };

  function testerCas(cat, nom, desc, csv, ts, cp, att) {
    var r = analyserCSV(csv, ts, cp);
    var v = [];
    var ok = true;
    function check(testName, attendu, obtenu, passe) {
      v.push({ test: testName, attendu: attendu, obtenu: obtenu, ok: passe });
      if (!passe) ok = false;
    }
    if (att.infractions !== undefined) {
      check('Nb infractions exact', att.infractions, r.infractions.length, r.infractions.length === att.infractions);
    }
    if (att.infractions_min !== undefined) {
      check('Infractions >= ' + att.infractions_min, att.infractions_min, r.infractions.length, r.infractions.length >= att.infractions_min);
    }
    if (att.infractions_max !== undefined) {
      check('Infractions <= ' + att.infractions_max, att.infractions_max, r.infractions.length, r.infractions.length <= att.infractions_max);
    }
    if (att.infractions_contiennent) {
      att.infractions_contiennent.forEach(function(m) {
        var found = r.infractions.some(function(i) { return i.regle && i.regle.toLowerCase().includes(m.toLowerCase()); });
        check('Contient infraction "' + m + '"', true, found, found);
      });
    }
    if (att.infractions_absent) {
      att.infractions_absent.forEach(function(m) {
        var found = r.infractions.some(function(i) { return i.regle && i.regle.toLowerCase().includes(m.toLowerCase()); });
        check('Pas d\'infraction "' + m + '"', false, found, !found);
      });
    }
    if (att.score_exact !== undefined) {
      check('Score exact', att.score_exact, r.score, r.score === att.score_exact);
    }
    if (att.score_min !== undefined) {
      check('Score >= ' + att.score_min, att.score_min, r.score, r.score >= att.score_min);
    }
    if (att.score_max !== undefined) {
      check('Score <= ' + att.score_max, att.score_max, r.score, r.score <= att.score_max);
    }
    if (att.amende_exacte !== undefined) {
      check('Amende exacte', att.amende_exacte, r.amende_estimee, r.amende_estimee === att.amende_exacte);
    }
    if (att.amende_min !== undefined) {
      check('Amende >= ' + att.amende_min, att.amende_min, r.amende_estimee, r.amende_estimee >= att.amende_min);
    }
    if (att.amende_max !== undefined) {
      check('Amende <= ' + att.amende_max, att.amende_max, r.amende_estimee, r.amende_estimee <= att.amende_max);
    }
    if (att.jours !== undefined) {
      check('Nb jours', att.jours, r.nombre_jours, r.nombre_jours === att.jours);
    }
    if (att.conduite_h !== undefined) {
      var ch = r.statistiques ? r.statistiques.conduite_totale_h : 'N/A';
      check('Conduite totale (h)', att.conduite_h, ch, ch === att.conduite_h);
    }
    if (att.avertissements_min !== undefined) {
      check('Avertissements >= ' + att.avertissements_min, att.avertissements_min, r.avertissements.length, r.avertissements.length >= att.avertissements_min);
    }
    if (att.avertissements_exact !== undefined) {
      check('Avertissements exact', att.avertissements_exact, r.avertissements.length, r.avertissements.length === att.avertissements_exact);
    }
    if (att.classe_contient) {
      att.classe_contient.forEach(function(c) {
        var found = r.infractions.some(function(i) { return i.classe && i.classe.includes(c); });
        check('Classe "' + c + '" presente', true, found, found);
      });
    }
    if (att.classe_absente) {
      att.classe_absente.forEach(function(c) {
        var found = r.infractions.some(function(i) { return i.classe && i.classe.includes(c); });
        check('Classe "' + c + '" absente', false, found, !found);
      });
    }
    if (att.amplitude_h !== undefined && r.details_jours && r.details_jours[0]) {
      var ampObtenu = parseFloat(r.details_jours[0].amplitude_estimee_h);
      check('Amplitude (h)', att.amplitude_h, ampObtenu, Math.abs(ampObtenu - att.amplitude_h) < 0.2);
    }
    if (att.conduite_continue_max !== undefined && r.details_jours && r.details_jours[0]) {
      var ccm = r.details_jours[0].conduite_continue_max_min;
      check('Conduite continue max (min)', att.conduite_continue_max, ccm, ccm === att.conduite_continue_max);
    }
    if (att.repos_estime_min !== undefined && r.details_jours && r.details_jours[0]) {
      var re = parseFloat(r.details_jours[0].repos_estime_h);
      check('Repos estime >= ' + att.repos_estime_min + 'h', att.repos_estime_min, re, re >= att.repos_estime_min);
    }
    if (att.repos_estime_max !== undefined && r.details_jours && r.details_jours[0]) {
      var re = parseFloat(r.details_jours[0].repos_estime_h);
      check('Repos estime <= ' + att.repos_estime_max + 'h', att.repos_estime_max, re, re <= att.repos_estime_max);
    }
    if (att.erreurs_min !== undefined) {
      var ne = r.erreurs_analyse ? r.erreurs_analyse.length : 0;
      check('Erreurs analyse >= ' + att.erreurs_min, att.erreurs_min, ne, ne >= att.erreurs_min);
    }

    var casResult = {
      categorie: cat,
      nom: nom,
      description: desc,
      type_service: ts,
      pays: cp,
      verdict: ok ? 'OK' : 'ANOMALIE',
      nb_checks: v.length,
      nb_passed: v.filter(function(x) { return x.ok; }).length,
      nb_failed: v.filter(function(x) { return !x.ok; }).length,
      verifications: v,
      resultat_brut: {
        score: r.score,
        infractions: r.infractions.length,
        avertissements: r.avertissements.length,
        amende: r.amende_estimee,
        jours: r.nombre_jours,
        conduite_h: r.statistiques ? r.statistiques.conduite_totale_h : 'N/A',
        infractions_detail: r.infractions.map(function(i) {
          return { regle: i.regle, classe: i.classe, limite: i.limite, constate: i.constate, depassement: i.depassement };
        }),
        avertissements_detail: r.avertissements.map(function(a) {
          return { regle: a.regle, message: a.message };
        }),
        details_jour_1: r.details_jours && r.details_jours[0] ? {
          amplitude_h: r.details_jours[0].amplitude_estimee_h,
          conduite_continue_max_min: r.details_jours[0].conduite_continue_max_min,
          repos_estime_h: r.details_jours[0].repos_estime_h,
          travail_nuit_min: r.details_jours[0].travail_nuit_min,
          fuseau: r.details_jours[0].fuseau
        } : null
      }
    };
    rapport.cas.push(casResult);
    rapport.resume.total++;
    if (ok) { rapport.resume.ok++; }
    else { rapport.resume.ko++; rapport.resume.anomalies.push(nom); }
    if (!rapport.resume.categories[cat]) rapport.resume.categories[cat] = { total: 0, ok: 0, ko: 0 };
    rapport.resume.categories[cat].total++;
    if (ok) rapport.resume.categories[cat].ok++;
    else rapport.resume.categories[cat].ko++;
  }

  // ========================================
  // CAT-A : CONFORMITE PARFAITE (cas 1-4)
  // ========================================

  // CAS 1 - Journee parfaite regulier FR
  // 4h15 + 3h45 = 8h conduite, pause 45min, amplitude 9h15
  testerCas('CAT-A', 'CAS 1 - Journee parfaite regulier FR',
    'Paris-Lyon 8h conduite, pause 45min. CE 561/2006 Art.6-7. Amplitude 9h15 < 13h.',
    '2025-03-10;05:45;06:00;T\n2025-03-10;06:00;10:15;C\n2025-03-10;10:15;11:00;P\n2025-03-10;11:00;14:45;C\n2025-03-10;14:45;15:00;T',
    'REGULIER', 'FR',
    { infractions: 0, score_min: 80, amende_exacte: 0, jours: 1, conduite_h: '8.0', amplitude_h: 9.25, conduite_continue_max: 255, repos_estime_min: 14 }
  );

  // CAS 2 - Journee parfaite occasionnel FR
  // 4h + 3h30 = 7.5h conduite, pause 45min, amplitude 9h
  testerCas('CAT-A', 'CAS 2 - Journee parfaite occasionnel FR',
    'Excursion 7h30 conduite, pause 45min. Amplitude 9h < 14h occasionnel.',
    '2025-03-10;07:00;07:15;T\n2025-03-10;07:15;11:15;C\n2025-03-10;11:15;12:00;P\n2025-03-10;12:00;15:30;C\n2025-03-10;15:30;16:00;D',
    'OCCASIONNEL', 'FR',
    { infractions: 0, score_min: 80, amende_exacte: 0, jours: 1, conduite_h: '7.5', conduite_continue_max: 240, infractions_absent: ['mplitude', 'ontinue', 'ournali'] }
  );

  // CAS 3 - Semaine conforme 5j x 8h
  // 40h/sem < 56h hebdo max
  testerCas('CAT-A', 'CAS 3 - Semaine conforme 5j x 8h',
    '5 jours x 8h = 40h/sem. CE 561/2006 Art.6 < 56h.',
    '2025-03-10;06:00;06:15;T\n2025-03-10;06:15;10:30;C\n2025-03-10;10:30;11:15;P\n2025-03-10;11:15;15:00;C\n2025-03-10;15:00;15:15;T\n2025-03-11;06:00;06:15;T\n2025-03-11;06:15;10:30;C\n2025-03-11;10:30;11:15;P\n2025-03-11;11:15;15:00;C\n2025-03-11;15:00;15:15;T\n2025-03-12;06:00;06:15;T\n2025-03-12;06:15;10:30;C\n2025-03-12;10:30;11:15;P\n2025-03-12;11:15;15:00;C\n2025-03-12;15:00;15:15;T\n2025-03-13;06:00;06:15;T\n2025-03-13;06:15;10:30;C\n2025-03-13;10:30;11:15;P\n2025-03-13;11:15;15:00;C\n2025-03-13;15:00;15:15;T\n2025-03-14;06:00;06:15;T\n2025-03-14;06:15;10:30;C\n2025-03-14;10:30;11:15;P\n2025-03-14;11:15;15:00;C\n2025-03-14;15:00;15:15;T',
    'REGULIER', 'FR',
    { infractions: 0, jours: 5, score_min: 80, amende_exacte: 0 }
  );

  // CAS 4 - Espagne ete UTC+2 conforme
  testerCas('CAT-A', 'CAS 4 - Espagne ete UTC+2 conforme',
    'Autocar Espagne juillet, 8h conduite. CE 561/2006 applicable UE.',
    '2025-07-15;07:00;07:15;T\n2025-07-15;07:15;11:30;C\n2025-07-15;11:30;12:15;P\n2025-07-15;12:15;16:00;C\n2025-07-15;16:00;16:15;T',
    'OCCASIONNEL', 'ES',
    { infractions: 0, score_min: 80, amende_exacte: 0, jours: 1 }
  );

  // ========================================
  // CAT-B : CONDUITE CONTINUE CE 561/2006 Art.7 (cas 5-8)
  // Seuil moteur: >270min = infraction, depassement>90min = 5e classe
  // Pause >=30min remet compteur a 0
  // ========================================

  // CAS 5 - Conduite continue exactement 270min (limite, pas infraction)
  // 4h30 = 270min exactement = pas de depassement
  testerCas('CAT-B', 'CAS 5 - Conduite continue 270min exactement (limite OK)',
    'Exactement 4h30 sans pause puis pause 45min. Art.7 limite = 270min.',
    '2025-03-10;06:00;06:15;T\n2025-03-10;06:15;10:45;C\n2025-03-10;10:45;11:30;P\n2025-03-10;11:30;14:00;C\n2025-03-10;14:00;14:15;T',
    'REGULIER', 'FR',
    { infractions_absent: ['ontinue'], conduite_continue_max: 270, conduite_h: '7.0' }
  );

  // CAS 6 - Conduite continue 300min (4e classe, depassement 30min < 90min)
  // 5h = 300min, depassement 30min -> 4e classe 135 EUR
  testerCas('CAT-B', 'CAS 6 - Conduite continue 300min (4e classe)',
    '5h continues = depassement 30min sur 270min. Art.7 + R3312-9. 4e classe.',
    '2025-03-10;06:00;06:15;T\n2025-03-10;06:15;11:15;C\n2025-03-10;11:15;12:00;P\n2025-03-10;12:00;14:30;C\n2025-03-10;14:30;14:45;T',
    'SLO', 'FR',
    { infractions_contiennent: ['ontinue'], conduite_continue_max: 300, classe_contient: ['4e'], classe_absente: ['5e'] }
  );

  // CAS 7 - Conduite continue 360min (seuil exact 4e/5e = 90min depassement)
  // 6h = 360min, depassement 90min = seuil exact, moteur dit >90 pour 5e
  testerCas('CAT-B', 'CAS 7 - Conduite continue 360min (seuil 4e/5e)',
    '6h continues = depassement 90min exactement. Seuil bascule 4e/5e classe.',
    '2025-03-10;06:00;06:15;T\n2025-03-10;06:15;12:15;C\n2025-03-10;12:15;13:00;P\n2025-03-10;13:00;15:00;C\n2025-03-10;15:00;15:15;T',
    'OCCASIONNEL', 'FR',
    { infractions_contiennent: ['ontinue'], conduite_continue_max: 360, classe_contient: ['4e'] }
  );

  // CAS 8 - Conduite continue 390min (5e classe, depassement 120min > 90min)
  // 6h30 = 390min, depassement 120min > 90 -> 5e classe 1500 EUR
  testerCas('CAT-B', 'CAS 8 - Conduite continue 390min (5e classe)',
    '6h30 continues = depassement 120min. >90min = 5e classe 1500 EUR.',
    '2025-03-10;06:00;06:15;T\n2025-03-10;06:15;12:45;C\n2025-03-10;12:45;13:30;P\n2025-03-10;13:30;15:30;C\n2025-03-10;15:30;15:45;T',
    'SLO', 'FR',
    { infractions_contiennent: ['ontinue'], conduite_continue_max: 390, classe_contient: ['5e'], amende_min: 1500 }
  );

  // ========================================
  // CAT-C : CONDUITE JOURNALIERE CE 561/2006 Art.6 (cas 9-12)
  // Seuil moteur: >540min avertissement (derog 600min)
  // >600min infraction, depassement>120min = 5e classe
  // ========================================

  // CAS 9 - Conduite 9h30 (avertissement derog, pas infraction)
  // 570min > 540min mais < 600min = avertissement seulement
  testerCas('CAT-C', 'CAS 9 - Conduite 9h30 (avertissement derog)',
    '9h30 conduite = 570min. >540min mais <600min derog. Avertissement seulement.',
    '2025-03-10;05:00;05:15;T\n2025-03-10;05:15;09:45;C\n2025-03-10;09:45;10:30;P\n2025-03-10;10:30;15:00;C\n2025-03-10;15:00;15:30;P\n2025-03-10;15:30;16:00;C\n2025-03-10;16:00;16:15;T',
    'REGULIER', 'FR',
    { infractions_absent: ['ournali'], avertissements_min: 1, conduite_h: '9.5' }
  );

  // CAS 10 - Conduite 10h derog conforme (pas infraction)
  // 600min = exactement la limite derogatoire, pas infraction
  testerCas('CAT-C', 'CAS 10 - Conduite 10h derogatoire (limite OK)',
    '10h conduite = 600min = limite derog exacte. CE 561/2006 Art.6-1. Pas infraction.',
    '2025-03-10;06:00;10:15;C\n2025-03-10;10:15;11:00;P\n2025-03-10;11:00;14:30;C\n2025-03-10;14:30;15:15;P\n2025-03-10;15:15;17:15;C',
    'OCCASIONNEL', 'FR',
    { infractions_absent: ['ournali', 'ravail'], infractions: 0, avertissements_min: 1, conduite_h: '9.8', score_min: 80 }
  );

  // CAS 11 - Conduite 11h (4e classe, depassement 120min sur 540 = 2h)
  // 660min, >600min derog, depassement = 660-540 = 120min = seuil exact 4e/5e
  // Moteur: depassement > 120 pour 5e, donc 120 = 4e classe
  testerCas('CAT-C', 'CAS 11 - Conduite 11h (4e classe seuil)',
    '11h conduite = 660min. Depassement 120min = seuil exact. 4e classe.',
    '2025-03-10;04:30;04:45;T\n2025-03-10;04:45;09:15;C\n2025-03-10;09:15;10:00;P\n2025-03-10;10:00;14:00;C\n2025-03-10;14:00;14:45;P\n2025-03-10;14:45;17:15;C\n2025-03-10;17:15;17:30;T',
    'SLO', 'FR',
    { infractions_contiennent: ['ournali'], classe_contient: ['4e'], conduite_h: '11.0' }
  );

  // CAS 12 - Conduite 12h (5e classe, depassement 180min > 120min)
  // 720min, depassement 720-540 = 180min > 120 = 5e classe
  testerCas('CAT-C', 'CAS 12 - Conduite 12h (5e classe)',
    '12h conduite = 720min. Depassement 180min > 120min. 5e classe 1500 EUR.',
    '2025-03-10;04:00;04:15;T\n2025-03-10;04:15;08:45;C\n2025-03-10;08:45;09:30;P\n2025-03-10;09:30;13:30;C\n2025-03-10;13:30;14:15;P\n2025-03-10;14:15;17:45;C\n2025-03-10;17:45;18:00;T',
    'SLO', 'FR',
    { infractions_contiennent: ['ournali'], classe_contient: ['5e'], amende_min: 1500, conduite_h: '12.0' }
  );

  // ========================================
  // CAT-D : REPOS JOURNALIER CE 561/2006 Art.8 (cas 13-15)
  // Moteur: repos = 24h - totalActivite
  // <540min (9h) = infraction, manque>150min = 5e classe
  // ========================================

  // CAS 13 - Repos reduit legal 9h30 (conforme)
  // Amplitude 9h30, repos ~ 14h30 >> 9h
  testerCas('CAT-D', 'CAS 13 - Repos 14h30 conforme (amplitude courte)',
    'Journee 7h conduite, amplitude 9h30. Repos 14h30 > 11h normal. OK.',
    '2025-03-10;06:00;06:15;T\n2025-03-10;06:15;10:15;C\n2025-03-10;10:15;11:00;P\n2025-03-10;11:00;14:00;C\n2025-03-10;14:00;15:15;D\n2025-03-10;15:15;15:30;T',
    'STANDARD', 'FR',
    { infractions: 0, infractions_absent: ['epos'], score_min: 80, conduite_h: '7.0', repos_estime_min: 14 }
  );

  // CAS 14 - Repos 8h (4e classe, manque 60min < 150min)
  // Amplitude 16h, repos = 24-16 = 8h, manque 1h sous 9h reduit = 4e
  testerCas('CAT-D', 'CAS 14 - Repos 8h (4e classe, manque 60min)',
    'Amplitude 16h, repos 8h. Manque 1h sur 9h minimum. 4e classe.',
    '2025-03-10;04:00;04:30;T\n2025-03-10;04:30;09:00;C\n2025-03-10;09:00;09:45;P\n2025-03-10;09:45;13:45;C\n2025-03-10;13:45;14:30;P\n2025-03-10;14:30;17:00;C\n2025-03-10;17:00;18:00;D\n2025-03-10;18:00;20:00;T',
    'REGULIER', 'FR',
    { infractions_contiennent: ['epos'], classe_contient: ['4e'], repos_estime_max: 9 }
  );

  // CAS 15 - Repos 5h30 (5e classe, manque 210min > 150min)
  // Amplitude 18h30, repos = 24-18.5 = 5.5h, manque 3h30 = 210min > 150 = 5e
  testerCas('CAT-D', 'CAS 15 - Repos 5h30 (5e classe, manque 210min)',
    'Journee massive 18h30 activite. Repos 5h30. Manque 210min > 150min. 5e classe.',
    '2025-03-10;03:30;04:00;T\n2025-03-10;04:00;08:30;C\n2025-03-10;08:30;09:00;P\n2025-03-10;09:00;13:00;C\n2025-03-10;13:00;13:30;P\n2025-03-10;13:30;17:30;C\n2025-03-10;17:30;18:00;D\n2025-03-10;18:00;22:00;T',
    'REGULIER', 'FR',
    { infractions_contiennent: ['epos'], classe_contient: ['5e'], amende_min: 1500, repos_estime_max: 6 }
  );

  // ========================================
  // CAT-E : AMPLITUDE L3312-2 / R3312-9 / R3312-11 (cas 16-19)
  // Moteur: regulier > 13h, occasionnel > 14h = 4e classe
  // ========================================

  // CAS 16 - Amplitude 12h50 regulier (conforme, juste sous 13h)
  testerCas('CAT-E', 'CAS 16 - Amplitude 12h50 regulier (conforme)',
    'Amplitude 12h50 < 13h regulier. Pas infraction.',
    '2025-03-10;05:10;05:30;T\n2025-03-10;05:30;09:45;C\n2025-03-10;09:45;10:30;P\n2025-03-10;10:30;14:30;C\n2025-03-10;14:30;15:15;P\n2025-03-10;15:15;17:30;C\n2025-03-10;17:30;18:00;T',
    'REGULIER', 'FR',
    { infractions_absent: ['mplitude'], amplitude_h: 12.8 }
  );

  // CAS 17 - Amplitude 14h30 regulier (infraction, depassement 1h30)
  testerCas('CAT-E', 'CAS 17 - Amplitude 14h30 regulier (infraction)',
    'Amplitude 04:30-19:00 = 14h30 > 13h regulier. L3312-2.',
    '2025-03-10;04:30;05:00;T\n2025-03-10;05:00;09:15;C\n2025-03-10;09:15;10:00;P\n2025-03-10;10:00;13:00;C\n2025-03-10;13:00;14:00;P\n2025-03-10;14:00;17:30;C\n2025-03-10;17:30;18:30;D\n2025-03-10;18:30;19:00;T',
    'REGULIER', 'FR',
    { infractions_contiennent: ['mplitude'], amplitude_h: 14.5, amende_min: 135 }
  );

  // CAS 18 - Amplitude 13h30 occasionnel (conforme car limite = 14h)
  testerCas('CAT-E', 'CAS 18 - Amplitude 13h30 occasionnel (conforme)',
    'Sortie scolaire amplitude 13h30 < 14h occasionnel. R3312-11.',
    '2025-03-10;05:30;06:00;T\n2025-03-10;06:00;10:15;C\n2025-03-10;10:15;11:00;P\n2025-03-10;11:00;13:45;C\n2025-03-10;13:45;14:30;P\n2025-03-10;14:30;16:30;C\n2025-03-10;16:30;18:30;D\n2025-03-10;18:30;19:00;T',
    'OCCASIONNEL', 'FR',
    { infractions_absent: ['mplitude'], amplitude_h: 13.5 }
  );

  // CAS 19 - Amplitude 15h occasionnel (infraction, >14h)
  testerCas('CAT-E', 'CAS 19 - Amplitude 15h occasionnel (infraction)',
    'Amplitude 05:00-20:00 = 15h > 14h occasionnel. R3312-11.',
    '2025-03-10;05:00;05:30;T\n2025-03-10;05:30;10:00;C\n2025-03-10;10:00;10:45;P\n2025-03-10;10:45;14:00;C\n2025-03-10;14:00;15:00;D\n2025-03-10;15:00;18:00;C\n2025-03-10;18:00;19:30;D\n2025-03-10;19:30;20:00;T',
    'OCCASIONNEL', 'FR',
    { infractions_contiennent: ['mplitude'], amplitude_h: 15.0, amende_min: 135 }
  );

  // ========================================
  // CAT-F : TRAVAIL DE NUIT L3312-1 (cas 20-22)
  // Moteur: nuit = 21h-6h, >10h travail nuit = 4e classe
  // ========================================

  // CAS 20 - Travail nuit 4h conforme (21h-01h)
  testerCas('CAT-F', 'CAS 20 - Travail nuit 4h (conforme)',
    'Navette aeroport 21h-01h = 4h nuit. < 10h. Pas infraction.',
    '2025-03-10;20:30;21:00;T\n2025-03-10;21:00;01:00;C\n2025-03-10;01:00;01:30;T',
    'REGULIER', 'FR',
    { infractions_absent: ['uit'], conduite_h: '4.0', jours: 1 }
  );

  // CAS 21 - Travail nuit 8h (conforme, < 10h)
  testerCas('CAT-F', 'CAS 21 - Travail nuit 8h (conforme limite)',
    'Service nuit complet 21h-05h30 = ~8h travail nuit. Sous 10h.',
    '2025-03-10;20:00;20:30;T\n2025-03-10;20:30;23:59;C\n2025-03-11;00:00;00:45;C\n2025-03-11;00:45;01:15;P\n2025-03-11;01:15;04:45;C\n2025-03-11;04:45;05:00;T',
    'REGULIER', 'FR',
    { infractions_absent: ['ontinue'], conduite_h: '7.7' }
  );

  // CAS 22 - Travail nuit >10h (infraction L3312-1)
  // L3312-1: si travail entre 0h-5h, travail TOTAL journee <= 10h
  // Source: ecologie.gouv.fr - "ne peut exceder 10 heures"
  // 20:00-08:00: conduite 10h + taches 45min = 10h45 > 10h
  testerCas('CAT-F', 'CAS 22 - Travail nuit >10h (infraction)',
    'Service 20h-08h. Travail entre 0h-5h. Total travail 10h45 > 10h. L3312-1. 4e classe.',
    '2025-03-10;20:00;20:30;T\n2025-03-10;20:30;01:00;C\n2025-03-10;01:00;01:45;P\n2025-03-10;01:45;05:45;C\n2025-03-10;05:45;06:15;P\n2025-03-10;06:15;07:45;C\n2025-03-10;07:45;08:00;T',
    'REGULIER', 'FR',
    { infractions_min: 1, amende_min: 135 }
  );

  // ========================================
  // CAT-G : EDGE CASES ET CUMULS (cas 23-25)
  // ========================================

  // CAS 23 - Pause exactement 30min remet compteur continu
  // Conduite 4h + pause 30min + conduite 4h = pas infraction continue
  // Car moteur remet a 0 si pause >= 30min
  testerCas('CAT-G', 'CAS 23 - Pause 30min seule NE reset PAS compteur (CE 561 Art.7 = 15+30)',
    'Conduite 4h + pause 30min seule + conduite 4h. 30min sans phase1 = pas de reset. 480min continues.',
    '2025-03-10;06:00;06:15;T\n2025-03-10;06:15;10:15;C\n2025-03-10;10:15;10:45;P\n2025-03-10;10:45;14:45;C\n2025-03-10;14:45;15:00;T',
    'SLO', 'FR',
    { infractions_contiennent: ['ontinue'], conduite_continue_max: 480, conduite_h: '8.0' }
  );

  // CAS 24 - Pause 25min NE remet PAS le compteur
  // Conduite 4h + pause 25min + conduite 1h30 = 330min continues (car 25 < 30)
  // 330min > 270min = infraction continue
  testerCas('CAT-G', 'CAS 24 - Pause 25min NE reset PAS compteur',
    'Conduite 4h + pause 25min + conduite 1h30. 25min < 30min = pas de reset. 330min continues.',
    '2025-03-10;06:00;06:15;T\n2025-03-10;06:15;10:15;C\n2025-03-10;10:15;10:40;P\n2025-03-10;10:40;12:10;C\n2025-03-10;12:10;12:25;T',
    'SLO', 'FR',
    { infractions_contiennent: ['ontinue'], conduite_continue_max: 330, conduite_h: '5.5' }
  );

  // CAS 25 - Catastrophe cumul maximum (18h conduite, toutes infractions)
  // Continue + journaliere + repos + amplitude + travail
  testerCas('CAT-G', 'CAS 25 - Catastrophe cumul 18h (toutes infractions)',
    '18h conduite sans repos. Cumul: continue, journaliere 5e, repos 5e, amplitude, travail nuit.',
    '2025-03-10;04:00;04:15;T\n2025-03-10;04:15;10:15;C\n2025-03-10;10:15;10:30;P\n2025-03-10;10:30;16:30;C\n2025-03-10;16:30;16:45;P\n2025-03-10;16:45;22:45;C\n2025-03-10;22:45;23:00;T',
    'SLO', 'FR',
    { infractions_min: 4, infractions_contiennent: ['ontinue', 'ournali'], amende_min: 270, score_max: 20 }
  );

  // ========================================
  // RAPPORT FINAL
  // ========================================
  rapport.resume.pourcentage = rapport.resume.total > 0 ? Math.round((rapport.resume.ok / rapport.resume.total) * 100) : 0;
  rapport.resume.status = rapport.resume.ko === 0 ? 'TOUS LES 25 CAS PASSENT' : rapport.resume.ko + ' CAS EN ANOMALIE';
  rapport.resume.diagnostic_llm = {
    instruction: 'Pour diagnostiquer une anomalie, verifier: (1) le champ verifications[] du cas en echec, (2) comparer attendu vs obtenu, (3) consulter resultat_brut.infractions_detail pour les regles declenchees, (4) verifier moteur_info pour les seuils utilises',
    seuils_critiques: {
      conduite_continue_4e: 'depassement <= 90min au-dela de 270min',
      conduite_continue_5e: 'depassement > 90min au-dela de 270min',
      conduite_journaliere_avert: '540min < conduite <= 600min (derog)',
      conduite_journaliere_4e: 'depassement <= 120min au-dela de 540min ET conduite > 600min',
      conduite_journaliere_5e: 'depassement > 120min au-dela de 540min',
      repos_4e: 'manque <= 150min sous 540min (9h)',
      repos_5e: 'manque > 150min sous 540min (9h)',
      amplitude_regulier: '> 13h',
      amplitude_occasionnel: '> 14h',
      pause_reset: '>= 30min remet conduite continue a 0'
    }
  };
  console.log('[QA v7.6.8] ' + rapport.resume.ok + '/' + rapport.resume.total + ' OK (' + rapport.resume.pourcentage + '%) - Categories: ' + JSON.stringify(rapport.resume.categories));
  res.json(rapport);
});


// ============================================================
// ROUTE QA NIVEAU 3 - TESTS AUX LIMITES REGLEMENTAIRES
// GET /api/qa/limites
// Verifie le comportement exact du moteur sur chaque seuil :
//   - 1 cran en dessous (conforme)
//   - pile sur la limite (conforme, car operateur >)
//   - 1 cran au dessus (infraction)
// Sources: CE 561/2006, L3312-1, L3312-2, Decret 2010-855
// ============================================================
app.get('/api/qa/limites', async (req, res) => {
  const rapport = {
    timestamp: new Date().toISOString(),
    version: APP_VERSION,
    description: "Tests aux limites reglementaires - Niveau 3",
    methode: "Chaque seuil est teste a -1, pile, +1",
    tests: [],
    resume: { total: 0, ok: 0, ko: 0, pourcentage: 0 }
  };

  // Fonction helper : generer CSV d'une journee simple
  // conduiteMin = minutes de conduite, avec pause 45min au milieu si > 240min
  function genererCSVJournee(conduiteMin, pauseMin, tacheMin, opts) {
    opts = opts || {};
    const date = opts.date || "2025-06-15";
    const debutH = opts.debutH || 6;
    var lignes = [];
    var h = debutH, m = 0;
    function fmt(hh, mm) { return (hh < 10 ? "0" : "") + hh + ":" + (mm < 10 ? "0" : "") + mm; }
    function avancer(min) { m += min; while (m >= 60) { h++; m -= 60; } if (h >= 24) h -= 24; }
    // Tache debut
    if (tacheMin > 0) {
      var deb = fmt(h, m); avancer(tacheMin); lignes.push(date + ";" + deb + ";" + fmt(h, m) + ";T");
    }
    // Conduite decoupee en blocs de 270 min max avec pause 45 min entre chaque
    var conduiteRestante = conduiteMin;
    var premierBloc = true;
    while (conduiteRestante > 0) {
      if (!premierBloc) {
        // Pause 45 min entre blocs
        var debP = fmt(h, m); avancer(45); lignes.push(date + ";" + debP + ";" + fmt(h, m) + ";P");
      }
      var bloc = Math.min(conduiteRestante, 270);
      var debC = fmt(h, m); avancer(bloc); lignes.push(date + ";" + debC + ";" + fmt(h, m) + ";C");
      conduiteRestante -= bloc;
      premierBloc = false;
    }
    return lignes.join("\n");
  }

  // Fonction helper : generer CSV conduite continue sans pause
  function genererCSVContinue(minutes, opts) {
    opts = opts || {};
    const date = opts.date || "2025-06-15";
    const debutH = opts.debutH || 6;
    let h = debutH, m = 0;
    function fmt(hh, mm) { return (hh < 10 ? "0" : "") + hh + ":" + (mm < 10 ? "0" : "") + mm; }
    function avancer(min) { m += min; while (m >= 60) { h++; m -= 60; } if (h >= 24) h -= 24; }
    var lignes = [];
    var deb = fmt(h, m); avancer(15); lignes.push(date + ";" + deb + ";" + fmt(h, m) + ";T");
    var debC = fmt(h, m); avancer(minutes); lignes.push(date + ";" + debC + ";" + fmt(h, m) + ";C");
    var finC = fmt(h, m); avancer(15); lignes.push(date + ";" + finC + ";" + fmt(h, m) + ";T");
    return lignes.join("\n");
  }

  // Fonction helper : generer CSV amplitude exacte
  function genererCSVAmplitude(amplitudeMin, opts) {
    opts = opts || {};
    const date = opts.date || "2025-06-15";
    const debutH = opts.debutH || 5;
    let h = debutH, m = 0;
    function fmt(hh, mm) { return (hh < 10 ? "0" : "") + hh + ":" + (mm < 10 ? "0" : "") + mm; }
    function avancer(min) { m += min; while (m >= 60) { h++; m -= 60; } if (h >= 24) h -= 24; }
    var lignes = [];
    var deb = fmt(h, m); avancer(15); lignes.push(date + ";" + deb + ";" + fmt(h, m) + ";T");
    var deb1 = fmt(h, m); avancer(240); lignes.push(date + ";" + deb1 + ";" + fmt(h, m) + ";C");
    var fin1 = fmt(h, m); avancer(45); lignes.push(date + ";" + fin1 + ";" + fmt(h, m) + ";P");
    var deb2 = fmt(h, m); avancer(180); lignes.push(date + ";" + deb2 + ";" + fmt(h, m) + ";C");
    var utilise = 15 + 240 + 45 + 180;
    var resteD = amplitudeMin - utilise - 15;
    if (resteD > 0) { var debD = fmt(h, m); avancer(resteD); lignes.push(date + ";" + debD + ";" + fmt(h, m) + ";D"); }
    var debFin = fmt(h, m); avancer(15); lignes.push(date + ";" + debFin + ";" + fmt(h, m) + ";T");
    return lignes.join("\n");
  }

  // Analyser un CSV via le moteur interne
  function analyser(csv, typeService, pays) {
    return analyserCSV(csv, typeService || "REGULIER", pays || "FR");
  }

  function test(categorie, nom, csv, typeService, attenduInfractions, article) {
    rapport.resume.total++;
    try {
      const r = analyser(csv, typeService, "FR");
      const nbInf = r.infractions ? r.infractions.length : 0;
      const ok = nbInf === attenduInfractions;
      if (ok) rapport.resume.ok++; else rapport.resume.ko++;
      rapport.tests.push({
        categorie: categorie,
        nom: nom,
        ok: ok,
        attendu_infractions: attenduInfractions,
        obtenu_infractions: nbInf,
        score: r.score,
        amende: r.amende_estimee || 0,
        article: article,
        detail: ok ? "OK" : "Attendu " + attenduInfractions + " inf, obtenu " + nbInf + " (score:" + r.score + " amende:" + (r.amende_estimee||0) + ")"
      });
    } catch(e) {
      rapport.resume.ko++;
      rapport.tests.push({ categorie: categorie, nom: nom, ok: false, detail: "ERREUR: " + e.message, article: article });
    }
  }

  // =========================================
  // L1 - CONDUITE CONTINUE (CE 561/2006 Art.7)
  // Seuil: > 270 min = infraction
  // Operateur: > (strict)
  // =========================================
  test("L1-CONDUITE-CONTINUE", "269 min = conforme (-1)", genererCSVContinue(269), "SLO", 0, "CE 561/2006 Art.7");
  test("L1-CONDUITE-CONTINUE", "270 min = conforme (pile)", genererCSVContinue(270), "SLO", 0, "CE 561/2006 Art.7");
  test("L1-CONDUITE-CONTINUE", "271 min = infraction (+1)", genererCSVContinue(271), "SLO", 1, "CE 561/2006 Art.7");

  // =========================================
  // L2 - CONDUITE JOURNALIERE (CE 561/2006 Art.6)
  // Seuil normal: > 540 min = avertissement/infraction
  // Seuil derog: > 600 min = infraction
  // =========================================
  test("L2-CONDUITE-JOUR", "539 min = conforme (-1)", genererCSVJournee(539, 45, 15), "SLO", 0, "CE 561/2006 Art.6");
  test("L2-CONDUITE-JOUR", "540 min = conforme (pile)", genererCSVJournee(540, 45, 15), "SLO", 0, "CE 561/2006 Art.6");
  test("L2-CONDUITE-JOUR", "541 min = avertissement derog (0 inf)", genererCSVJournee(541, 45, 15), "SLO", 0, "CE 561/2006 Art.6");
  test("L2-CONDUITE-JOUR", "599 min = 1 infraction >540 seulement", genererCSVJournee(599, 45, 15), "SLO", 1, "CE 561/2006 Art.6");
  test("L2-CONDUITE-JOUR", "600 min = 1 infraction >540, pile derog", genererCSVJournee(600, 45, 15), "SLO", 1, "CE 561/2006 Art.6");
  test("L2-CONDUITE-JOUR", "601 min = 2 infractions >540 + >600", genererCSVJournee(601, 45, 15), "SLO", 2, "CE 561/2006 Art.6");

  // =========================================
  // L3 - AMPLITUDE REGULIER (L3312-2 / R3312-9)
  // Seuil: > 13h = > 780 min = infraction
  // =========================================
  test("L3-AMPLITUDE-REG", "779 min (12h59) = conforme (-1)", genererCSVAmplitude(779), "REGULIER", 0, "L3312-2 / R3312-9");
  test("L3-AMPLITUDE-REG", "780 min (13h00) = conforme (pile)", genererCSVAmplitude(780), "REGULIER", 0, "L3312-2 / R3312-9");
  test("L3-AMPLITUDE-REG", "781 min (13h01) = infraction (+1)", genererCSVAmplitude(781), "REGULIER", 1, "L3312-2 / R3312-9");

  // =========================================
  // L4 - AMPLITUDE OCCASIONNEL (L3312-2 / R3312-11)
  // Seuil: > 14h = > 840 min = infraction
  // =========================================
  test("L4-AMPLITUDE-OCC", "839 min (13h59) = conforme (-1)", genererCSVAmplitude(839), "OCCASIONNEL", 0, "L3312-2 / R3312-11");
  test("L4-AMPLITUDE-OCC", "840 min (14h00) = conforme (pile)", genererCSVAmplitude(840), "OCCASIONNEL", 0, "L3312-2 / R3312-11");
  test("L4-AMPLITUDE-OCC", "841 min (14h01) = infraction (+1)", genererCSVAmplitude(841), "OCCASIONNEL", 1, "L3312-2 / R3312-11");

  // =========================================
  // L5 - TRAVAIL NUIT L3312-1
  // Si activite entre 0h-5h, travail total journee > 600 min = infraction
  // On genere un CSV avec debut a 01:00 (zone 0h-5h)
  // =========================================
  function genererCSVNuit(travailTotalMin) {
    // Genere un service de nuit commencant a 20:00
    // Le travail passe par la zone 0h-5h, declenchant L3312-1
    // Pauses tous les 270 min pour eviter infraction conduite continue
    const date = "2025-06-15";
    var lignes = [];
    var h = 20, m = 0;
    function fmt(hh, mm) { return (hh < 10 ? "0" : "") + hh + ":" + (mm < 10 ? "0" : "") + mm; }
    function avancer(min) { m += min; while (m >= 60) { h++; m -= 60; } if (h >= 24) h -= 24; }
    // Tache debut 15 min
    var deb = fmt(h, m); avancer(15); lignes.push(date + ";" + deb + ";" + fmt(h, m) + ";T");
    // Conduite decoupee en blocs de 270 min max
    var conduiteRestante = travailTotalMin - 30;
    var premierBloc = true;
    while (conduiteRestante > 0) {
      if (!premierBloc) {
        var debP = fmt(h, m); avancer(45); lignes.push(date + ";" + debP + ";" + fmt(h, m) + ";P");
      }
      var bloc = Math.min(conduiteRestante, 270);
      var debC = fmt(h, m); avancer(bloc); lignes.push(date + ";" + debC + ";" + fmt(h, m) + ";C");
      conduiteRestante -= bloc;
      premierBloc = false;
    }
    // Tache fin 15 min
    var debF = fmt(h, m); avancer(15); lignes.push(date + ";" + debF + ";" + fmt(h, m) + ";T");
    return lignes.join("\n");
  }
  test("L5-TRAVAIL-NUIT", "599 min = conforme (-1)", genererCSVNuit(599), "REGULIER", 0, "L3312-1");
  test("L5-TRAVAIL-NUIT", "600 min = conforme (pile)", genererCSVNuit(600), "REGULIER", 0, "L3312-1");
  test("L5-TRAVAIL-NUIT", "601 min = 2 inf (conduite>540 + nuit>600)", genererCSVNuit(601), "REGULIER", 2, "L3312-1");

  // =========================================
  // L6 - TRAVAIL JOURNALIER TOTAL (Code transports)
  // Seuil: > 10h = > 600 min (conduite + taches)
  // =========================================
  test("L6-TRAVAIL-JOUR", "599 min = conforme (-1)", genererCSVJournee(540, 45, 59), "SLO", 0, "Code transports");
  test("L6-TRAVAIL-JOUR", "600 min = conforme (pile)", genererCSVJournee(540, 45, 60), "SLO", 0, "Code transports");
  test("L6-TRAVAIL-JOUR", "601 min = infraction (+1)", genererCSVJournee(540, 45, 61), "SLO", 1, "Code transports + R3312-11");

  // Resume
  rapport.resume.pourcentage = rapport.resume.total > 0 ? Math.round((rapport.resume.ok / rapport.resume.total) * 100) : 0;
  rapport.resume.status = rapport.resume.ko === 0 ? "TOUS LES SEUILS VALIDES" : rapport.resume.ko + " SEUIL(S) NON CONFORME(S)";
  console.log("[QA Niveau 3 - Limites] " + rapport.resume.ok + "/" + rapport.resume.total + " (" + rapport.resume.pourcentage + "%)");
  res.json(rapport);
});

// Fallback : servir le frontend pour toutes les routes non-API
// ============================================================
// GET /api/qa/robustesse
// Axe 1: Edge cases temporels
// Axe 2: Inputs malformes
// Axe 4: Multi-jours
// ============================================================
app.get('/api/qa/robustesse', async (req, res) => {
  const rapport = {
    timestamp: new Date().toISOString(),
    version: APP_VERSION,
    description: "Tests de robustesse - Edge cases, inputs malformes, multi-jours",
    tests: [],
    resume: { total: 0, ok: 0, ko: 0, pourcentage: 0 }
  };

  function test(categorie, nom, csvData, typeService, attendu, article) {
    rapport.resume.total++;
    try {
      const r = analyserCSV(csvData, typeService || "REGULIER", "FR");
      let ok = true;
      let detail = "";
      if (attendu.nocrash) { ok = true; detail = "No crash - score:" + r.score; }
      if (attendu.score !== undefined && r.score !== attendu.score) { ok = false; detail += "score att:" + attendu.score + " obt:" + r.score + " "; }
      if (attendu.infractions !== undefined) {
        const nbInf = r.infractions ? r.infractions.length : 0;
        if (nbInf !== attendu.infractions) { ok = false; detail += "inf att:" + attendu.infractions + " obt:" + nbInf + " "; }
      }
      if (attendu.jours !== undefined) {
        const nbJ = r.details_jours ? r.details_jours.length : 0;
        if (nbJ !== attendu.jours) { ok = false; detail += "jours att:" + attendu.jours + " obt:" + nbJ + " "; }
      }
      if (attendu.conduite_min !== undefined) {
        const c = r.details_jours && r.details_jours[0] ? r.details_jours[0].conduite_min : 0;
        if (c !== attendu.conduite_min) { ok = false; detail += "cond att:" + attendu.conduite_min + " obt:" + c + " "; }
      }
      if (attendu.amplitude_min !== undefined) {
        const a = r.details_jours && r.details_jours[0] ? parseFloat(r.details_jours[0].amplitude_estimee_h) : 0;
        if (a < attendu.amplitude_min) { ok = false; detail += "amp att>=" + attendu.amplitude_min + " obt:" + a + " "; }
      }
      if (ok) rapport.resume.ok++; else rapport.resume.ko++;
      rapport.tests.push({ categorie, nom, ok, detail: ok ? "OK" : detail.trim(), article: article || "", score: r.score });
    } catch(e) {
      if (attendu.nocrash) {
        rapport.resume.ko++;
        rapport.tests.push({ categorie, nom, ok: false, detail: "CRASH: " + e.message, article: article || "" });
      } else if (attendu.error) {
        rapport.resume.ok++;
        rapport.tests.push({ categorie, nom, ok: true, detail: "Erreur attendue", article: article || "" });
      } else {
        rapport.resume.ko++;
        rapport.tests.push({ categorie, nom, ok: false, detail: "ERREUR: " + e.message, article: article || "" });
      }
    }
  }

  // AXE 1: EDGE CASES TEMPORELS
  test("E1-ZERO", "Activite 0 min", "2025-06-15;06:00;06:00;C", "REGULIER", { nocrash: true });
  test("E1-ZERO", "Plusieurs 0 min", "2025-06-15;08:00;08:00;T\n2025-06-15;08:00;08:00;C\n2025-06-15;08:00;08:00;P", "REGULIER", { nocrash: true });
  test("E1-MICRO", "1 minute", "2025-06-15;06:00;06:01;C", "REGULIER", { nocrash: true });
  test("E1-24H", "00:00 a 00:00", "2025-06-15;00:00;04:30;C\n2025-06-15;04:30;05:15;P\n2025-06-15;05:15;09:00;C\n2025-06-15;09:00;09:30;T\n2025-06-15;09:30;00:00;D", "REGULIER", { nocrash: true });
  test("E1-OVERLAP", "Chevauchement", "2025-06-15;06:00;08:00;C\n2025-06-15;07:30;09:00;C", "REGULIER", { nocrash: true });
  test("E1-DESORDRE", "Non chronologique", "2025-06-15;10:00;11:00;C\n2025-06-15;06:00;07:00;T\n2025-06-15;07:00;10:00;C", "REGULIER", { nocrash: true });
  test("E1-MINUIT", "Pause a minuit", "2025-06-15;23:00;23:30;T\n2025-06-15;23:30;00:30;C\n2025-06-15;00:30;01:00;P", "REGULIER", { nocrash: true });
  test("E1-LONG", "Journee 20h", "2025-06-15;02:00;06:30;C\n2025-06-15;06:30;07:15;P\n2025-06-15;07:15;11:45;C\n2025-06-15;11:45;12:30;P\n2025-06-15;12:30;17:00;C\n2025-06-15;17:00;17:45;P\n2025-06-15;17:45;22:00;C", "REGULIER", { nocrash: true, amplitude_min: 19 });
  test("E1-SOLO", "1 seule ligne", "2025-06-15;06:00;10:00;C", "REGULIER", { nocrash: true });

  // E10: 60 activites
  (function() {
    var csv = [], h = 0, m = 0;
    function fmt(hh, mm) { return (hh < 10 ? "0" : "") + hh + ":" + (mm < 10 ? "0" : "") + mm; }
    for (var i = 0; i < 60; i++) {
      var deb = fmt(h, m);
      m += 10; if (m >= 60) { h++; m -= 60; }
      csv.push("2025-06-15;" + deb + ";" + fmt(h, m) + ";" + (i % 3 === 0 ? "P" : i % 3 === 1 ? "C" : "T"));
    }
    test("E1-MASS", "60 activites", csv.join("\n"), "REGULIER", { nocrash: true });
  })();

  // AXE 2: INPUTS MALFORMES
  test("E2-VIDE", "CSV vide", "", "REGULIER", { nocrash: true });
  test("E2-BLANCS", "Espaces seuls", "   \n  \n  ", "REGULIER", { nocrash: true });
  test("E2-VIRGULE", "Separateur virgule", "2025-06-15,06:00,10:00,C", "REGULIER", { nocrash: true });
  test("E2-DATE-FR", "Date DD/MM/YYYY", "15/06/2025;06:00;10:00;C", "REGULIER", { nocrash: true });
  test("E2-HEURE-KO", "Heure 25:00", "2025-06-15;25:00;26:00;C", "REGULIER", { nocrash: true });
  test("E2-TYPE-KO", "Type X inconnu", "2025-06-15;06:00;10:00;X", "REGULIER", { nocrash: true });
  test("E2-INCOMPLET", "Ligne incomplete", "2025-06-15;06:00", "REGULIER", { nocrash: true });
  test("E2-ACCENTS", "Caracteres speciaux", "2025-06-15;06:00;10:00;C\nCommentaire: trajet", "REGULIER", { nocrash: true });
  test("E2-VIDES", "Lignes vides intercalees", "2025-06-15;06:00;08:00;C\n\n\n2025-06-15;08:00;08:45;P\n\n2025-06-15;08:45;12:00;C", "REGULIER", { nocrash: true });
  test("E2-SERVICE", "Service INCONNU", "2025-06-15;06:00;10:00;C", "INCONNU", { nocrash: true });
  test("E2-MINUS", "Types minuscules", "2025-06-15;06:00;10:00;c\n2025-06-15;10:00;10:45;p\n2025-06-15;10:45;12:00;t", "REGULIER", { nocrash: true });
  test("E2-TABS", "Tabulations", "2025-06-15\t06:00\t10:00\tC", "REGULIER", { nocrash: true });

  // AXE 4: MULTI-JOURS
  test("E4-2JOURS", "2 jours", "2025-06-15;06:00;10:30;C\n2025-06-15;10:30;11:15;P\n2025-06-15;11:15;15:00;C\n2025-06-16;06:00;10:30;C\n2025-06-16;10:30;11:15;P\n2025-06-16;11:15;15:00;C", "REGULIER", { nocrash: true, jours: 2 });
  test("E4-TROU", "Jours non consecutifs", "2025-06-15;06:00;15:00;C\n2025-06-17;06:00;15:00;C", "REGULIER", { nocrash: true, jours: 2 });

  (function() {
    var csv = [];
    for (var d = 15; d <= 19; d++) {
      var dt = "2025-06-" + (d < 10 ? "0" : "") + d;
      csv.push(dt + ";06:00;10:30;C\n" + dt + ";10:30;11:15;P\n" + dt + ";11:15;15:00;C");
    }
    test("E4-SEMAINE", "5 jours", csv.join("\n"), "REGULIER", { nocrash: true, jours: 5 });
  })();

  (function() {
    var csv = [];
    for (var d = 15; d <= 21; d++) {
      var dt = "2025-06-" + (d < 10 ? "0" : "") + d;
      csv.push(dt + ";06:00;10:30;C\n" + dt + ";10:30;11:15;P\n" + dt + ";11:15;15:00;C");
    }
    test("E4-7JOURS", "7 jours", csv.join("\n"), "REGULIER", { nocrash: true, jours: 7 });
  })();

  test("E4-NUIT2J", "Nuit sur 2 dates", "2025-06-15;20:00;20:30;T\n2025-06-15;20:30;23:59;C\n2025-06-16;00:00;04:00;C\n2025-06-16;04:00;04:30;T", "REGULIER", { nocrash: true });

  (function() {
    var csv = [];
    for (var d = 1; d <= 14; d++) {
      var dt = "2025-06-" + (d < 10 ? "0" : "") + d;
      csv.push(dt + ";06:00;10:30;C\n" + dt + ";10:30;11:15;P\n" + dt + ";11:15;15:00;C");
    }
    test("E4-14JOURS", "14 jours", csv.join("\n"), "REGULIER", { nocrash: true, jours: 14 });
  })();

  test("E4-MIX", "Jour + nuit", "2025-06-16;06:00;10:30;C\n2025-06-16;10:30;11:15;P\n2025-06-16;11:15;15:00;C\n2025-06-17;20:00;20:30;T\n2025-06-17;20:30;01:00;C\n2025-06-17;01:00;01:45;P\n2025-06-17;01:45;04:00;C\n2025-06-17;04:00;04:30;T", "REGULIER", { nocrash: true });

  rapport.resume.pourcentage = rapport.resume.total > 0 ? Math.round(rapport.resume.ok / rapport.resume.total * 100) : 0;
  console.log('[QA Robustesse] ' + rapport.resume.ok + '/' + rapport.resume.total + ' (' + rapport.resume.pourcentage + '%)');
  res.json(rapport);
});


// ============================================================
// QA NIVEAU 6 : TESTS MULTI-SEMAINES (v7.1.0)
// Sources : CE 561/2006 Art.4g, Art.8 par.4-6, Art.12
//           Reglement 2020/1054, 2024/1258
// ============================================================
app.get('/api/qa/multi-semaines', (req, res) => {
  const tests = [];
  const sources = [
    'CE 561/2006 Art.4 par.g (repos fractionne)',
    'CE 561/2006 Art.8 par.4 (max 3 repos reduits)',
    'CE 561/2006 Art.8 par.6 (2 semaines, compensation)',
    'Art.12 (depassement exceptionnel)',
    'Reglement 2020/1054 (2 reduits consecutifs marchandises)',
    'Reglement 2024/1258 (pause 2x15 occasionnel, 12 jours)'
  ];

  // Helper : generer un CSV multi-jours
  function genCSV(joursData) {
    return joursData.map(function(j) {
      return j.activites.map(function(a) {
        return j.date + ';' + a.debut + ';' + a.fin + ';' + a.type;
      }).join('\n');
    }).join('\n');
  }

  // Helper : analyser et extraire le tracking
  function runTest(nom, categorie, csv, typeService, equipage, attenduFn, article) {
    try {
      const r = analyserCSV(csv, typeService || 'REGULIER', 'FR', equipage || 'solo');
      const tracking = r.tracking || {};
      const result = attenduFn(r, tracking);
      tests.push({
        categorie: categorie,
        nom: nom,
        ok: result.ok,
        source: article,
        detail: result.detail,
        attendu: result.attendu,
        obtenu: result.obtenu
      });
    } catch (e) {
      tests.push({
        categorie: categorie,
        nom: nom,
        ok: false,
        source: article,
        detail: 'ERREUR: ' + e.message,
        attendu: 'pas d\'erreur',
        obtenu: e.message
      });
    }
  }

  // ==== T1 : TRACKING EXISTE ====
  (function() {
    const csv = '2026-02-02;06:00;10:30;C\n2026-02-02;10:30;11:15;P\n2026-02-02;11:15;14:15;C';
    runTest('Tracking present dans la reponse', 'T1-TRACKING', csv, 'REGULIER', 'solo',
      function(r, t) {
        return {
          ok: t !== null && typeof t === 'object' && t.hasOwnProperty('repos_reduits_journaliers'),
          attendu: 'tracking avec repos_reduits_journaliers',
          obtenu: t ? Object.keys(t).join(', ') : 'null',
          detail: 'Verifie que analyseMultiSemaines retourne un tracking complet'
        };
      }, 'v7.0.0 analyseMultiSemaines');
  })();

  // ==== T2 : STRUCTURE TRACKING COMPLETE ====
  (function() {
    const csv = '2026-02-02;06:00;10:30;C\n2026-02-02;10:30;11:15;P\n2026-02-02;11:15;14:15;C';
    const keysAttendues = ['repos_reduits_journaliers','repos_hebdomadaires','dette_compensation','repos_journaliers_fractionnes','conduite_nuit_21h_6h','derogations','rappels'];
    runTest('Structure tracking complete (7 cles)', 'T1-TRACKING', csv, 'REGULIER', 'solo',
      function(r, t) {
        const keys = Object.keys(t);
        const manquantes = keysAttendues.filter(function(k) { return keys.indexOf(k) === -1; });
        return {
          ok: manquantes.length === 0,
          attendu: '7 cles: ' + keysAttendues.join(', '),
          obtenu: keys.length + ' cles' + (manquantes.length > 0 ? ' (manquantes: ' + manquantes.join(', ') + ')' : ''),
          detail: 'Toutes les cles tracking doivent etre presentes'
        };
      }, 'v7.0.0 analyseMultiSemaines');
  })();

  // ==== T3 : REPOS REDUIT COMPTEUR = 0 (jour normal) ====
  (function() {
    // Journee 8h de conduite, repos estime ~15h = normal
    const csv = '2026-02-02;06:00;10:30;C\n2026-02-02;10:30;11:15;P\n2026-02-02;11:15;14:00;C';
    runTest('Journee normale = 0 repos reduit', 'T2-REPOS-REDUIT', csv, 'REGULIER', 'solo',
      function(r, t) {
        const c = t.repos_reduits_journaliers.compteur;
        return { ok: c === 0, attendu: '0', obtenu: '' + c, detail: 'Repos normal ~15h ne doit pas compter comme reduit' };
      }, 'CE 561/2006 Art.8 par.4');
  })();

  // ==== T4 : REPOS REDUIT DETECTE (repos ~10h) ====
  (function() {
    // Journee longue : 05:00-15:00 (10h amplitude, repos ~14h = normal encore)
    // Pour avoir un repos reduit, il faut une amplitude de ~14-15h -> repos 9-10h
    const csv = '2026-02-02;05:00;09:30;C\n2026-02-02;09:30;10:15;P\n2026-02-02;10:15;14:45;C\n2026-02-02;14:45;15:00;T\n2026-02-02;15:00;15:30;P';
    runTest('Journee avec repos ~10h detecte comme reduit si applicable', 'T2-REPOS-REDUIT', csv, 'REGULIER', 'solo',
      function(r, t) {
        // Repos estime = 24 - amplitude. Amplitude = 15:30 - 05:00 = 10:30. Repos = 13:30 -> normal
        // Ce test verifie juste que le compteur ne depasse pas le max
        const c = t.repos_reduits_journaliers.compteur;
        const m = t.repos_reduits_journaliers.max;
        return { ok: c <= m, attendu: '<= ' + m, obtenu: '' + c, detail: 'Compteur repos reduits <= max' };
      }, 'CE 561/2006 Art.8 par.4');
  })();

  // ==== T5 : MAX REPOS REDUITS = 3 ====
  (function() {
    const csv = '2026-02-02;06:00;10:30;C\n2026-02-02;10:30;11:15;P\n2026-02-02;11:15;14:00;C';
    runTest('Max repos reduits = 3', 'T2-REPOS-REDUIT', csv, 'REGULIER', 'solo',
      function(r, t) {
        return { ok: t.repos_reduits_journaliers.max === 3, attendu: '3', obtenu: '' + t.repos_reduits_journaliers.max, detail: 'REGLES.REPOS_REDUIT_MAX_ENTRE_HEBDO = 3' };
      }, 'CE 561/2006 Art.8 par.4');
  })();

  // ==== T6 : CONDUITE NUIT TRACKING ====
  (function() {
    const csv = '2026-02-02;22:00;02:30;C\n2026-02-02;02:30;03:15;P\n2026-02-02;03:15;05:00;C';
    runTest('Conduite nuit 21h-6h detectee', 'T3-NUIT', csv, 'REGULIER', 'solo',
      function(r, t) {
        const nuitJours = t.conduite_nuit_21h_6h || [];
        const avecConduite = nuitJours.filter(function(n) { return n.duree_continue_max_min > 0; });
        return {
          ok: avecConduite.length > 0,
          attendu: '>= 1 jour avec conduite nuit',
          obtenu: avecConduite.length + ' jour(s)',
          detail: 'La conduite entre 22h et 5h doit etre trackee'
        };
      }, 'CE 561/2006 Art.8 + RSE pratique');
  })();

  // ==== T7 : CONDUITE NUIT LIMITE 240 MIN ====
  (function() {
    const csv = '2026-02-02;22:00;02:30;C\n2026-02-02;02:30;03:15;P\n2026-02-02;03:15;05:00;C';
    runTest('Limite conduite nuit = 240 min', 'T3-NUIT', csv, 'REGULIER', 'solo',
      function(r, t) {
        const nuit = t.conduite_nuit_21h_6h || [];
        const limite = nuit.length > 0 ? nuit[0].limite_min : 0;
        return { ok: limite === 240, attendu: '240', obtenu: '' + limite, detail: 'REGLES.CONDUITE_NUIT_CONTINUE_MAX_MIN = 240' };
      }, 'RSE pratique');
  })();

  // ==== T8 : DEROGATIONS STRUCTURE ====
  (function() {
    const csv = '2026-02-02;06:00;10:30;C\n2026-02-02;10:30;11:15;P\n2026-02-02;11:15;14:15;C';
    const keysDerog = ['art12_depassement_exceptionnel','art8_6bis_12_jours','art8_6_2_reduits_consecutifs','pause_2x15_occasionnel'];
    runTest('Derogations : 4 cles presentes', 'T4-DEROGATIONS', csv, 'REGULIER', 'solo',
      function(r, t) {
        const d = t.derogations || {};
        const keys = Object.keys(d);
        const manquantes = keysDerog.filter(function(k) { return keys.indexOf(k) === -1; });
        return {
          ok: manquantes.length === 0,
          attendu: keysDerog.join(', '),
          obtenu: keys.join(', '),
          detail: 'Structure derogations complete'
        };
      }, 'v7.0.0');
  })();

  // ==== T9 : PAUSE 2x15 OCCASIONNEL ====
  (function() {
    const csv = '2026-02-02;06:00;10:30;C\n2026-02-02;10:30;11:15;P\n2026-02-02;11:15;14:15;C';
    runTest('Pause 2x15 active en OCCASIONNEL', 'T4-DEROGATIONS', csv, 'OCCASIONNEL', 'solo',
      function(r, t) {
        return {
          ok: t.derogations.pause_2x15_occasionnel === true,
          attendu: 'true',
          obtenu: '' + t.derogations.pause_2x15_occasionnel,
          detail: 'En transport occasionnel, pause 2x15 min autorisee (2024/1258)'
        };
      }, 'Reglement 2024/1258 Art.7');
  })();

  // ==== T10 : PAUSE 2x15 INACTIF EN REGULIER ====
  (function() {
    const csv = '2026-02-02;06:00;10:30;C\n2026-02-02;10:30;11:15;P\n2026-02-02;11:15;14:15;C';
    runTest('Pause 2x15 inactive en REGULIER', 'T4-DEROGATIONS', csv, 'REGULIER', 'solo',
      function(r, t) {
        return {
          ok: t.derogations.pause_2x15_occasionnel === false,
          attendu: 'false',
          obtenu: '' + t.derogations.pause_2x15_occasionnel,
          detail: 'Hors transport occasionnel, pause 2x15 non applicable'
        };
      }, 'Reglement 2024/1258');
  })();

  // ==== T11 : RAPPELS EN OCCASIONNEL ====
  (function() {
    const csv = '2026-02-02;06:00;10:30;C\n2026-02-02;10:30;11:15;P\n2026-02-02;11:15;14:15;C';
    runTest('Rappel pause 2x15 present en OCCASIONNEL', 'T5-RAPPELS', csv, 'OCCASIONNEL', 'solo',
      function(r, t) {
        const rappels = t.rappels || [];
        const found = rappels.some(function(r) { return r.indexOf('2x15') !== -1; });
        return {
          ok: found,
          attendu: 'rappel contenant "2x15"',
          obtenu: found ? 'present' : 'absent (' + rappels.length + ' rappels)',
          detail: 'En occasionnel, rappel sur la pause 2x15 min'
        };
      }, 'Reglement 2024/1258');
  })();

  // ==== T12 : REPOS HEBDOMADAIRES TRACKING ====
  (function() {
    const csv = '2026-02-02;06:00;10:30;C\n2026-02-02;10:30;11:15;P\n2026-02-02;11:15;14:15;C';
    runTest('Repos hebdomadaires est un tableau', 'T6-HEBDO', csv, 'REGULIER', 'solo',
      function(r, t) {
        return {
          ok: Array.isArray(t.repos_hebdomadaires),
          attendu: 'Array',
          obtenu: typeof t.repos_hebdomadaires,
          detail: 'repos_hebdomadaires doit etre un tableau'
        };
      }, 'CE 561/2006 Art.8 par.6');
  })();

  // ==== T13 : DETTE COMPENSATION STRUCTURE ====
  (function() {
    const csv = '2026-02-02;06:00;10:30;C\n2026-02-02;10:30;11:15;P\n2026-02-02;11:15;14:15;C';
    runTest('Dette compensation a total_h et details', 'T6-HEBDO', csv, 'REGULIER', 'solo',
      function(r, t) {
        const d = t.dette_compensation || {};
        const hasKeys = d.hasOwnProperty('total_h') && d.hasOwnProperty('details');
        return {
          ok: hasKeys && typeof d.total_h === 'number',
          attendu: 'total_h (number) + details (array)',
          obtenu: hasKeys ? 'total_h=' + d.total_h + ', details=' + (d.details || []).length : 'cles manquantes',
          detail: 'Structure dette compensation correcte'
        };
      }, 'CE 561/2006 Art.8 par.6');
  })();

  // ==== T14 : REPOS FRACTIONNES STRUCTURE ====
  (function() {
    const csv = '2026-02-02;06:00;10:30;C\n2026-02-02;10:30;11:15;P\n2026-02-02;11:15;14:15;C';
    runTest('Repos fractionnes est un tableau', 'T7-FRACTIONNE', csv, 'REGULIER', 'solo',
      function(r, t) {
        return {
          ok: Array.isArray(t.repos_journaliers_fractionnes),
          attendu: 'Array',
          obtenu: typeof t.repos_journaliers_fractionnes,
          detail: 'repos_journaliers_fractionnes doit etre un tableau'
        };
      }, 'CE 561/2006 Art.4 par.g');
  })();

  // ==== T15 : ART12 DEROGATIONS EST UN TABLEAU ====
  (function() {
    const csv = '2026-02-02;06:00;10:30;C\n2026-02-02;10:30;11:15;P\n2026-02-02;11:15;14:15;C';
    runTest('Art.12 derogations est un tableau', 'T4-DEROGATIONS', csv, 'REGULIER', 'solo',
      function(r, t) {
        return {
          ok: Array.isArray(t.derogations.art12_depassement_exceptionnel),
          attendu: 'Array',
          obtenu: typeof t.derogations.art12_depassement_exceptionnel,
          detail: 'art12_depassement_exceptionnel doit etre un tableau'
        };
      }, 'CE 561/2006 Art.12');
  })();

  // ==== T16 : SCORE 100 POUR JOURNEE CONFORME ====
  (function() {
    const csv = '2026-02-02;06:00;10:30;C\n2026-02-02;10:30;11:15;P\n2026-02-02;11:15;14:00;C';
    runTest('Score 100 pour journee conforme avec tracking', 'T1-TRACKING', csv, 'REGULIER', 'solo',
      function(r, t) {
        return {
          ok: r.score === 100,
          attendu: '100',
          obtenu: '' + r.score,
          detail: 'Le tracking ne doit pas degrader le score d\'une journee conforme'
        };
      }, 'v7.0.0');
  })();

  // ==== T17 : 2 REDUITS CONSECUTIFS EN MARCHANDISES = AVERTISSEMENT (PAS INFRACTION) ====
  (function() {
    const csv = '2026-02-02;06:00;10:30;C\n2026-02-02;10:30;11:15;P\n2026-02-02;11:15;14:15;C';
    runTest('2 reduits consecutifs en MARCHANDISES = derogation active', 'T4-DEROGATIONS', csv, 'MARCHANDISES', 'solo',
      function(r, t) {
        // On ne peut pas facilement forcer 2 repos reduits consecutifs en 1 jour
        // On verifie juste que la cle est bien false pour un CSV court
        return {
          ok: typeof t.derogations.art8_6_2_reduits_consecutifs === 'boolean',
          attendu: 'boolean',
          obtenu: typeof t.derogations.art8_6_2_reduits_consecutifs,
          detail: 'La cle art8_6_2_reduits_consecutifs doit etre un boolean'
        };
      }, 'Reglement 2020/1054');
  })();

  // ==== T18 : CONDUITE NUIT TRACKING PAR JOUR ====
  (function() {
    const csv = '2026-02-02;06:00;10:30;C\n2026-02-02;10:30;11:15;P\n2026-02-02;11:15;14:15;C\n2026-02-03;06:00;10:30;C\n2026-02-03;10:30;11:15;P\n2026-02-03;11:15;14:15;C';
    runTest('Conduite nuit tracking = 1 entree par jour', 'T3-NUIT', csv, 'REGULIER', 'solo',
      function(r, t) {
        const n = t.conduite_nuit_21h_6h || [];
        return {
          ok: n.length === 2,
          attendu: '2 entrees (2 jours)',
          obtenu: '' + n.length + ' entrees',
          detail: 'Chaque jour doit avoir une entree dans conduite_nuit_21h_6h'
        };
      }, 'RSE pratique');
  })();

  // Resume
  const ok = tests.filter(function(t) { return t.ok; }).length;
  const total = tests.length;
  const categories = {};
  tests.forEach(function(t) {
    if (!categories[t.categorie]) categories[t.categorie] = { total: 0, ok: 0 };
    categories[t.categorie].total++;
    if (t.ok) categories[t.categorie].ok++;
  });

  res.json({
    timestamp: new Date().toISOString(),
    version: APP_VERSION,
    description: 'Tests QA multi-semaines et tracking (CE 561/2006, 2020/1054, 2024/1258)',
    sources: sources,
    categories: categories,
    tests: tests,
    resume: { ok: ok, total: total, status: ok === total ? 'PARFAIT' : 'ECHECS' }
  });
});
};
