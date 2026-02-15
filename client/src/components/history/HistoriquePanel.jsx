import { useState, useRef, useEffect, useCallback } from 'react';

const SEEN_KEY = 'fimo_historique_seen_count';
import styles from './HistoriquePanel.module.css';

/* ── Helpers ─────────────────────────────────────────────── */
const EURO = '\u20AC';

function formatDate(iso) {
  try {
    const d = new Date(iso);
    const jour = String(d.getDate()).padStart(2, '0');
    const mois = String(d.getMonth() + 1).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    return `${jour}/${mois} ${hh}:${mm}`;
  } catch { return '—'; }
}

function scoreColor(s) {
  if (s >= 90) return '#00ff88';
  if (s >= 70) return '#ffaa00';
  return '#ff4444';
}

function scoreBg(s) {
  if (s >= 90) return 'rgba(0,255,136,0.12)';
  if (s >= 70) return 'rgba(255,170,0,0.12)';
  return 'rgba(255,68,68,0.12)';
}

/* ── Composant principal ─────────────────────────────────── */
export function getUnseenCount(historiqueLength) {
  try {
    const seen = parseInt(localStorage.getItem('fimo_historique_seen_count') || '0', 10);
    return Math.max(0, historiqueLength - seen);
  } catch { return historiqueLength; }
}

export function HistoriquePanel({
  visible,
  historique,
  onClose,
  onReload,
  onDelete,
  onDeleteAll,
  onView,
  onRename
}) {
  const [longPressId, setLongPressId] = useState(null);
  const longPressTimer = useRef(null);
  const [seenCount, setSeenCount] = useState(() => {
    try { return parseInt(localStorage.getItem(SEEN_KEY) || '0', 10); } catch { return 0; }
  });

  useEffect(() => {
    if (visible && historique && historique.length > 0) {
      const len = historique.length;
      if (len !== seenCount) {
        setSeenCount(len);
        try { localStorage.setItem(SEEN_KEY, String(len)); } catch {}
      }
    }
  }, [visible, historique]);
  const [confirmDeleteAll, setConfirmDeleteAll] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState('');
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const overlayRef = useRef(null);
  const sheetRef = useRef(null);
  const inputRef = useRef(null);

  /* Fermer avec Escape */
  useEffect(() => {
    if (!visible) return;
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [visible, onClose]);

  /* Bloquer le scroll du body quand ouvert */
  useEffect(() => {
    if (visible) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
      setLongPressId(null);
      setConfirmDeleteAll(false);
      setEditingId(null);
    }
    return () => { document.body.style.overflow = ''; };
  }, [visible]);

  /* Focus auto sur le champ de renommage */
  useEffect(() => {
    if (editingId !== null && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingId]);

  /* ── Long press handler (mobile) ─────────────────────── */
  const onPointerDown = useCallback((e, entryId) => {
    longPressTimer.current = setTimeout(() => {
      setLongPressId(prev => prev === entryId ? null : entryId);
      if (navigator.vibrate) navigator.vibrate(15);
    }, 500);
  }, []);

  const onPointerUp = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  const onPointerLeave = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  /* Fermer le menu contextuel quand on clique ailleurs */
  useEffect(() => {
    if (longPressId === null) return;
    const close = () => setLongPressId(null);
    document.addEventListener('pointerdown', close, { once: true });
    return () => document.removeEventListener('pointerdown', close);
  }, [longPressId]);

  /* ── Renommer ────────────────────────────────────────── */
  const startRename = useCallback((entry) => {
    setEditingId(entry.id || entry.date);
    setEditValue(entry.nom || '');
    setLongPressId(null);
  }, []);

  const confirmRename = useCallback(() => {
    if (editingId !== null && onRename) {
      onRename(editingId, editValue.trim());
    }
    setEditingId(null);
    setEditValue('');
  }, [editingId, editValue, onRename]);

  const handleRenameKeyDown = useCallback((e) => {
    if (e.key === 'Enter') confirmRename();
    if (e.key === 'Escape') { setEditingId(null); setEditValue(''); }
  }, [confirmRename]);

  /* ── Supprimer tout ──────────────────────────────────── */
  const handleDeleteAll = useCallback(() => {
    if (!confirmDeleteAll) {
      setConfirmDeleteAll(true);
      setTimeout(() => setConfirmDeleteAll(false), 3000);
      return;
    }
    if (onDeleteAll) onDeleteAll();
    setConfirmDeleteAll(false);
    if (navigator.vibrate) navigator.vibrate(20);
  }, [confirmDeleteAll, onDeleteAll]);

  /* ── Rendu ───────────────────────────────────────────── */
  if (!visible) return null;

  const entryKey = (entry) => entry.id || entry.date;

  return (
    <div className={styles.wrapper} role="dialog" aria-modal="true" aria-label="Historique des analyses">
      {/* Overlay */}
      <div
        className={styles.overlay}
        ref={overlayRef}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel (bottom sheet mobile / side panel PC) */}
      <div className={styles.panel} ref={sheetRef}>
        {/* Grab handle (mobile uniquement, visuel) */}
        <div className={styles.grabHandle} aria-hidden="true">
          <div className={styles.grabBar} />
        </div>

        {/* Header */}
        <div className={styles.header}>
          <h2 className={styles.title}>Historique</h2>
          <span className={styles.count}>{historique.length}</span>
          <button
            className={styles.closeBtn}
            onClick={onClose}
            aria-label="Fermer l'historique"
            title="Fermer"
          >
            &times;
          </button>
        </div>

        {/* Corps */}
        <div className={styles.body}>
          {historique.length === 0 ? (
            <div className={styles.empty}>
              <div className={styles.emptyIcon}>
                      ⚙️
              </div>
              <p className={styles.emptyText}>Aucune analyse sauvegardée</p>
              <p className={styles.emptyHint}>Lancez une analyse pour la voir ici</p>
            </div>
          ) : (
            historique.map((entry) => {
              const key = entryKey(entry);
              const isLongPressed = longPressId === key;
              const isEditing = editingId === key;
              const score = entry.resultat?.score ?? entry.score ?? 0;
              const infractions = entry.resultat?.infractions?.length ?? entry.infractions ?? 0;
              const amende = entry.resultat?.amende_estimee ?? entry.amende ?? 0;
              const nbJours = entry.jours?.length ?? entry.parametres?.nbJours ?? '?';
              const typeService = entry.parametres?.typeService ?? '';
              const pays = entry.parametres?.pays ?? '';
              const displayName = entry.nom || formatDate(entry.date);

              return (
                <div
                  key={key}
                  className={`${styles.cardWrapper} ${isLongPressed ? styles.cardActive : ''}`}
                >
                  {/* Menu contextuel (appui long) */}
                  {isLongPressed && (
                  <div className={styles.contextMenu} onPointerDown={(e) => e.stopPropagation()}>
                    <button
                      className={styles.contextBtn}
                      onClick={() => { startRename(entry); setLongPressId(null); }}
                      aria-label="Renommer"
                    >
                      <span className={styles.contextIcon}>✏️</span>
                      <span>Renommer</span>
                    </button>
                    <button
                      className={styles.contextBtn}
                      onClick={() => { onReload(entry); setLongPressId(null); }}
                      aria-label="Recharger"
                    >
                      <span className={styles.contextIcon}>🔄</span>
                      <span>Recharger</span>
                    </button>
                    <button
                      className={styles.contextBtn + ' ' + styles.contextBtnDanger}
                      onClick={() => { onDelete(key); setLongPressId(null); if (navigator.vibrate) navigator.vibrate(15); }}
                      aria-label="Supprimer"
                    >
                      <span className={styles.contextIcon}>🗑️</span>
                      <span>Supprimer</span>
                    </button>
                  </div>
                  )}

                  {/* Carte principale */}
                  <div
                    className={styles.card}
                    onClick={() => { if (!isEditing && !isSwiped) onView(entry); }}
                    onPointerDown={(e) => onPointerDown(e, key)}
                    onPointerUp={onPointerUp}
                    onPointerLeave={onPointerLeave}
                  >
                    {/* Badge score */}
                    <div
                      className={styles.scoreBadge}
                      style={{ background: scoreBg(score), borderColor: scoreColor(score) }}
                    >
                      <span className={styles.scoreValue} style={{ color: scoreColor(score) }}>
                        {Math.round(score)}
                      </span>
                    </div>

                    {/* Infos */}
                    <div className={styles.cardInfo}>
                      {isEditing ? (
                        <div className={styles.renameRow}>
                          <input
                            ref={inputRef}
                            className={styles.renameInput}
                            type="text"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onKeyDown={handleRenameKeyDown}
                            onBlur={confirmRename}
                            placeholder="Nom de l'analyse..."
                            maxLength={40}
                          />
                        </div>
                      ) : (
                        <div className={styles.cardTitle}>{displayName}</div>
                      )}
                      <div className={styles.cardMeta}>
                        <span className={styles.metaItem}>
                          {infractions} infraction{infractions !== 1 ? 's' : ''}
                        </span>
                        <span className={styles.metaDot}></span>
                        <span className={styles.metaItem}>
                          {amende}{EURO}
                        </span>
                      </div>
                      <div className={styles.cardTags}>
                        {nbJours !== '?' && (
                          <span className={styles.tag}>J{nbJours}</span>
                        )}
                        {typeService && (
                          <span className={styles.tag}>{typeService}</span>
                        )}
                        {pays && (
                          <span className={styles.tag}>{pays}</span>
                        )}
                      </div>
                    </div>

                    {/* Actions hover (PC uniquement) */}
                    <div className={styles.hoverActions}>
                      <button
                        className={styles.hoverBtn}
                        onClick={(e) => { e.stopPropagation(); startRename(entry); }}
                        aria-label="Renommer"
                        title="Renommer"
                      >
                        ✏️
                      </button>
                      <button
                        className={styles.hoverBtn}
                        onClick={(e) => { e.stopPropagation(); onReload(entry); }}
                        aria-label="Recharger"
                        title="Recharger"
                      >
                        🔄
                      </button>
                      <button
                        className={styles.hoverBtn + ' ' + styles.hoverBtnDanger}
                        onClick={(e) => { e.stopPropagation(); onDelete(key); if (navigator.vibrate) navigator.vibrate(15); }}
                        aria-label="Supprimer"
                        title="Supprimer"
                      >
                      🗑️
                      </button>
                    </div>

                    {/* Indicateur appui long (mobile) */}
                    <div className={styles.longPressHint} aria-hidden="true">
                      <span className={styles.longPressDots}>{String.fromCharCode(8942)}</span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        {historique.length > 0 && (
          <div className={styles.footer}>
            <button
              className={`${styles.deleteAllBtn} ${confirmDeleteAll ? styles.deleteAllConfirm : ''}`}
              onClick={handleDeleteAll}
            >
              {confirmDeleteAll ? 'Confirmer la suppression' : 'Effacer tout l\'historique'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}