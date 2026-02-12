// qa_check.js - Verification rapide QA (utilise resume.ok/resume.total)
const http = require("http");

function get(path) {
  return new Promise((resolve, reject) => {
    http.get("http://localhost:3001" + path, { timeout: 10000 }, (res) => {
      let data = "";
      res.on("data", (chunk) => data += chunk);
      res.on("end", () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(new Error("JSON parse error: " + data.substring(0, 100))); }
      });
    }).on("error", reject);
  });
}

async function main() {
  const endpoints = [
    { name: "N1", path: "/api/qa" },
    { name: "N2", path: "/api/qa/cas-reels" },
    { name: "N3", path: "/api/qa/limites" },
    { name: "N4", path: "/api/qa/robustesse" },
    { name: "N5", path: "/api/qa/avance" }
  ];

  let totalOk = 0, totalAll = 0;
  const details = [];

  for (const ep of endpoints) {
    try {
      const r = await get(ep.path);
      // N5 utilise passed/total, N1-N4 utilisent resume.ok/resume.total
      const ok = r.resume ? r.resume.ok : (r.passed || 0);
      const total = r.resume ? r.resume.total : (r.total || 0);
      totalOk += ok;
      totalAll += total;
      details.push(ep.name + ":" + ok + "/" + total);
    } catch (e) {
      details.push(ep.name + ":ERREUR(" + e.message.substring(0, 40) + ")");
    }
  }

  console.log("QA: " + totalOk + "/" + totalAll + " (" + details.join(" ") + ")");
  process.exit(totalOk === totalAll ? 0 : 1);
}

main().catch(e => { console.error("FATAL:", e.message); process.exit(1); });