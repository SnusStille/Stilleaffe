'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useApp } from '@/components/app-provider';
import { Icon } from '@/components/icons';
import { Badge, CopyButton, Empty, SourceTag } from '@/components/ui';
import { ListenButton } from '@/components/listen-button';
import {
  CATEGORY_LABEL,
  CATEGORY_ORDER,
  GUIDE_SECTIONS,
  SECTIONS_BY_ID,
  SERVICE_LABEL,
  copyManuscript,
  copySection,
  countByCategory,
  countByService,
  effectiveSections,
  filterSections,
  pushRecent,
  readFavorites,
  readRecent,
  writeFavorites,
  type GuideCategory,
  type GuideOverride,
  type GuideSection,
  type GuideService,
} from '@/lib/guide';

const QUICK_LOOPS = [
  {
    title: '1 · Tjänsten',
    text: 'Bevakning av personnummer, aviseringar, kreditinformation, spärrservice och bedrägeriassistans. Tanken är att du ska få veta tidigt.',
    copy: 'Tjänsten: bevakning av personnummer, aviseringar, kreditinformation, spärrservice och bedrägeriassistans. Du får veta tidigt i stället för att upptäcka det långt senare.',
  },
  {
    title: '2 · Dig som säljare',
    text: 'Jag är din kontaktpunkt. Jag svarar på det jag kan och följer upp det jag inte kan svara på direkt.',
    copy: 'Jag är din kontaktpunkt. Jag svarar på det jag kan och följer upp det jag inte kan svara på direkt.',
  },
  {
    title: '3 · Företaget',
    text: 'ViPo Säkerhetstjänster står bakom tjänsten. Label Lab är partner och återförsäljare.',
    copy: 'ViPo Säkerhetstjänster står bakom tjänsten. Label Lab är partner och återförsäljare.',
  },
];

export default function GuidePage() {
  const { me, toast } = useApp();
  const [overrides, setOverrides] = useState<Record<string, GuideOverride>>({});
  const [service, setService] = useState<GuideService | 'all'>('all');
  const [category, setCategory] = useState<GuideCategory | 'all'>('all');
  const [query, setQuery] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);
  const [favs, setFavs] = useState<string[]>([]);
  const [recent, setRecent] = useState<string[]>([]);
  const [editId, setEditId] = useState<string | null>(null);
  const [edit, setEdit] = useState({ title: '', body: '', bullets: '', source: 'internal' as GuideSection['source'], sourceNote: '' });
  const [saving, setSaving] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  const sections = useMemo(() => effectiveSections(overrides), [overrides]);
  const filtered = useMemo(() => filterSections(sections, { service, category, query }), [sections, service, category, query]);
  const counts = useMemo(() => countByCategory(sections), [sections]);
  const serviceCounts = useMemo(() => countByService(sections), [sections]);
  const isManager = me.role === 'manager';

  useEffect(() => {
    setFavs(readFavorites());
    setRecent(readRecent());
    // Deep link from the command palette: /guide?q=brandkollen
    const q = new URLSearchParams(location.search).get('q');
    if (q) setQuery(q);
    // "/" focuses search when not typing anywhere else.
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (e.key === '/' && !e.metaKey && !e.ctrlKey && !(el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable))) {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    fetch('/api/guide', { credentials: 'same-origin' })
      .then((r) => r.json())
      .then((j) => { if (j.overrides) setOverrides(j.overrides); })
      .catch(() => {});
  }, []);

  const grouped = useMemo(() => {
    const map = new Map<GuideCategory, GuideSection[]>();
    for (const s of filtered) {
      if (!map.has(s.category)) map.set(s.category, []);
      map.get(s.category)!.push(s);
    }
    return CATEGORY_ORDER.filter((c) => map.has(c)).map((c) => ({ category: c, items: map.get(c)! }));
  }, [filtered]);

  function toggleFav(id: string) {
    const next = favs.includes(id) ? favs.filter((x) => x !== id) : [...favs, id];
    setFavs(next);
    writeFavorites(next);
  }

  function open(id: string) {
    setOpenId((cur) => (cur === id ? null : id));
    if (openId !== id) setRecent(pushRecent(id));
  }

  function startEdit(s: GuideSection) {
    setEditId(s.id);
    setEdit({
      title: s.title,
      body: s.body,
      bullets: (s.bullets || []).join('\n'),
      source: s.source,
      sourceNote: s.sourceNote || '',
    });
  }

  async function saveEdit(id: string) {
    setSaving(true);
    try {
      const res = await fetch('/api/guide', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          id,
          body: {
            title: edit.title,
            body: edit.body,
            bullets: edit.bullets.split('\n').map((x) => x.trim()).filter(Boolean),
            source: edit.source,
            sourceNote: edit.sourceNote || undefined,
          },
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || 'Kunde inte spara.');
      setOverrides((prev) => ({ ...prev, [id]: { body: { title: edit.title, body: edit.body, bullets: edit.bullets.split('\n').map((x) => x.trim()).filter(Boolean), source: edit.source, sourceNote: edit.sourceNote }, updated_by: me.username, updated_at: new Date().toISOString() } }));
      setEditId(null);
      toast('Avsnittet är uppdaterat.');
    } catch (e: any) {
      toast(e?.message || 'Kunde inte spara.', 'err');
    } finally {
      setSaving(false);
    }
  }

  async function resetEdit(id: string) {
    if (!confirm('Återställ till originalinnehållet?')) return;
    const res = await fetch('/api/guide', {
      method: 'DELETE',
      headers: { 'content-type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ id }),
    });
    if (res.ok) {
      setOverrides((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      setEditId(null);
      toast('Avsnittet är återställt.');
    }
  }

  const showQuick = (service === 'all' || service === 'konsumentkollen') && (category === 'all' || category === 'snabbvy') && !query;

  return (
    <div>
      <div className="page-head">
        <div>
          <div className="eyebrow mint" style={{ marginBottom: 6 }}>SPELGUIDE · LABEL LAB</div>
          <h1 className="page-title">Spelguide</h1>
          <p className="page-sub">Allt du behöver under samtalet — manus, invändningar, loop och avslut. Sök, filtrera och kopiera.</p>
        </div>
        <div className="page-head-actions">
          {service !== 'gemensamt' && (
            <button className="btn" onClick={() => { copyManuscript(service === 'all' ? 'konsumentkollen' : service); toast('Hela manuset är kopierat.'); }}>
              <Icon name="copy" size={15} /> Kopiera helt manus
            </button>
          )}
          {isManager && <Badge tone="violet">Redigeringsläge</Badge>}
        </div>
      </div>

      <div className="guide-layout">
        <aside className="guide-side" aria-label="Kategorier">
          <button className={`guide-cat ${category === 'all' ? 'on' : ''}`} onClick={() => setCategory('all')}>
            <Icon name="layers" size={15} /> Alla avsnitt <span className="cnt">{sections.length}</span>
          </button>
          <button className={`guide-cat ${category === 'snabbvy' ? 'on' : ''}`} onClick={() => { setCategory('snabbvy'); setService('konsumentkollen'); }}>
            <Icon name="zap" size={15} /> Snabbvy · 3 loopar <span className="cnt">{counts.snabbvy || 0}</span>
          </button>
          {CATEGORY_ORDER.filter((c) => c !== 'snabbvy').map((c) => (
            <button key={c} className={`guide-cat ${category === c ? 'on' : ''}`} onClick={() => setCategory(c)}>
              <span>{CATEGORY_LABEL[c]}</span>
              <span className="cnt">{counts[c] || 0}</span>
            </button>
          ))}
          <div className="nav-label" style={{ paddingLeft: 10, paddingTop: 14 }}>Tjänst</div>
          <button className={`guide-cat ${service === 'all' ? 'on' : ''}`} onClick={() => setService('all')}>
            Alla tjänster <span className="cnt">{sections.length}</span>
          </button>
          {(Object.keys(SERVICE_LABEL) as GuideService[]).map((s) => (
            <button key={s} className={`guide-cat ${service === s ? 'on' : ''}`} onClick={() => setService(s)}>
              {SERVICE_LABEL[s]} <span className="cnt">{serviceCounts[s] || 0}</span>
            </button>
          ))}
          <div className="nav-label" style={{ paddingLeft: 10, paddingTop: 14 }}>Favoriter</div>
          <button className="guide-cat" onClick={() => setCategory('all')}>
            <Icon name="star" size={15} /> Favoriter <span className="cnt">{favs.length}</span>
          </button>
        </aside>

        <div>
          <div className="guide-search">
            <Icon name="search" />
            <input ref={searchRef} className="input" placeholder="Sök manus, invändning, avslut…  (tryck /)" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Sök i spelguiden" />
            {query && <button className="copy-btn" style={{ position: 'absolute', right: 8, top: 8 }} onClick={() => setQuery('')}>Rensa</button>}
          </div>

          <div className="row" style={{ marginBottom: 12, gap: 8 }}>
            <div className="segmented">
              {(['all', 'brandkollen', 'konsumentkollen', 'gemensamt'] as const).map((s) => (
                <button key={s} className={service === s ? 'on' : ''} onClick={() => setService(s)}>{s === 'all' ? 'Alla' : SERVICE_LABEL[s]}</button>
              ))}
            </div>
            <span className="card-note">{filtered.length} avsnitt</span>
            {query && <span className="badge mint">Sökning: {query}</span>}
          </div>

          {showQuick && (
            <div className="card accent" style={{ marginBottom: 14 }}>
              <div className="card-head">
                <div><div className="card-kicker">SNABBVY · KONSUMENTKOLLEN</div><h3>Tre huvudloopar</h3></div>
                <Badge tone="mint">Under samtalet</Badge>
              </div>
              <div className="quick-grid">
                {QUICK_LOOPS.map((q) => (
                  <div className="quick-card" key={q.title}>
                    <b>{q.title}</b>
                    <p>{q.text}</p>
                    <div className="row" style={{ marginTop: 8, gap: 6 }}><CopyButton text={q.copy} label="Kopiera" mint /><ListenButton text={q.text} /></div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {recent.length > 0 && !query && category === 'all' && (
            <div className="row" style={{ marginBottom: 12, gap: 6 }}>
              <span className="card-note">Senast använda:</span>
              {recent.map((id) => {
                const s = SECTIONS_BY_ID.get(id);
                return s ? <button key={id} className="badge" onClick={() => { setService(s.service); setCategory(s.category); setOpenId(id); }}>{s.title}</button> : null;
              })}
            </div>
          )}

          {grouped.length === 0 && (
            <Empty title="Inga träffar" icon="search">Prova ett annat sökord eller ta bort filtren.</Empty>
          )}

          <div className="guide-list">
            {grouped.map((group) => (
              <div key={group.category}>
                <div className="eyebrow" style={{ margin: '14px 2px 8px' }}>{CATEGORY_LABEL[group.category]}</div>
                {group.items.map((s) => {
                  const isOpen = openId === s.id;
                  const isFav = favs.includes(s.id);
                  return (
                    <article className={`guide-item ${isOpen ? 'open' : ''}`} key={s.id}>
                      <button className="guide-item-head" onClick={() => open(s.id)} aria-expanded={isOpen}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div className="gi-title">{s.title}</div>
                          {s.summary && <span className="gi-sum">{s.summary}</span>}
                        </div>
                        <Badge tone={s.service === 'brandkollen' ? 'ice' : s.service === 'konsumentkollen' ? 'mint' : 'default'}>{SERVICE_LABEL[s.service]}</Badge>
                        <button
                          type="button"
                          className={`fav-btn ${isFav ? 'on' : ''}`}
                          aria-label={isFav ? 'Ta bort favorit' : 'Spara som favorit'}
                          onClick={(e) => { e.stopPropagation(); toggleFav(s.id); }}
                        >
                          <Icon name="star" size={15} />
                        </button>
                        <Icon name={isOpen ? 'chevron-down' : 'chevron-right'} size={16} style={{ color: 'var(--mu)' }} />
                      </button>
                      {isOpen && (
                        <div className="guide-item-body">
                          {s.source === 'verify' && (
                            <div className="note" style={{ marginBottom: 12 }}>
                              <Icon name="alert" size={15} />
                              <span>Det här avsnittet innehåller påståenden som måste bekräftas med ledning innan de används som fakta.</span>
                            </div>
                          )}
                          {editId === s.id ? (
                            <div className="stack" style={{ gap: 10 }}>
                              <div className="field"><label className="label">Rubrik</label><input className="input" value={edit.title} onChange={(e) => setEdit({ ...edit, title: e.target.value })} /></div>
                              <div className="field"><label className="label">Innehåll</label><textarea className="textarea" rows={10} value={edit.body} onChange={(e) => setEdit({ ...edit, body: e.target.value })} /></div>
                              <div className="field"><label className="label">Punkter (en per rad)</label><textarea className="textarea" rows={4} value={edit.bullets} onChange={(e) => setEdit({ ...edit, bullets: e.target.value })} /></div>
                              <div className="g-2">
                                <div className="field"><label className="label">Källa</label>
                                  <select className="select" value={edit.source} onChange={(e) => setEdit({ ...edit, source: e.target.value as GuideSection['source'] })}>
                                    <option value="official">Officiell produktinformation</option>
                                    <option value="internal">Internt säljargument</option>
                                    <option value="verify">Kontrollera med ledning</option>
                                  </select>
                                </div>
                                <div className="field"><label className="label">Källnotis</label><input className="input" value={edit.sourceNote} onChange={(e) => setEdit({ ...edit, sourceNote: e.target.value })} /></div>
                              </div>
                              <div className="row">
                                <button className="btn btn-primary btn-sm" onClick={() => saveEdit(s.id)} disabled={saving}>{saving ? 'Sparar…' : 'Spara avsnitt'}</button>
                                <button className="btn btn-sm" onClick={() => setEditId(null)}>Avbryt</button>
                                <button className="btn btn-danger btn-sm" onClick={() => resetEdit(s.id)}>Återställ original</button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <div className="gbody">{s.body}</div>
                              {s.bullets && s.bullets.length > 0 && <ul>{s.bullets.map((b, i) => <li key={i}>{b}</li>)}</ul>}
                              <div className="row" style={{ marginTop: 12, gap: 6, flexWrap: 'wrap' }}>
                                <SourceTag source={s.source} />
                                {s.sourceNote && <span className="card-note" style={{ flex: '1 1 100%' }}>{s.sourceNote}</span>}
                              </div>
                              <div className="guide-tools">
                                <CopyButton text={copySection(s)} label="Kopiera avsnitt" mint />
                                <ListenButton text={copySection(s)} />
                                {s.category === 'invandning' && <CopyButton text={s.body} label="Kopiera svar" />}
                                {isManager && <button className="copy-btn" onClick={() => startEdit(s)}><Icon name="edit" size={12} /> Redigera</button>}
                              </div>
                            </>
                          )}
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
