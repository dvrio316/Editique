import { useRef, useState } from 'react';
import { FONTS, PRESETS, STICKER_GROUPS } from './utils.js';
import { FILTERS } from './filters.js';

const Label = ({ children }) => <div className="font-marker text-sm mb-1 mt-2">{children}</div>;

export function BackgroundPanel({ doc, commit }) {
  const fileRef = useRef(null);
  const [slot, setSlot] = useState('all'); // 'all' | 0 | 1 | 2
  const set = (props, key) => commit((d) => ({ ...d, ...props }), key ? { key } : {});

  // put an image into one slot, or all three
  const setImage = (src) =>
    commit((d) => ({ ...d, images: d.images.map((old, i) => (slot === 'all' || slot === i ? src : old)) }));

  const onFile = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setImage(URL.createObjectURL(f));
    e.target.value = '';
  };

  return (
    <div>
      <Label>Which photo?</Label>
      <div className="flex gap-2 flex-wrap">
        {['all', ...doc.images.map((_, k) => k)].map((s) => (
          <button key={s} className={`btn ${slot === s ? 'active' : ''}`} onClick={() => setSlot(s)}>
            {s === 'all' ? 'All' : `Photo ${s + 1}`}
          </button>
        ))}
      </div>

      <Label>Photo area color</Label>
      <div className="flex items-center gap-2">
        <input type="color" value={doc.bg} onChange={(e) => set({ bg: e.target.value }, 'bg')} />
        {['#ffffff', '#ececec', '#cfcfcf', '#8a8a8a', '#2b2b2b'].map((c) => (
          <button
            key={c}
            className="w-8 h-8 rounded-full border-2 border-[#2b2b2b]"
            style={{ background: c }}
            onClick={() => set({ bg: c })}
            aria-label={`Use ${c}`}
          />
        ))}
      </div>

      <Label>Frame color</Label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={doc.frameColor}
          onChange={(e) => set({ frameColor: e.target.value }, 'frame')}
        />
        {['#ffffff', '#ececec', '#cfcfcf', '#8a8a8a', '#222222'].map((c) => (
          <button
            key={c}
            className="w-8 h-8 rounded-full border-2 border-[#2b2b2b]"
            style={{ background: c }}
            onClick={() => set({ frameColor: c })}
            aria-label={`Frame ${c}`}
          />
        ))}
      </div>

      <Label>Preset photos</Label>
      <div className="flex gap-2 flex-wrap">
        {PRESETS.map((p) => (
          <button key={p.name} className="wobbly overflow-hidden w-20" onClick={() => setImage(p.src)}>
            <img src={p.src} alt={p.name} className="w-full h-20 object-cover block" />
            <div className="text-sm">{p.name}</div>
          </button>
        ))}
      </div>

      <div className="flex gap-2 mt-3 flex-wrap">
        <button className="btn" onClick={() => fileRef.current?.click()}>
          📷 Upload photo
        </button>
        <button className="btn" onClick={() => setImage(null)}>
          Remove photo
        </button>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFile} />
      </div>
    </div>
  );
}

export function StickersPanel({ onAdd }) {
  const [g, setG] = useState(0);
  return (
    <div>
      <Label>Tap a sticker to add it</Label>
      <div className="flex gap-2 mb-2">
        {STICKER_GROUPS.map((grp, k) => (
          <button key={k} className={`btn ${g === k ? 'active' : ''}`} style={{ minHeight: 40, padding: '0 10px', fontSize: 20 }} onClick={() => setG(k)} aria-label={`Sticker group ${k + 1}`}>
            {grp.name}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-5 gap-2">
        {STICKER_GROUPS[g].items.map((s) => (
          <button key={s} className="btn text-3xl" style={{ padding: 0, minHeight: 52 }} onClick={() => onAdd(s)}>
            {s}
          </button>
        ))}
      </div>
      <p className="text-sm mt-2 opacity-70">
        Drag to move. Turn it with the round handle above it, or twist with two fingers. Drag a corner or pinch to resize. ⧉ duplicates, ✕ deletes.
      </p>
    </div>
  );
}

export function FiltersPanel({ doc, commit }) {
  const cur = doc.filter || 'none';
  const thumb = doc.images[0];
  return (
    <div>
      <Label>Filter for your photos</Label>
      <div className="grid grid-cols-3 gap-2">
        {FILTERS.map((f) => (
          <button key={f.id} className={`btn ${cur === f.id ? 'active' : ''}`} style={{ padding: 4, minHeight: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }} onClick={() => commit((d) => ({ ...d, filter: f.id }))}>
            <span className="block w-full overflow-hidden" style={{ height: 52, borderRadius: 6 }}>
              <img src={thumb} alt="" className="w-full h-full object-cover" style={{ filter: f.css }} />
            </span>
            <span className="text-sm">{f.name}</span>
          </button>
        ))}
      </div>
      <p className="text-sm mt-2 opacity-70">Filters change the photos only. Your doodles, stickers and the frame keep their colors.</p>
    </div>
  );
}

export function TextPanel({ selected, onAdd, onChange }) {
  const t = selected?.type === 'text' ? selected : null;
  return (
    <div>
      <button className="btn" onClick={onAdd}>
        ＋ Add text
      </button>
      {t ? (
        <>
          <Label>Words</Label>
          <textarea
            className="w-full"
            rows={2}
            value={t.text}
            onChange={(e) => onChange({ text: e.target.value }, 'text-' + t.id)}
          />
          <Label>Font</Label>
          <select
            className="w-full"
            value={t.fontFamily}
            style={{ fontFamily: t.fontFamily }}
            onChange={(e) => onChange({ fontFamily: e.target.value })}
          >
            {FONTS.map((f) => (
              <option key={f} value={f} style={{ fontFamily: f }}>
                {f}
              </option>
            ))}
          </select>
          <div className="flex items-center gap-2 mt-2">
            <input type="color" value={t.fill} onChange={(e) => onChange({ fill: e.target.value }, 'fill-' + t.id)} />
            <button className={`btn ${t.bold ? 'active' : ''}`} onClick={() => onChange({ bold: !t.bold })}>
              <b>B</b>
            </button>
            <button className={`btn ${t.italic ? 'active' : ''}`} onClick={() => onChange({ italic: !t.italic })}>
              <i>I</i>
            </button>
          </div>
          <Label>Size: {t.fontSize}px</Label>
          <input
            type="range"
            min={12}
            max={120}
            value={t.fontSize}
            className="w-full"
            onChange={(e) => onChange({ fontSize: +e.target.value }, 'fsize-' + t.id)}
          />
        </>
      ) : (
        <p className="text-sm mt-2 opacity-70">Add text, or select a text box on the canvas to edit it.</p>
      )}
    </div>
  );
}

const nameOf = (it, i) =>
  it.type === 'sticker'
    ? `${it.emoji} sticker`
    : it.type === 'text'
    ? `“${(it.text || '').slice(0, 14)}”`
    : it.erase
    ? `🧽 erase #${i + 1}`
    : `✏️ doodle #${i + 1}`;
