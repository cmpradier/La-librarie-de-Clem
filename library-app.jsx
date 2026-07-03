// library-app.jsx — UI + interactions de Clem's Library
const { useState, useEffect, useRef } = React;

/* ---------- petites icônes géométriques ---------- */
const Icon = ({ d, size = 18, stroke = 1.6 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round">{d}</svg>
);
const IconPlus  = (p) => <Icon {...p} d={<><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></>} />;
const IconClose = (p) => <Icon {...p} d={<><line x1="6" y1="6" x2="18" y2="18" /><line x1="18" y1="6" x2="6" y2="18" /></>} />;
const IconCheck = (p) => <Icon {...p} d={<polyline points="20 6 9 17 4 12" />} />;
const IconNote  = (p) => <Icon {...p} d={<><path d="M4 5h16" /><path d="M4 12h16" /><path d="M4 19h10" /></>} />;
const IconBook  = (p) => <Icon {...p} d={<><path d="M4 5a2 2 0 0 1 2-2h12v16H6a2 2 0 0 0-2 2z" /><path d="M4 19a2 2 0 0 1 2-2h12" /></>} />;
const IconTrash = (p) => <Icon {...p} d={<><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6M14 11v6" /></>} />;

/* ---------- couverture placeholder typographique ---------- */
const Cover = ({ book, size = 'sm' }) => (
  <div className={`cover ${size}`} style={{ background: TONES[book.tone] || TONES.green }}>
    <div className="cover__inner">
      <div className="cover__rule"></div>
      <div className="cover__title">{book.title}</div>
      <div className="cover__author">{book.author}</div>
    </div>
  </div>
);

const pct = (b) => (b.total && b.page != null ? Math.min(100, Math.round((b.page / b.total) * 100)) : null);

/* ---------- carte livre (sections) ---------- */
const BookCard = ({ book, onOpen, size = 'md' }) => (
  <button className="bookcard" onClick={() => onOpen(book)}>
    <Cover book={book} size={size} />
    <span className="bookcard__a">{book.author}</span>
  </button>
);

/* ---------- modale générique ---------- */
const Modal = ({ open, onClose, children, width = 560 }) => {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: width }}>
        <button className="modal__x" onClick={onClose} aria-label="Fermer"><IconClose size={18} /></button>
        {children}
      </div>
    </div>
  );
};

/* ---------- formulaire : ajouter un livre ---------- */
const AddBookModal = ({ open, onClose, onAdd }) => {
  const blank = { title: '', author: '', status: 'toread', total: '', page: '', series: '', tone: 'green' };
  const [f, setF] = useState(blank);
  useEffect(() => { if (open) setF(blank); /* eslint-disable-next-line */ }, [open]);
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));
  const valid = f.title.trim() && f.author.trim();
  const submit = (e) => { e.preventDefault(); if (!valid) return; onAdd(f); onClose(); };

  const STATUS = [['toread', 'À lire'], ['reading', 'En cours'], ['finished', 'Terminé']];

  return (
    <Modal open={open} onClose={onClose} width={520}>
      <h3 className="modal__title">Ajouter un livre</h3>
      <form onSubmit={submit} className="form">
        <label className="field">
          <span>Titre</span>
          <input value={f.title} onChange={set('title')} placeholder="ex. La Chute des Géants" autoFocus />
        </label>
        <label className="field">
          <span>Auteur</span>
          <input value={f.author} onChange={set('author')} placeholder="ex. Ken Follett" />
        </label>

        <div className="field">
          <span>Statut</span>
          <div className="seg">
            {STATUS.map(([v, l]) => (
              <button type="button" key={v} className={f.status === v ? 'on' : ''}
                onClick={() => setF((s) => ({ ...s, status: v }))}>{l}</button>
            ))}
          </div>
        </div>

        <div className="row2">
          <label className="field">
            <span>Nombre de pages <em>(optionnel)</em></span>
            <input type="number" min="1" value={f.total} onChange={set('total')} placeholder="ex. 1008" />
          </label>
          {f.status === 'reading' && (
            <label className="field">
              <span>Page actuelle <em>(optionnel)</em></span>
              <input type="number" min="0" value={f.page} onChange={set('page')} placeholder="ex. 120" />
            </label>
          )}
        </div>

        <label className="field">
          <span>Collection / série <em>(optionnel)</em></span>
          <input value={f.series} onChange={set('series')} placeholder="ex. Le Siècle · Tome 1" />
        </label>

        <div className="field">
          <span>Couleur de couverture</span>
          <div className="swatches">
            {TONE_KEYS.map((t) => (
              <button type="button" key={t} aria-label={t}
                className={'swatch' + (f.tone === t ? ' on' : '')}
                style={{ background: TONES[t] }} onClick={() => setF((s) => ({ ...s, tone: t }))} />
            ))}
          </div>
        </div>

        <div className="form__foot">
          <button type="button" className="btn ghost" onClick={onClose}>Annuler</button>
          <button type="submit" className="btn" disabled={!valid}>Ajouter à ma bibliothèque</button>
        </div>
      </form>
    </Modal>
  );
};

/* ---------- modale : détail d'un livre ---------- */
const DetailModal = ({ book, onClose, lib, focusNote }) => {
  const [note, setNote] = useState('');
  const [page, setPage] = useState('');
  const noteRef = useRef(null);
  useEffect(() => {
    setNote(''); setPage(book ? (book.page ?? '') : '');
    if (book && focusNote) setTimeout(() => noteRef.current && noteRef.current.focus(), 60);
  }, [book, focusNote]);
  if (!book) return null;

  const p = pct(book);
  const STATUS = [['toread', 'À lire'], ['reading', 'En cours'], ['finished', 'Terminé']];

  const saveNote = () => { if (note.trim()) { lib.addNote(book.id, note); setNote(''); } };
  const savePage = () => { const n = Math.max(0, Number(page) || 0); lib.updateBook(book.id, { page: n }); };

  return (
    <Modal open={!!book} onClose={onClose} width={680}>
      <div className="detail">
        <div className="detail__left">
          <Cover book={book} size="lg" />
        </div>
        <div className="detail__right">
          {book.series && <div className="eyebrow">{book.series}</div>}
          <h3 className="detail__title">{book.title}</h3>
          <div className="detail__author">{book.author}</div>

          <div className="seg seg--sm" style={{ marginTop: 18 }}>
            {STATUS.map(([v, l]) => (
              <button key={v} className={book.status === v ? 'on' : ''}
                onClick={() => lib.setStatus(book.id, v)}>{l}</button>
            ))}
          </div>

          {book.status === 'reading' && (
            <div className="prog">
              <div className="prog__head">
                <span className="k">Progression</span>
                {p != null && <span className="prog__pct">{p}%</span>}
              </div>
              {p != null && <div className="bar"><span style={{ width: p + '%' }} /></div>}
              <div className="prog__edit">
                <span>Page&nbsp;</span>
                <input type="number" min="0" value={page} onChange={(e) => setPage(e.target.value)} onBlur={savePage} />
                <span>{book.total ? ` / ${book.total}` : ''}</span>
              </div>
            </div>
          )}

          <div className="detail__meta">
            {book.started && <span><b>Commencé</b> le {formatFr(book.started)}</span>}
            {book.finished && <span><b>Terminé</b> le {formatFr(book.finished)}</span>}
            {!book.started && !book.finished && book.total && <span><b>{book.total}</b> pages</span>}
          </div>
        </div>
      </div>

      <div className="notes">
        <div className="notes__head"><IconNote size={15} /> <span>Mes notes</span></div>
        <div className="notes__add">
          <textarea ref={noteRef} value={note} onChange={(e) => setNote(e.target.value)}
            placeholder="Une citation, une impression, un passage marquant…" rows={2} />
          <button className="btn sm" onClick={saveNote} disabled={!note.trim()}>Enregistrer</button>
        </div>
        <div className="notes__list">
          {(book.notes || []).length === 0 && <div className="notes__empty">Aucune note pour l'instant.</div>}
          {(book.notes || []).map((n) => (
            <div key={n.id} className="note">
              <p>{n.text}</p>
              <div className="note__foot">
                <span>{formatFr(n.date)}</span>
                <button onClick={() => lib.deleteNote(book.id, n.id)} aria-label="Supprimer la note"><IconTrash size={14} /></button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <button className="detail__del" onClick={() => { lib.deleteBook(book.id); onClose(); }}>
        <IconTrash size={14} /> Retirer ce livre de ma bibliothèque
      </button>
    </Modal>
  );
};

/* ---------- section avec rangée de livres ---------- */
const Shelf = ({ title, count, books, onOpen, empty }) => (
  <section className="shelf-sec">
    <div className="section-head"><h2>{title}</h2><span className="count">{count}</span></div>
    {books.length === 0
      ? <div className="empty">{empty}</div>
      : <div className="row">{books.map((b) => <BookCard key={b.id} book={b} onOpen={onOpen} />)}</div>}
  </section>
);

/* ---------- App ---------- */
const LibraryApp = () => {
  const lib = useLibrary();
  const [adding, setAdding] = useState(false);
  const [detail, setDetail] = useState(null);   // {book, focusNote}

  const reading  = lib.books.filter((b) => b.status === 'reading');
  const finished = lib.books.filter((b) => b.status === 'finished')
    .sort((a, b) => (b.finished || '').localeCompare(a.finished || ''));
  const toread   = lib.books.filter((b) => b.status === 'toread');

  // garde la modale détail synchronisée avec le store
  const live = detail ? lib.books.find((b) => b.id === detail.id) : null;

  const hero = reading[0];
  const open = (book, focusNote = false) => setDetail({ id: book.id, focusNote });

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>Clem<i>’s</i> Library</div>
        <button className="btn" onClick={() => setAdding(true)}><IconPlus size={16} /> Ajouter un livre</button>
      </header>

      <main className="wrap">
        {/* HERO — livre en cours */}
        <section className="hero">
          <div className="eyebrow">En ce moment</div>
          {hero ? (
            <div className="hero__grid">
              <button className="hero__cover" onClick={() => open(hero)}><Cover book={hero} size="lg" /></button>
              <div className="hero__info">
                {hero.series && <div className="hero__series">{hero.series}</div>}
                <h1 className="hero__title">{hero.title}</h1>
                <div className="hero__author">par <span>{hero.author}</span></div>

                {pct(hero) != null && (
                  <div className="hero__prog">
                    <div className="hero__prog-head">
                      <span className="k">PROGRESSION</span>
                      <span className="hero__pct">{pct(hero)}%</span>
                    </div>
                    <div className="bar"><span style={{ width: pct(hero) + '%' }} /></div>
                  </div>
                )}

                <div className="meta-row">
                  {hero.started && <div className="meta"><span className="k">Commencé le</span><span className="v">{formatFr(hero.started)}</span></div>}
                  {hero.total && <div className="meta"><span className="k">Page</span><span className="v">{hero.page ?? 0} / {hero.total}</span></div>}
                </div>

                <div className="hero__btns">
                  <button className="btn" onClick={() => open(hero, true)}><IconNote size={16} /> Ajouter une note</button>
                  <button className="btn ghost" onClick={() => lib.setStatus(hero.id, 'finished')}><IconCheck size={16} /> Marquer comme terminé</button>
                </div>

                {reading.length > 1 && (
                  <div className="hero__also">
                    <span className="k">Aussi en cours</span>
                    <div className="hero__also-row">
                      {reading.slice(1).map((b) => <BookCard key={b.id} book={b} onOpen={open} size="sm" />)}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="hero__empty">
              <IconBook size={26} />
              <p>Aucune lecture en cours.<br />Commence un livre de ta pile à lire, ou ajoute-en un.</p>
              <button className="btn" onClick={() => setAdding(true)}><IconPlus size={16} /> Ajouter un livre</button>
            </div>
          )}
        </section>

        <Shelf title="Terminés récemment" count={`${finished.length} livre${finished.length > 1 ? 's' : ''}`}
          books={finished} onOpen={open}
          empty="Tes lectures terminées apparaîtront ici." />

        <Shelf title="Ma pile à lire" count={`${toread.length} livre${toread.length > 1 ? 's' : ''}`}
          books={toread} onOpen={open}
          empty="Ajoute les livres que tu veux lire bientôt." />

        <footer className="foot">
          <span>Clem’s Library</span>
          <button onClick={lib.resetAll}>Réinitialiser l'exemple</button>
        </footer>
      </main>

      <AddBookModal open={adding} onClose={() => setAdding(false)} onAdd={lib.addBook} />
      <DetailModal book={live} focusNote={detail && detail.focusNote} onClose={() => setDetail(null)} lib={lib} />
    </div>
  );
};

window.LibraryApp = LibraryApp;
