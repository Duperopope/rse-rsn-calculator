const fs = require('fs');
const path = require('path');

function normalizeDays(value, fallback) { return Math.min(Math.max(Number(value) || fallback, 1), 3650); }

function purgeFeedback(dataDir, retentionDays) {
  const file = path.join(dataDir, 'feedback.ndjson');
  const days = normalizeDays(retentionDays, 365);
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  if (!fs.existsSync(file)) return { removed: 0, kept: 0, retentionDays: days };
  const kept = []; let removed = 0;
  for (const line of fs.readFileSync(file, 'utf8').split('\n').filter(Boolean)) {
    try {
      const row = JSON.parse(line); const timestamp = Date.parse(row.createdAt);
      if (Number.isFinite(timestamp) && timestamp < cutoff) removed += 1; else kept.push(line);
    } catch (_) { kept.push(line); }
  }
  const temporary = file + '.maintenance';
  fs.writeFileSync(temporary, kept.length ? kept.join('\n') + '\n' : '', { mode: 0o600 });
  fs.renameSync(temporary, file);
  return { removed, kept: kept.length, retentionDays: days };
}

function runMaintenance(authStore, secureStore, dataDir, tachographStore) {
  const analysisDays = normalizeDays(process.env.FIMO_ANALYSIS_RETENTION_DAYS, 365);
  const feedbackDays = normalizeDays(process.env.FIMO_FEEDBACK_RETENTION_DAYS, 365);
  const auditDays = normalizeDays(process.env.FIMO_AUDIT_RETENTION_DAYS, 730);
  const tachographDays = normalizeDays(process.env.FIMO_TACHOGRAPH_RETENTION_DAYS, 90);
  return {
    ranAt: new Date().toISOString(),
    sessionsRemoved: authStore.purgeExpiredSessions(),
    audit: authStore.purgeAuditEvents(auditDays),
    analyses: secureStore.purgeExpiredAnalyses(analysisDays),
    feedback: purgeFeedback(dataDir, feedbackDays),
    tachographImports: tachographStore
      ? tachographStore.purgeExpiredImports(tachographDays)
      : { removed: 0, retentionDays: tachographDays, skipped: true }
  };
}

module.exports = { purgeFeedback, runMaintenance };
