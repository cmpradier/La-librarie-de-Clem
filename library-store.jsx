// library-store.jsx — données, synchronisation Supabase + cache local de Clem's Library

const SUPABASE_URL = 'https://vqpmnbvjgwtijbiqarui.supabase.co';
const SUPABASE_KEY = 'sb_publishable_9-6531BVOZ-KGkKdGBUf8w_Cougd37r';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

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

const CACHE_KEY = 'clems-library-cache-v1';

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

function loadCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) { /* ignore */ }
  return null;
}
function saveCache(books) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(books)); } catch (e) { /* ignore */ }
}

// mappe une ligne Supabase (snake_case) vers l'objet livre utilisé par l'app
function fromRow(r) {
  return {
    id: r.id, title: r.title, author: r.author, tone: r.tone, status: r.status,
    series: r.series || '', total: r.total, page: r.page,
    started: r.started, finished: r.finished, notes: r.notes || [],
  };
}
function toRow(b) {
  return {
    id: b.id, title: b.title, author: b.author, tone: b.tone, status: b.status,
    series: b.series || null, total: b.total ?? null, page: b.page ?? null,
    started: b.started || null, finished: b.finished || null, notes: b.notes || [],
  };
}

async function seedRemote() {
  await supabase.from('books').insert(SEED.map(toRow));
  return SEED;
}

function useLibrary() {
  const cached = loadCache();
  const [books, setBooks] = React.useState(cached || []);
  const [ready, setReady] = React.useState(!!cached);
  const [synced, setSynced] = React.useState(false);

  React.useEffect(() => {
    let alive = true;
    let seeding = false;
    (async () => {
      const { data, error } = await supabase.from('books').select('*').order('updated_at', { ascending: false });
      if (!alive) return;
      if (error) { console.error('Supabase load error', error); setReady(true); return; }
      if (!data || data.length === 0) {
        if (seeding) return;
        seeding = true;
        // re-check just before writing, to avoid a race seeding twice
        const { data: recheck } = await supabase.from('books').select('id').limit(1);
        if (!alive) return;
        if (recheck && recheck.length > 0) {
          const { data: fresh } = await supabase.from('books').select('*').order('updated_at', { ascending: false });
          const list = (fresh || []).map(fromRow);
          setBooks(list); saveCache(list);
        } else {
          const seeded = await seedRemote();
          if (alive) { setBooks(seeded); saveCache(seeded); }
        }
      } else {
        const list = data.map(fromRow);
        setBooks(list); saveCache(list);
      }
      setReady(true); setSynced(true);
    })();

    const channel = supabase.channel('books-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'books' }, () => {
        supabase.from('books').select('*').order('updated_at', { ascending: false }).then(({ data }) => {
          if (data) { const list = data.map(fromRow); setBooks(list); saveCache(list); }
        });
      }).subscribe();

    return () => { alive = false; supabase.removeChannel(channel); };
  }, []);

  React.useEffect(() => { saveCache(books); }, [books]);

  const upsertRemote = (book) => {
    supabase.from('books').upsert(toRow(book)).then(({ error }) => { if (error) console.error('Supabase upsert error', error); });
  };

  const addBook = (data) => {
    const book = {
      id: uid(), title: data.title.trim(), author: data.author.trim(),
      tone: data.tone || TONE_KEYS[Math.floor(Math.random() * TONE_KEYS.length)],
      status: data.status || 'toread', series: data.series ? data.series.trim() : '',
      total: data.total ? Number(data.total) : null,
      page: data.status === 'reading' ? (data.page ? Number(data.page) : 0) : null,
      started: data.status === 'reading' ? todayISO() : null,
      finished: data.status === 'finished' ? todayISO() : null,
      notes: [],
    };
    setBooks((b) => [book, ...b]);
    upsertRemote(book);
    return book.id;
  };

  const updateBook = (id, patch) =>
    setBooks((b) => b.map((x) => {
      if (x.id !== id) return x;
      const next = { ...x, ...patch };
      upsertRemote(next);
      return next;
    }));

  const deleteBook = (id) => {
    setBooks((b) => b.filter((x) => x.id !== id));
    supabase.from('books').delete().eq('id', id).then(({ error }) => { if (error) console.error('Supabase delete error', error); });
  };

  const setStatus = (id, status) =>
    setBooks((b) => b.map((x) => {
      if (x.id !== id) return x;
      const next = { ...x, status };
      if (status === 'reading') { next.started = x.started || todayISO(); next.page = x.page || 0; next.finished = null; }
      if (status === 'finished') { next.finished = todayISO(); }
      if (status === 'toread') { next.started = null; next.finished = null; next.page = null; }
      upsertRemote(next);
      return next;
    }));

  const addNote = (id, text) =>
    setBooks((b) => b.map((x) => {
      if (x.id !== id) return x;
      const next = { ...x, notes: [{ id: uid(), date: todayISO(), text: text.trim() }, ...(x.notes || [])] };
      upsertRemote(next);
      return next;
    }));

  const deleteNote = (id, noteId) =>
    setBooks((b) => b.map((x) => {
      if (x.id !== id) return x;
      const next = { ...x, notes: (x.notes || []).filter((n) => n.id !== noteId) };
      upsertRemote(next);
      return next;
    }));

  const resetAll = async () => {
    await supabase.from('books').delete().neq('id', '__none__');
    const seeded = SEED.map((s) => ({ ...s, id: uid() }));
    await supabase.from('books').insert(seeded.map(toRow));
    setBooks(seeded);
  };

  return { books, ready, synced, addBook, updateBook, deleteBook, setStatus, addNote, deleteNote, resetAll };
}

Object.assign(window, { TONES, TONE_KEYS, formatFr, todayISO, useLibrary });
