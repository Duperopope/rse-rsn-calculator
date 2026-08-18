import React, { useState } from 'react';
import { TYPES_SERVICE, PAYS_LISTE } from '../../config/constants.js';
import styles from './ParametresPanel.module.css';
import { useI18n } from '../../platform/i18n/I18nProvider.jsx';

/**
 * FIMO Check — ParametresPanel v7.11.0
 * UX Conducteur : labels humains, chips clairs, panneau compact
 * Les chips utilisent le champ 'short' de TYPES_SERVICE
 * Tap sur les chips = ouvrir/fermer le panneau
 */

export function ParametresPanel({
  typeService, onTypeServiceChange,
  pays, onPaysChange,
  equipage, onEquipageChange,
  mode, onModeChange
}) {
  const { t, locale } = useI18n();
  const [ouvert, setOuvert] = useState(false);

  const paysObj = PAYS_LISTE.find(p => p.code === pays) || PAYS_LISTE[0];
  const serviceObj = TYPES_SERVICE.find(t => t.code === typeService) || TYPES_SERVICE[0];
  const serviceShort = t(`parameters.services.${serviceObj.code}.short`);
  const countryName = code => new Intl.DisplayNames([locale], { type: 'region' }).of(code) || code;

  const togglePanel = () => {
    setOuvert(v => !v);
    if (navigator.vibrate) navigator.vibrate(5);
  };

  return (
    <div data-tour="params" className={`${styles.panel} ${ouvert ? styles.panelOpen : ''}`}>
      {/* === Barre de chips cliquable === */}
      <button
        className={styles.summaryBtn}
        onClick={togglePanel}
        aria-expanded={ouvert}
        aria-label={t('parameters.edit')}
      >
        <div className={styles.chipsRow}>
          <span className={styles.chipService}>
            <span className={styles.chipIcon}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="3" width="18" height="14" rx="3"/><line x1="3" y1="10" x2="21" y2="10"/><circle cx="7" cy="20" r="2"/><circle cx="17" cy="20" r="2"/></svg></span>
            <span className={styles.chipText}><span className={styles.chipKey}>{t('parameters.service')}</span><span className={styles.chipValue}>{serviceShort}</span></span>
          </span>
          <span className={styles.chip}>
            <span className={styles.flag} aria-hidden="true">{paysObj.drapeau}</span>
            <span className={styles.chipText}><span className={styles.chipKey}>{t('parameters.country')}</span><span className={styles.chipValue}>{countryName(paysObj.code)}</span></span>
          </span>
          <span className={styles.chip}>
            <span className={styles.chipIcon}>{equipage === 'double' ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="9" cy="7" r="3.5"/><circle cx="17" cy="8" r="3"/><path d="M2 21a7 7 0 0114 0"/><path d="M16 21a5.5 5.5 0 015-5"/></svg> : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="7" r="4"/><path d="M5.5 21a6.5 6.5 0 0113 0"/></svg>}</span>
            <span className={styles.chipText}><span className={styles.chipKey}>{t('parameters.crew')}</span><span className={styles.chipValue}>{equipage === 'double' ? t('parameters.twoDrivers') : t('parameters.oneDriver')}</span></span>
          </span>
          <span className={styles.chipMode}>
            <span className={styles.chipIcon}>{mode === 'formulaire' ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M17 3l4 4L7 21H3v-4L17 3z"/></svg> : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>}</span>
            <span className={styles.chipText}><span className={styles.chipKey}>{t('parameters.input')}</span><span className={styles.chipValue}>{mode === 'formulaire' ? t('parameters.manual') : t('parameters.csv')}</span></span>
          </span>
        </div>
        <span className={`${styles.chevron} ${ouvert ? styles.chevronOpen : ''}`}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </span>
      </button>

      {/* === Panneau depliable === */}
      {ouvert && (
        <div className={styles.content}>
          <div className={styles.grid}>
            <div className={styles.group}>
              <label className={styles.label}>{t('parameters.tripType')}</label>
              <select
                className={styles.select}
                value={typeService}
                onChange={(e) => onTypeServiceChange(e.target.value)}
              >
                {TYPES_SERVICE.map(service => (
                  <option key={service.code} value={service.code}>
                    {`${t(`parameters.services.${service.code}.label`)} — ${t(`parameters.services.${service.code}.detail`)}`}
                  </option>
                ))}
              </select>
            </div>
            <div className={styles.group}>
              <label className={styles.label}>{t('parameters.country')}</label>
              <select
                className={styles.select}
                value={pays}
                onChange={(e) => onPaysChange(e.target.value)}
              >
                {PAYS_LISTE.map(p => (
                  <option key={p.code} value={p.code}>{p.drapeau} {countryName(p.code)}</option>
                ))}
              </select>
            </div>
            <div className={styles.group}>
              <label className={styles.label}>{t('parameters.crew')}</label>
              <div className={styles.toggle}>
                <button
                  className={equipage === 'solo' ? styles.toggleActive : styles.toggleBtn}
                  onClick={() => onEquipageChange('solo')}
                  type="button"
                >
                  <span className={styles.toggleIcon}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="7" r="4"/><path d="M5.5 21a6.5 6.5 0 0113 0"/></svg></span> {t('parameters.solo')}
                </button>
                <button
                  className={equipage === 'double' ? styles.toggleActive : styles.toggleBtn}
                  onClick={() => onEquipageChange('double')}
                  type="button"
                >
                  <span className={styles.toggleIcon}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="9" cy="7" r="3.5"/><circle cx="17" cy="8" r="3"/><path d="M2 21a7 7 0 0114 0"/><path d="M16 21a5.5 5.5 0 015-5"/></svg></span> {t('parameters.duo')}
                </button>
              </div>
            </div>
            <div className={styles.group}>
              <label className={styles.label}>{t('parameters.inputMode')}</label>
              <div className={styles.toggle}>
                <button
                  className={mode === 'formulaire' ? styles.toggleActive : styles.toggleBtn}
                  onClick={() => onModeChange('formulaire')}
                  type="button"
                >
                  <span className={styles.toggleIcon}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M17 3l4 4L7 21H3v-4L17 3z"/></svg></span> {t('parameters.manual')}
                </button>
                <button
                  className={mode === 'csv' ? styles.toggleActive : styles.toggleBtn}
                  onClick={() => onModeChange('csv')}
                  type="button"
                >
                  <span className={styles.toggleIcon}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg></span> {t('parameters.csv')}
                </button>
              </div>
            </div>
          </div>

          {/* Info contextuelle */}
          {serviceObj.detail && (
            <div className={styles.detailHint}>
              <span className={styles.detailIcon}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg></span>
              <span>{t(`parameters.services.${serviceObj.code}.detail`)}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
