var http = require('http');

var csv = [
  '2026-02-10;05:00;05:15;T',
  '2026-02-10;05:15;09:45;C',
  '2026-02-10;09:45;10:30;P',
  '2026-02-10;10:30;15:30;C',
  '2026-02-10;15:30;15:45;T',
  '2026-02-11;04:00;04:15;T',
  '2026-02-11;04:15;08:45;C',
  '2026-02-11;08:45;09:30;P',
  '2026-02-11;09:30;14:00;C',
  '2026-02-11;14:00;14:15;T',
  '2026-02-12;06:00;06:15;T',
  '2026-02-12;06:15;10:45;C',
  '2026-02-12;10:45;11:30;P',
  '2026-02-12;11:30;16:00;C',
  '2026-02-12;16:00;16:15;T'
].join('\n');

var body = JSON.stringify({
  csv: csv,
  typeService: 'SLO',
  pays: 'FR',
  equipage: 'solo'
});

var req = http.request({
  hostname: 'localhost',
  port: 3001,
  path: '/api/analyze',
  method: 'POST',
  headers: { 'Content-Type': 'application/json' }
}, function(res) {
  var data = '';
  res.on('data', function(c) { data += c; });
  res.on('end', function() {
    var r = JSON.parse(data);
    console.log('=== SCORE ===');
    console.log(r.score);
    console.log('\n=== CLES RACINE ===');
    console.log(Object.keys(r).join(', '));
    console.log('\n=== NB INFRACTIONS ===');
    console.log(r.infractions ? r.infractions.length : 'absent');
    console.log('\n=== NB JOURS ===');
    console.log(r.jours ? r.jours.length : 'absent');
    if (r.jours && r.jours.length > 0) {
      console.log('\n=== CLES JOUR[0] ===');
      console.log(Object.keys(r.jours[0]).join(', '));
      console.log('\n=== JOUR[0] DATE ===');
      console.log(r.jours[0].date);
      console.log('\n=== JOUR[0] ACTIVITES (3 premieres) ===');
      if (r.jours[0].activites) {
        r.jours[0].activites.slice(0, 3).forEach(function(a, i) {
          console.log('  A' + i + ': ' + JSON.stringify(a));
        });
      }
      console.log('\n=== JOUR[0] INFRACTIONS ===');
      var inf = r.jours[0].infractions || r.jours[0].infractionsJour;
      if (inf) {
        console.log('nb: ' + inf.length);
        if (inf.length > 0) console.log('  INF[0]: ' + JSON.stringify(inf[0]).substring(0, 200));
      } else {
        console.log('absent dans jours[0]');
        console.log('cles dispo: ' + Object.keys(r.jours[0]).join(', '));
      }
      console.log('\n=== JOUR[0] STATS ===');
      var j = r.jours[0];
      ['conduite', 'travail', 'pause', 'repos', 'amplitude', 'conduiteMinutes', 'amplitudeMinutes'].forEach(function(k) {
        if (j[k] !== undefined) console.log('  ' + k + ': ' + JSON.stringify(j[k]));
      });
    }
    if (r.synthese || r.resume || r.hebdomadaire) {
      console.log('\n=== SYNTHESE/RESUME ===');
      console.log(JSON.stringify(r.synthese || r.resume || r.hebdomadaire).substring(0, 300));
    }
    console.log('\n=== INFRACTION[0] STRUCTURE ===');
    if (r.infractions && r.infractions.length > 0) {
      console.log(JSON.stringify(r.infractions[0]).substring(0, 300));
    }
  });
});

req.write(body);
req.end();
