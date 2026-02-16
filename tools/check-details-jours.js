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

    console.log('=== DETAILS_JOURS TYPE ===');
    console.log(typeof r.details_jours);
    console.log('isArray: ' + Array.isArray(r.details_jours));

    if (Array.isArray(r.details_jours) && r.details_jours.length > 0) {
      console.log('nb jours: ' + r.details_jours.length);
      console.log('\n=== CLES JOUR[0] ===');
      console.log(Object.keys(r.details_jours[0]).join(', '));
      console.log('\n=== JOUR[0] COMPLET ===');
      var j0 = r.details_jours[0];
      Object.keys(j0).forEach(function(k) {
        var v = j0[k];
        var s = JSON.stringify(v);
        if (s && s.length > 200) s = s.substring(0, 200) + '...';
        console.log('  ' + k + ': ' + s);
      });

      console.log('\n=== JOUR[0] ACTIVITES ===');
      if (j0.activites) {
        console.log('nb activites: ' + j0.activites.length);
        j0.activites.slice(0, 3).forEach(function(a, i) {
          console.log('  A' + i + ': ' + JSON.stringify(a));
        });
      } else if (j0.periodes) {
        console.log('nb periodes: ' + j0.periodes.length);
        j0.periodes.slice(0, 3).forEach(function(p, i) {
          console.log('  P' + i + ': ' + JSON.stringify(p));
        });
      } else {
        console.log('pas de activites ni periodes');
      }

      if (r.details_jours.length > 1) {
        console.log('\n=== JOUR[1] CLES ===');
        console.log(Object.keys(r.details_jours[1]).join(', '));
      }
    } else if (typeof r.details_jours === 'object' && !Array.isArray(r.details_jours)) {
      console.log('cest un objet, cles: ' + Object.keys(r.details_jours).join(', '));
      var firstKey = Object.keys(r.details_jours)[0];
      if (firstKey) {
        console.log('\n=== PREMIERE CLE: ' + firstKey + ' ===');
        var val = r.details_jours[firstKey];
        console.log('type: ' + typeof val);
        if (typeof val === 'object') {
          console.log('cles: ' + Object.keys(val).join(', '));
          Object.keys(val).forEach(function(k) {
            var s = JSON.stringify(val[k]);
            if (s && s.length > 200) s = s.substring(0, 200) + '...';
            console.log('  ' + k + ': ' + s);
          });
        }
      }
    }

    console.log('\n=== STATISTIQUES ===');
    if (r.statistiques) {
      console.log(JSON.stringify(r.statistiques).substring(0, 500));
    }

    console.log('\n=== TRACKING ===');
    if (r.tracking) {
      console.log(JSON.stringify(r.tracking).substring(0, 500));
    }
  });
});

req.write(body);
req.end();
