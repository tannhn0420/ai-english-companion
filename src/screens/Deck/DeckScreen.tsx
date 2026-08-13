import { useEffect, useMemo, useRef, useState } from 'react';
import type { VocabCard } from '../../core/types';
import { detectLang, normalizeImported, parseImport, serialize } from '../../core/importExport';
import { createCard } from '../../core/srs';
import { lookup } from '../../services/dict';
import { download } from '../../services/download';
import { speak } from '../../services/tts';
import { useDeck } from '../../hooks/useDeck';
import { useI18n } from '../../i18n';

const DEFAULT_TOPIC = 'khác';

type FormState = {
  id?: string;
  term: string;
  meaning: string;
  ipa: string;
  example: string;
  topic: string;
};

const EMPTY_FORM: FormState = { term: '', meaning: '', ipa: '', example: '', topic: '' };

export default function DeckScreen() {
  const { t } = useI18n();
  const { deck, loading, upsert, remove, importCards } = useDeck();

  const [query, setQuery] = useState('');
  const [topicFilter, setTopicFilter] = useState('');
  const [form, setForm] = useState<FormState | null>(null);
  const [defs, setDefs] = useState<string[]>([]);
  const [audio, setAudio] = useState('');
  const [filling, setFilling] = useState(false);
  const [toast, setToast] = useState('');
  const importRef = useRef<HTMLInputElement>(null);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(''), 2500);
  }

  // Prefill từ Share Target (Android) hoặc nút "Dán từ clipboard" (Home)
  useEffect(() => {
    try {
      const shared = sessionStorage.getItem('aec-add-term');
      if (shared) {
        sessionStorage.removeItem('aec-add-term');
        setForm({ ...EMPTY_FORM, term: shared });
        setDefs([]);
        setAudio('');
      }
    } catch {
      /* ignore */
    }
  }, []);

  const topics = useMemo(() => {
    const set = new Set<string>();
    deck.forEach((c) => set.add(c.topic || DEFAULT_TOPIC));
    return [...set].sort();
  }, [deck]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return deck.filter((c) => {
      if (topicFilter && (c.topic || DEFAULT_TOPIC) !== topicFilter) return false;
      if (q && !c.term.toLowerCase().includes(q) && !c.meaning.toLowerCase().includes(q))
        return false;
      return true;
    });
  }, [deck, query, topicFilter]);

  // ---- Form (thêm/sửa qua bottom sheet) ----

  function openAdd() {
    setForm({ ...EMPTY_FORM });
    setDefs([]);
    setAudio('');
  }

  function openEdit(c: VocabCard) {
    setForm({
      id: c.id,
      term: c.term,
      meaning: c.meaning,
      ipa: c.ipa || '',
      example: c.example || '',
      topic: c.topic || '',
    });
    setDefs([]);
    setAudio('');
  }

  async function autoFill() {
    if (!form?.term.trim()) return;
    setFilling(true);
    try {
      const entry = await lookup(form.term, Date.now());
      if (!entry) {
        showToast(t('formAutoFillOffline'));
      } else if (entry.miss && !entry.ipa) {
        showToast(t('formAutoFillMiss'));
      } else {
        setForm((f) =>
          f
            ? {
                ...f,
                ipa: f.ipa || entry.ipa || '',
                example: f.example || entry.example || '',
              }
            : f,
        );
        setDefs(entry.defs);
        setAudio(entry.audio || '');
      }
    } finally {
      setFilling(false);
    }
  }

  async function saveForm() {
    if (!form || !form.term.trim() || !form.meaning.trim()) return;
    const existing = form.id ? deck.find((c) => c.id === form.id) : undefined;
    const now = Date.now();
    const card: VocabCard = existing
      ? {
          ...existing,
          term: form.term.trim(),
          meaning: form.meaning.trim(),
          ipa: form.ipa.trim() || undefined,
          example: form.example.trim() || undefined,
          topic: form.topic.trim() || undefined,
          updatedAt: now,
        }
      : createCard(
          {
            term: form.term,
            meaning: form.meaning,
            lang: detectLang(form.term),
            ipa: form.ipa.trim() || undefined,
            example: form.example.trim() || undefined,
            topic: form.topic.trim() || undefined,
          },
          now,
        );
    await upsert(card);
    setForm(null);
    showToast(t('toastSaved'));
  }

  async function deleteFromForm() {
    if (!form?.id) return;
    const card = deck.find((c) => c.id === form.id);
    if (!card) return;
    if (!window.confirm(t('deckDeleteConfirm', { term: card.term }))) return;
    await remove(card.id);
    setForm(null);
    showToast(t('toastDeleted'));
  }

  // ---- Import / Export ----

  async function handleImportFile(file: File) {
    try {
      const text = await file.text();
      const parsed = parseImport(file.name, text);
      if (parsed.length === 0) {
        showToast(t('deckImportFail'));
        return;
      }
      const { added, skipped } = await importCards(normalizeImported(parsed, Date.now()));
      showToast(t('deckImportDone', { added, skipped }));
    } catch {
      showToast(t('deckImportFail'));
    }
  }

  function exportAs(fmt: 'json' | 'csv' | 'tsv') {
    if (deck.length === 0) return;
    const names = { json: 'aec-vocab.json', csv: 'aec-vocab.csv', tsv: 'aec-vocab-anki.tsv' };
    const mimes = { json: 'application/json', csv: 'text/csv', tsv: 'text/tab-separated-values' };
    download(names[fmt], serialize(deck, fmt), mimes[fmt]);
  }

  return (
    <div
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        const f = e.dataTransfer.files?.[0];
        if (f) void handleImportFile(f);
      }}
    >
      <h1 className="screen-title">
        {t('deckTitle')}{' '}
        <span className="text-2 tabular" style={{ fontWeight: 400 }}>
          · {t('deckCards', { n: deck.length })}
        </span>
      </h1>

      <div className="toolbar">
        <input
          className="input"
          style={{ flex: 1, minWidth: 140 }}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('deckSearch')}
        />
        <select
          className="input"
          style={{ width: 'auto' }}
          value={topicFilter}
          onChange={(e) => setTopicFilter(e.target.value)}
        >
          <option value="">{t('deckAllTopics')}</option>
          {topics.map((tp) => (
            <option key={tp} value={tp}>
              {tp}
            </option>
          ))}
        </select>
      </div>

      <div className="toolbar">
        <button className="btn" onClick={() => importRef.current?.click()}>
          {t('deckImport')}
        </button>
        <input
          ref={importRef}
          type="file"
          accept=".csv,.tsv,.json,text/csv,application/json"
          style={{ display: 'none' }}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void handleImportFile(f);
            e.target.value = '';
          }}
        />
        <button className="btn" onClick={() => exportAs('json')} disabled={deck.length === 0}>
          {t('deckExportJson')}
        </button>
        <button className="btn" onClick={() => exportAs('csv')} disabled={deck.length === 0}>
          {t('deckExportCsv')}
        </button>
        <button className="btn" onClick={() => exportAs('tsv')} disabled={deck.length === 0}>
          {t('deckExportAnki')}
        </button>
      </div>

      {!loading && filtered.length === 0 ? (
        <div className="card" style={{ textAlign: 'center' }}>
          <p className="hero-line" style={{ fontSize: 20 }}>
            {t('deckEmptyTitle')}
          </p>
          <p className="text-2">{t('deckEmptyHint')}</p>
        </div>
      ) : (
        <div>
          {filtered.map((c) => {
            const due = c.due <= Date.now();
            return (
              <button key={c.id} className="deck-row" onClick={() => openEdit(c)}>
                <span
                  onClick={(e) => {
                    e.stopPropagation();
                    speak(c.term, c.lang);
                  }}
                  role="button"
                  aria-label={t('listen')}
                >
                  🔊
                </span>
                <span className="deck-row__main">
                  <span className="deck-row__term">{c.term}</span>
                  {c.ipa && <span className="deck-row__ipa">/{c.ipa}/</span>}
                  <div className="deck-row__meaning">{c.meaning}</div>
                </span>
                {due && <span className="due-dot">● {t('deckDueBadge')}</span>}
              </button>
            );
          })}
        </div>
      )}

      <button className="fab" onClick={openAdd} aria-label={t('deckAdd')}>
        ＋
      </button>

      {form && (
        <>
          <button className="sheet-backdrop" onClick={() => setForm(null)} aria-label="close" />
          <div className="sheet" role="dialog">
            <h3>{form.id ? t('deckEdit') : t('deckAdd')}</h3>

            <div className="field">
              <label>{t('formTerm')}</label>
              <div className="row">
                <input
                  className="input"
                  value={form.term}
                  onChange={(e) => setForm({ ...form, term: e.target.value })}
                  autoFocus
                />
                <button
                  className="btn"
                  onClick={() => speak(form.term, detectLang(form.term))}
                  disabled={!form.term.trim()}
                >
                  🔊
                </button>
              </div>
            </div>

            <div className="row" style={{ marginBottom: 10 }}>
              <button className="btn" onClick={autoFill} disabled={!form.term.trim() || filling}>
                {filling ? '…' : t('formAutoFill')}
              </button>
              {audio && (
                <button className="btn" onClick={() => void new Audio(audio).play()}>
                  ▶ 🗣️
                </button>
              )}
            </div>

            {defs.length > 0 && (
              <p className="text-2" style={{ fontSize: 13, marginTop: 0 }}>
                {t('formDefsHint')} {defs.join(' · ')}
              </p>
            )}

            <div className="field">
              <label>{t('formMeaning')}</label>
              <input
                className="input"
                value={form.meaning}
                onChange={(e) => setForm({ ...form, meaning: e.target.value })}
              />
            </div>
            <div className="field">
              <label>{t('formIpa')}</label>
              <input
                className="input"
                value={form.ipa}
                onChange={(e) => setForm({ ...form, ipa: e.target.value })}
              />
            </div>
            <div className="field">
              <label>{t('formExample')}</label>
              <textarea
                className="input"
                value={form.example}
                onChange={(e) => setForm({ ...form, example: e.target.value })}
              />
            </div>
            <div className="field">
              <label>{t('formTopic')}</label>
              <input
                className="input"
                value={form.topic}
                onChange={(e) => setForm({ ...form, topic: e.target.value })}
                list="aec-topics"
              />
              <datalist id="aec-topics">
                {topics.map((tp) => (
                  <option key={tp} value={tp} />
                ))}
              </datalist>
            </div>

            <div className="row">
              <button
                className="btn-primary"
                style={{ flex: 1 }}
                onClick={() => void saveForm()}
                disabled={!form.term.trim() || !form.meaning.trim()}
              >
                {t('formSave')}
              </button>
              <button className="btn" onClick={() => setForm(null)}>
                {t('formCancel')}
              </button>
              {form.id && (
                <button className="btn btn--danger" onClick={() => void deleteFromForm()}>
                  {t('formDelete')}
                </button>
              )}
            </div>
          </div>
        </>
      )}

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
