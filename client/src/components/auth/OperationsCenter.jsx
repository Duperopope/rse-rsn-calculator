import React, { useCallback, useEffect, useState } from "react";
import { API_URL } from "../../config/constants.js";
import { useModalDialog } from "./useModalDialog.js";
import styles from "./OperationsCenter.module.css";
import { useI18n } from "../../platform/i18n/I18nProvider.jsx";

function duration(seconds, t) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return days ? t("operations.duration.days", { days, hours }) : hours ? t("operations.duration.hours", { hours, minutes }) : t("operations.duration.minutes", { minutes });
}
function bytes(bytes, t, formatNumber) {
  if (!bytes) return t("operations.bytes.zero");
  if (bytes < 1024 * 1024) return t("operations.bytes.kb", { value: formatNumber(Math.round(bytes / 1024)) });
  return t("operations.bytes.mb", { value: formatNumber(bytes / 1024 / 1024, { maximumFractionDigits: 1 }) });
}

function State({ ok, children }) {
  return <span className={ok ? styles.ok : styles.warning}><i />{children}</span>;
}

export function OperationsCenter({ open, onClose }) {
  const { t, formatDate, formatNumber } = useI18n();
  const date = value => value ? formatDate(new Date(value), { dateStyle: "medium", timeStyle: "short" }) : t("operations.never");
  const dialogRef = useModalDialog(open, onClose);
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    setError("");
    try {
      const response = await fetch(API_URL + "/admin/control-room");
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || t("operations.readError"));
      setData(payload);
    } catch (requestError) { setError(requestError.message); }
  }, [t]);
  useEffect(() => { if (open) load(); }, [open, load]);
  if (!open) return null;

  async function runMaintenance() {
    setBusy(true);
    setError("");
    try {
      const response = await fetch(API_URL + "/admin/maintenance", { method: "POST" });
      if (!response.ok) throw new Error(t("operations.maintenanceError"));
      await load();
    } catch (requestError) { setError(requestError.message); }
    finally { setBusy(false); }
  }

  return (
    <div className={styles.backdrop} onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section ref={dialogRef} className={styles.dialog} role="dialog" aria-modal="true" aria-labelledby="operations-title">
        <header className={styles.header}>
          <div>
            <p>{t("operations.kicker")}</p>
            <h2 id="operations-title">{t("operations.title")}</h2>
            <span>{t("operations.subtitle")}</span>
          </div>
          <div className={styles.headerActions}>
            <button onClick={load} disabled={busy}>{t("operations.refresh")}</button>
            <button className={styles.close} aria-label={t("operations.close")} onClick={onClose}>×</button>
          </div>
        </header>

        {error ? <p className={styles.error} role="alert">{error}</p> : null}
        {!data ? <div className={styles.loading}>{t("operations.loading")}</div> : (
          <>
            <div className={styles.statusRail} aria-label={t("operations.criticalState")}>
              <State ok={data.application.status === "operational"}>{t("operations.status.application")}</State>
              <State ok={data.security.audit.ok}>{t("operations.status.audit")}</State>
              <State ok={Boolean(data.quality)}>{t("operations.status.quality")}</State>
              <State ok={Boolean(data.backup.lastRestore)}>{t("operations.status.restore")}</State>
              <time dateTime={data.generatedAt}>{t("operations.measured", { date: date(data.generatedAt) })}</time>
            </div>

            {data.alerts.length ? (
              <section className={styles.alerts} aria-labelledby="alerts-title">
                <div className={styles.sectionTitle}><h3 id="alerts-title">{t("operations.alertsTitle")}</h3><span>{t("operations.alertCount", { count: data.alerts.length })}</span></div>
                <div className={styles.alertGrid}>
                  {data.alerts.map((alert) => <article key={alert.code} data-severity={alert.severity}><strong>{t(`operations.alerts.${alert.code}`)}</strong><small>{alert.code}</small></article>)}
                </div>
              </section>
            ) : null}

            <div className={styles.columns}>
              <section className={styles.panel}>
                <div className={styles.sectionTitle}><h3>{t("operations.runtime.title")}</h3><span>{t("operations.runtime.source")}</span></div>
                <dl className={styles.facts}>
                  <div><dt>{t("operations.runtime.version")}</dt><dd>v{data.application.version}</dd></div>
                  <div><dt>{t("operations.runtime.environment")}</dt><dd>{data.application.environment}</dd></div>
                  <div><dt>{t("operations.runtime.uptime")}</dt><dd>{duration(data.application.uptimeSeconds, t)}</dd></div>
                  <div><dt>{t("operations.runtime.database")}</dt><dd>{bytes(data.storage.databaseBytes, t, formatNumber)}</dd></div>
                </dl>
              </section>

              <section className={styles.panel}>
                <div className={styles.sectionTitle}><h3>{t("operations.usage.title")}</h3><span>{t("operations.usage.source")}</span></div>
                <div className={styles.metricGrid}>
                  <article><strong>{data.metrics.accounts.active}</strong><span>{t("operations.usage.accounts")}</span></article>
                  <article><strong>{data.metrics.usage.analysesTotal}</strong><span>{t("operations.usage.analyses")}</span></article>
                  <article><strong>{data.metrics.usage.analysesLast30Days}</strong><span>{t("operations.usage.analyses30")}</span></article>
                  <article><strong>{data.metrics.usage.successfulLoginsLast30Days}</strong><span>{t("operations.usage.logins30")}</span></article>
                </div>
                <p className={styles.noChart}>{t("operations.usage.noChart")}</p>
              </section>

              <section className={styles.panel}>
                <div className={styles.sectionTitle}><h3>{t("operations.security.title")}</h3><span>{t("operations.security.source")}</span></div>
                <ul className={styles.checks}>
                  <li><State ok={data.security.dataEncryption}>{t("operations.security.encryption")}</State></li>
                  <li><State ok={data.security.audit.ok}>{t("operations.security.audit", { count: data.security.audit.count })}</State></li>
                  <li><State ok={data.security.backupEncryptionConfigured}>{t("operations.security.backupKey")}</State></li>
                  <li><State ok={data.security.httpsOriginsConfigured}>{t("operations.security.origins")}</State></li>
                </ul>
              </section>

              <section className={styles.panel}>
                <div className={styles.sectionTitle}><h3>{t("operations.backup.title")}</h3><span>{t("operations.backup.source")}</span></div>
                <dl className={styles.facts}>
                  <div><dt>{t("operations.backup.lastBackup")}</dt><dd>{date(data.backup.lastBackup?.createdAt)}</dd></div>
                  <div><dt>{t("operations.backup.lastRestore")}</dt><dd>{date(data.backup.lastRestore?.restoredAt)}</dd></div>
                  <div><dt>{t("operations.backup.lastMaintenance")}</dt><dd>{date(data.maintenance.lastRun?.ranAt)}</dd></div>
                </dl>
                <button className={styles.action} onClick={runMaintenance} disabled={busy}>{busy ? t("operations.backup.running") : t("operations.backup.run")}</button>
              </section>
            </div>

            <section className={styles.quality}>
              <div className={styles.sectionTitle}><h3>{t("operations.quality.title")}</h3><span>{data.quality ? date(data.quality.generatedAt) : t("operations.quality.absent")}</span></div>
              {data.quality ? (
                <>
                  <div className={styles.qualityGrid}>
                    {Object.entries(data.quality.results).map(([name, result]) => (
                      <article key={name}><strong>{result.passed}/{result.total}</strong><span>{t(`operations.quality.gates.${name}`)}</span></article>
                    ))}
                  </div>
                  <p>{t("operations.quality.evidence")} <code>{data.quality.evidenceSha256.slice(0, 20)}</code> · {t("operations.quality.limit")}</p>
                </>
              ) : <p>{t("operations.quality.runPrefix")} <code>npm run verify</code> {t("operations.quality.runSuffix")}</p>}
            </section>

            <footer className={styles.economics}>
              <span>{t("operations.economics.title")}</span>
              <strong>{formatNumber(data.metrics.economics.revenueGrossCents / 100, { style: "currency", currency: data.metrics.economics.currency })}</strong>
              <p>{data.metrics.economics.evidenceCode === "no-payment-provider" ? t("operations.economics.noPayment") : data.metrics.economics.evidence}</p>
            </footer>
          </>
        )}
      </section>
    </div>
  );
}
