import React, { useCallback, useEffect, useState } from "react";
import { API_URL } from "../../config/constants.js";
import { useModalDialog } from "./useModalDialog.js";
import styles from "./OperationsCenter.module.css";

function formatDuration(seconds) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return days ? `${days} j ${hours} h` : hours ? `${hours} h ${minutes} min` : `${minutes} min`;
}
function formatBytes(bytes) {
  if (!bytes) return "0 octet";
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} Ko`;
  return `${(bytes / 1024 / 1024).toFixed(1)} Mo`;
}
function formatDate(value) {
  if (!value) return "Jamais mesuré";
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function State({ ok, children }) {
  return <span className={ok ? styles.ok : styles.warning}><i />{children}</span>;
}

export function OperationsCenter({ open, onClose }) {
  const dialogRef = useModalDialog(open, onClose);
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    setError("");
    try {
      const response = await fetch(API_URL + "/admin/control-room");
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Lecture impossible.");
      setData(payload);
    } catch (requestError) { setError(requestError.message); }
  }, []);
  useEffect(() => { if (open) load(); }, [open, load]);
  if (!open) return null;

  async function runMaintenance() {
    setBusy(true);
    setError("");
    try {
      const response = await fetch(API_URL + "/admin/maintenance", { method: "POST" });
      if (!response.ok) throw new Error("Maintenance impossible.");
      await load();
    } catch (requestError) { setError(requestError.message); }
    finally { setBusy(false); }
  }

  return (
    <div className={styles.backdrop} onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section ref={dialogRef} className={styles.dialog} role="dialog" aria-modal="true" aria-labelledby="operations-title">
        <header className={styles.header}>
          <div>
            <p>Kairos · exploitation</p>
            <h2 id="operations-title">Centre de commandement</h2>
            <span>Une vue factuelle de FIMOCheck, sans métrique inventée.</span>
          </div>
          <div className={styles.headerActions}>
            <button onClick={load} disabled={busy}>Actualiser</button>
            <button className={styles.close} aria-label="Fermer le centre de commandement" onClick={onClose}>×</button>
          </div>
        </header>

        {error ? <p className={styles.error} role="alert">{error}</p> : null}
        {!data ? <div className={styles.loading}>Lecture des signaux vérifiables…</div> : (
          <>
            <div className={styles.statusRail} aria-label="État des fonctions critiques">
              <State ok={data.application.status === "operational"}>Application opérationnelle</State>
              <State ok={data.security.audit.ok}>Audit intègre</State>
              <State ok={Boolean(data.quality)}>Qualité attestée</State>
              <State ok={Boolean(data.backup.lastRestore)}>Restauration vérifiée</State>
              <time dateTime={data.generatedAt}>Mesuré {formatDate(data.generatedAt)}</time>
            </div>

            {data.alerts.length ? (
              <section className={styles.alerts} aria-labelledby="alerts-title">
                <div className={styles.sectionTitle}><h3 id="alerts-title">À traiter</h3><span>{data.alerts.length} signal{data.alerts.length > 1 ? "aux" : ""}</span></div>
                <div className={styles.alertGrid}>
                  {data.alerts.map((alert) => <article key={alert.code} data-severity={alert.severity}><strong>{alert.title}</strong><small>{alert.code}</small></article>)}
                </div>
              </section>
            ) : null}

            <div className={styles.columns}>
              <section className={styles.panel}>
                <div className={styles.sectionTitle}><h3>Exploitation</h3><span>Source : processus</span></div>
                <dl className={styles.facts}>
                  <div><dt>Version</dt><dd>v{data.application.version}</dd></div>
                  <div><dt>Environnement</dt><dd>{data.application.environment}</dd></div>
                  <div><dt>Disponibilité courante</dt><dd>{formatDuration(data.application.uptimeSeconds)}</dd></div>
                  <div><dt>Base chiffrée</dt><dd>{formatBytes(data.storage.databaseBytes)}</dd></div>
                </dl>
              </section>

              <section className={styles.panel}>
                <div className={styles.sectionTitle}><h3>Usage constaté</h3><span>Source : SQLite</span></div>
                <div className={styles.metricGrid}>
                  <article><strong>{data.metrics.accounts.active}</strong><span>comptes actifs</span></article>
                  <article><strong>{data.metrics.usage.analysesTotal}</strong><span>analyses conservées</span></article>
                  <article><strong>{data.metrics.usage.analysesLast30Days}</strong><span>analyses · 30 jours</span></article>
                  <article><strong>{data.metrics.usage.successfulLoginsLast30Days}</strong><span>connexions · 30 jours</span></article>
                </div>
                <p className={styles.noChart}>Aucune série historique n’est encore collectée : aucun graphique de tendance n’est affiché.</p>
              </section>

              <section className={styles.panel}>
                <div className={styles.sectionTitle}><h3>Sécurité</h3><span>Configuration + chaîne d’audit</span></div>
                <ul className={styles.checks}>
                  <li><State ok={data.security.dataEncryption}>Chiffrement des données</State></li>
                  <li><State ok={data.security.audit.ok}>Chaîne d’audit · {data.security.audit.count} événements</State></li>
                  <li><State ok={data.security.backupEncryptionConfigured}>Clé de sauvegarde configurée</State></li>
                  <li><State ok={data.security.httpsOriginsConfigured}>Origines HTTPS configurées</State></li>
                </ul>
              </section>

              <section className={styles.panel}>
                <div className={styles.sectionTitle}><h3>Sauvegarde et entretien</h3><span>Preuves locales</span></div>
                <dl className={styles.facts}>
                  <div><dt>Dernière sauvegarde</dt><dd>{formatDate(data.backup.lastBackup?.createdAt)}</dd></div>
                  <div><dt>Dernière restauration</dt><dd>{formatDate(data.backup.lastRestore?.restoredAt)}</dd></div>
                  <div><dt>Dernier entretien</dt><dd>{formatDate(data.maintenance.lastRun?.ranAt)}</dd></div>
                </dl>
                <button className={styles.action} onClick={runMaintenance} disabled={busy}>{busy ? "Entretien en cours…" : "Lancer l’entretien maintenant"}</button>
              </section>
            </div>

            <section className={styles.quality}>
              <div className={styles.sectionTitle}><h3>Dernière preuve qualité</h3><span>{data.quality ? formatDate(data.quality.generatedAt) : "Absente"}</span></div>
              {data.quality ? (
                <>
                  <div className={styles.qualityGrid}>
                    {Object.entries(data.quality.results).map(([name, result]) => (
                      <article key={name}><strong>{result.passed}/{result.total}</strong><span>{name}</span></article>
                    ))}
                  </div>
                  <p>Empreinte <code>{data.quality.evidenceSha256.slice(0, 20)}</code> · attestation interne, sans certification externe.</p>
                </>
              ) : <p>Lancez <code>npm run verify</code> sur cette version pour générer une attestation.</p>}
            </section>

            <footer className={styles.economics}>
              <span>Économie mesurée</span>
              <strong>{(data.metrics.economics.revenueGrossCents / 100).toLocaleString("fr-FR", { style: "currency", currency: data.metrics.economics.currency })}</strong>
              <p>{data.metrics.economics.evidence}</p>
            </footer>
          </>
        )}
      </section>
    </div>
  );
}
