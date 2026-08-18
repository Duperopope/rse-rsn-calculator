import React, { useState } from 'react';
import styles from './BeginnerGuide.module.css';
import { useI18n } from '../../platform/i18n/I18nProvider.jsx';

export function BeginnerGuide({ onStartTour }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  return <section className={styles.guide} aria-labelledby="beginner-title">
    <div className={styles.header}>
      <div><span className={styles.kicker}>{t('beginner.kicker')}</span><h2 id="beginner-title">{t('beginner.title')}</h2><p>{t('beginner.description')}</p></div>
      <div className={styles.actions}><button onClick={onStartTour}>{t('beginner.start')}</button><button className={styles.secondary} onClick={() => setOpen(!open)} aria-expanded={open}>{open ? t('beginner.hide') : t('beginner.understand')}</button></div>
    </div>
    {open ? <div className={styles.content}>
      <div className={styles.path}>
        <article><span>{t('beginner.before.label')}</span><strong>{t('beginner.before.title')}</strong><p>{t('beginner.before.text')}</p></article>
        <article><span>{t('beginner.during.label')}</span><strong>{t('beginner.during.title')}</strong><p>{t('beginner.during.text')}</p></article>
        <article><span>{t('beginner.after.label')}</span><strong>{t('beginner.after.title')}</strong><p>{t('beginner.after.text')}</p></article>
      </div>
      <dl className={styles.glossary}>
        <div><dt>{t('beginner.glossary.continuous.title')}</dt><dd>{t('beginner.glossary.continuous.text')}</dd></div>
        <div><dt>{t('beginner.glossary.span.title')}</dt><dd>{t('beginner.glossary.span.text')}</dd></div>
        <div><dt>{t('beginner.glossary.rest.title')}</dt><dd>{t('beginner.glossary.rest.text')}</dd></div>
        <div><dt>{t('beginner.glossary.warning.title')}</dt><dd>{t('beginner.glossary.warning.text')}</dd></div>
      </dl>
    </div> : null}
  </section>;
}
