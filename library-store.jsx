// library-store.jsx — données, persistance et helpers de Clem's Library

const TONES = {
  green: 'oklch(0.40 0.055 150)',
  olive: 'oklch(0.48 0.06 118)',
  clay:  'oklch(0.49 0.085 47)',
  rust:  'oklch(0.45 0.09 35)',
  plum:  'oklch(0.40 0.06 350)',
  ink:   'oklch(0.35 0.035 255)',
  sand:  'oklch(0.60 0.05 82)',
};
const TONE_KEYS = Object.keys(TONES);

const STORAGE_KEY = 'clems-library-v1';

const uid = () => Math.random().toString(36).slice(2, 9);
const todayISO = () => new Date().toISOString().slice(0, 10);

function formatFr(iso) {
  if (!iso) return '';
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}

const SEED = [
  { id: uid(), title: 'La Chute des Géants', author: 'Ken Follett', tone: 'green',
    status: 'reading', series: 'Le Siècle · Tome 1',
    started: '2026-06-02', page: 382, total: 1008, notes: [] },

  { id: uid(), title: "L'Élégance du hérisson", author: 'Muriel Barbery', tone: 'plum',
    status: 'finished', finished: '2026-05-21', total: 416, notes: [] },
  { id: uid(), title: 'Stoner', author: 'John Williams', tone: 'sand',
    status: 'finished', finished: '2026-05-04', total: 288,
    notes: [{ id: uid(), date: '2026-05-04', text: 'Bouleversant de sobriété. La vie ordinaire racontée avec une tendresse immense.' }] },
  { id: uid(), title: 'Là où chantent les écrevisses', author: 'Delia Owens', tone: 'olive',
    status: 'finished', finished: '2026-04-12', total: 480, notes: [] },
  { id: uid(), title: 'Le Comte de Monte-Cristo', author: 'Alexandre Dumas', tone: 'ink',
    status: 'finished', finished: '2026-03-02', total: 1276, notes: [] },

  { id: uid(), title: "L'Hiver du monde", author: 'Ken Follett', tone: 'rust',
    status: 'toread', series: 'Le Siècle · Tome 2', total: 1024, notes: [] },
  { id: uid(), title: 'Les Piliers de la terre', author: 'Ken Follett', tone: 'clay',
    status: 'toread', total: 1056, notes: [] },
  { id: uid(), title: 'Anna Karénine', author: 'Léon Tolstoï', tone: 'ink',
    status: 'toread', total: 864, notes: [] },
  { id: uid(), title: "La Promesse de l'aube", author: 'Romain Gary', tone: 'olive',
    status: 'toread', total: 392, notes: [] },
];

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) { /* ignore */ }
  return SEED;
}
function save(books) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(books)); } catch (e) { /* ignore */ }
}

function useLibrary() {
  const [books, setBooks] = React.useState(load);
  React.useEffect(() => { save(books); }, [books]);

  const addBook = (data) => {
    const book = {
      id: uid(),
      title: data.title.trim(),
      author: data.author.trim(),
      tone: data.tone || TONE_KEYS[Math.floor(Math.random() * TONE_KEYS.length)],
      status: data.status || 'toread',
      series: data.series ? data.series.trim() : '',
      total: data.total ? Number(data.total) : null,
      page: data.status === 'reading' ? (data.page ? Number(data.page) : 0) : null,
      started: data.status === 'reading' ? todayISO() : null,
      finished: data.status === 'finished' ? todayISO() : null,
      notes: [],
    };
    setBooks((b) => [book, ...b]);
    return book.id;
  };

  const updateBook = (id, patch) =>
    setBooks((b) => b.map((x) => (x.id === id ? { ...x, ...patch } : x)));

  const deleteBook = (id) => setBooks((b) => b.filter((x) => x.id !== id));

  const setStatus = (id, status) =>
    setBooks((b) => b.map((x) => {
      if (x.id !== id) return x;
      const next = { ...x, status };
      if (status === 'reading') { next.started = x.started || todayISO(); next.page = x.page || 0; next.finished = null; }
      if (status === 'finished') { next.finished = todayISO(); }
      if (status === 'toread') { next.started = null; next.finished = null; next.page = null; }
      return next;
    }));

  const addNote = (id, text) =>
    setBooks((b) => b.map((x) => x.id === id
      ? { ...x, notes: [{ id: uid(), date: todayISO(), text: text.trim() }, ...(x.notes || [])] }
      : x));

  const deleteNote = (id, noteId) =>
    setBooks((b) => b.map((x) => x.id === id
      ? { ...x, notes: (x.notes || []).filter((n) => n.id !== noteId) }
      : x));

  const resetAll = () => setBooks(SEED.map((s) => ({ ...s, id: uid() })));

  return { books, addBook, updateBook, deleteBook, setStatus, addNote, deleteNote, resetAll };
}

Object.assign(window, { TONES, TONE_KEYS, formatFr, todayISO, useLibrary });
