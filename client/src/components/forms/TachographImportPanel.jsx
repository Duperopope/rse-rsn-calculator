import React, { useCallback, useEffect, useRef, useState } from 'react';
import { API_URL } from '../../config/constants.js';
import { useI18n } from '../../platform/i18n/I18nProvider.jsx';
import styles from './TachographImportPanel.module.css';

function shortHash(value) {
  return value ? `${value.slice(0, 12)}…${value.slice(-8)}` : '—';
}

export function TachographImportPanel() {
  const { t, formatDate } = useI18n();
  const inputRef = useRef(null);
  const [expanded, setExpanded] = useState(false);
  const [capabilities, setCapabilities] = useState(null);
  const [imports, setImports] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [pendingDelete, setPendingDelete] = useState('');

  const load = useCallback(async () => {
    try {
      const [capabilitiesResponse, importsResponse] = await Promise.all([
        fetch(`${API_URL}/tachograph/capabilities`),
        fetch(`${API_URL}/tachograph/imports`),
      ]);
      if (!capabilitiesResponse.ok || !importsResponse.ok) throw new Error(t('tachograph.readUnavailable'));
      setCapabilities(await capabilitiesResponse.json());
      setImports((await importsResponse.json()).imports || []);
    } catch (requestError) { setError(requestError.message); }
  }, [t]);

  useEffect(() => { if (expanded) load(); }, [expanded, load]);

  async function upload(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const form = new FormData();
      form.append('tachograph', file);
      const response = await fetch(`${API_URL}/tachograph/imports`, { method: 'POST', body: form });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || t('tachograph.uploadUnavailable'));
      setNotice(payload.duplicate
        ? t('tachograph.duplicate')
        : t('tachograph.received'));
      await load();
    } catch (requestError) { setError(requestError.message); }
    finally { setBusy(false); }
  }

  async function remove(id) {
    setBusy(true);
    setError('');
    try {
      const response = await fetch(`${API_URL}/tachograph/imports/${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error(t('tachograph.deleteUnavailable'));
      setPendingDelete('');
      setNotice(t('tachograph.deleted'));
      await load();
    } catch (requestError) { setError(requestError.message); }
    finally { setBusy(false); }
  }

  return (
    <section className={styles.panel} aria-label={t('tachograph.region')}>
      <button className={styles.summary} type="button" aria-expanded={expanded} onClick={() => setExpanded(value => !value)}>
        <span className={styles.symbol} aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="8"/><path d="M12 7v5l3 2M4.5 5.5l2 2M19.5 5.5l-2 2"/></svg>
        </span>
        <span className={styles.summaryText}>
          <span className={styles.kicker}>{t('tachograph.kicker')}</span>
          <strong>{t('tachograph.title')}</strong>
          <small>{t('tachograph.subtitle')}</small>
        </span>
        <span className={styles.chevron} aria-hidden="true">{expanded ? '−' : '+'}</span>
      </button>

      {expanded ? (
        <div className={styles.content}>
          <div className={styles.boundary} role="note">
            <strong>{t('tachograph.currentLimit')}</strong>
            <p>{t('tachograph.limitText')}</p>
          </div>

          <div className={styles.actions}>
            <div>
              <span>{t('tachograph.source')}</span>
              <small>{capabilities ? t('tachograph.formats', { formats: capabilities.acceptedExtensions.map(value => value.toUpperCase()).join(', ') }) : t('tachograph.loadingCapabilities')}</small>
            </div>
            <input ref={inputRef} className={styles.fileInput} type="file" accept=".ddd,.c1b,.v1b" onChange={upload} />
            <button className={styles.primary} type="button" disabled={busy} onClick={() => inputRef.current?.click()}>
              {busy ? t('tachograph.processing') : t('tachograph.choose')}
            </button>
          </div>

          {error ? <p className={styles.error} role="alert">{error}</p> : null}
          {notice ? <p className={styles.notice} role="status">{notice}</p> : null}

          {imports.length ? (
            <div className={styles.imports}>
              <div className={styles.listTitle}><strong>{t('tachograph.stored')}</strong><span>{imports.length}</span></div>
              {imports.map(item => (
                <article key={item.id} className={styles.importRow}>
                  <span className={styles.fileMark}>{item.sourceHint === 'driver_card' ? 'C1B' : item.sourceHint === 'vehicle_unit' ? 'V1B' : 'DDD'}</span>
                  <div className={styles.fileFacts}>
                    <strong>{t(`tachograph.status.${item.status}`)}</strong>
                    <small>{formatDate(new Date(item.createdAt), { dateStyle: 'medium', timeStyle: 'short' })} · SHA-256 <code>{shortHash(item.sha256)}</code></small>
                  </div>
                  <div className={styles.rowActions}>
                    <a href={`${API_URL}/tachograph/imports/${item.id}/original`} download>{t('tachograph.recover')}</a>
                    {pendingDelete === item.id ? (
                      <span className={styles.confirm}>
                        <button type="button" disabled={busy} onClick={() => remove(item.id)}>{t('tachograph.confirm')}</button>
                        <button type="button" onClick={() => setPendingDelete('')}>{t('tachograph.cancel')}</button>
                      </span>
                    ) : <button type="button" onClick={() => setPendingDelete(item.id)}>{t('tachograph.remove')}</button>}
                  </div>
                </article>
              ))}
            </div>
          ) : <p className={styles.empty}>{t('tachograph.empty')}</p>}
        </div>
      ) : null}
    </section>
  );
}
