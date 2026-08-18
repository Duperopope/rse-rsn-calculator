import React from 'react';
import styles from './MissionPanel.module.css';
import { useI18n } from '../../platform/i18n/I18nProvider.jsx';

export function MissionPanel({ mission, onChange }) {
  const { t } = useI18n();
  function update(key, value) { onChange({ ...mission, [key]: value }); }
  return (
    <section className={styles.panel} aria-labelledby="mission-title" data-tour="mission">
      <div className={styles.intro}>
        <span className={styles.kicker}>{t('mission.kicker')}</span>
        <h2 id="mission-title">{t('mission.title')}</h2>
        <p>{t('mission.description')}</p>
      </div>
      <div className={styles.fields}>
        <label><span>{t('mission.reference')}</span><input maxLength="60" value={mission.reference} onChange={e => update('reference', e.target.value)} placeholder={t('mission.referencePlaceholder')} /></label>
        <label><span>{t('mission.site')}</span><input maxLength="60" value={mission.site} onChange={e => update('site', e.target.value)} placeholder={t('mission.sitePlaceholder')} /></label>
        <label><span>{t('mission.purpose')}</span><input maxLength="90" value={mission.objet} onChange={e => update('objet', e.target.value)} placeholder={t('mission.purposePlaceholder')} /></label>
      </div>
      <p className={styles.privacy}>{t('mission.privacy')}</p>
    </section>
  );
}
