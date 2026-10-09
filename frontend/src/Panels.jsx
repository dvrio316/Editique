import { useRef, useState } from 'react';
import { FONTS, PRESETS, STICKERS } from './utils.js';

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
        {['all', 0, 1, 2].map((s) => (
          <button key={s} className={`btn ${slot === s ? 'active' : ''}`} onClick={() => setSlot(s)}>
            {s === 'all' ? 'All' : `Photo ${s + 1}`}
          </button>
        ))}
      </div>

      <Label>Photo area color</Label>
      <div className="flex items-center gap-2">
        <input type="color" value={doc.bg} onChange={(e) => set({ bg: e.target.value }, 'bg')} />
        {['#fff8e7', '#ffd6e0', '#d6f0ff', '#e2ffd6', '#2b2b2b'].map((c) => (
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
        {['#ffffff', '#fff3b0', '#ffc2d1', '#b8e0ff', '#222222'].map((c) => (
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
  return (
    <div>
      <Label>Tap a sticker to add it</Label>
      <div className="grid grid-cols-5 gap-2">
        {STICKERS.map((s) => (
          <button key={s} className="btn text-3xl" style={{ padding: 0, minHeight: 52 }} onClick={() => onAdd(s)}>
            {s}
          </button>
        ))}
      </div>
      <p className="text-sm mt-2 opacity-70">
        Drag to move, corners to resize, top handle to rotate. ⧉ duplicates, ✕ deletes.
      </p>
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

export function LayersPanel({ items, selectedId, onSelect, onMove, onToggle, onRemove }) {
  const rows = items.map((it, i) => ({ it, i })).reverse(); // top layer first
  return (
    <div>
      <Label>Layers (top → bottom)</Label>
      {rows.length === 0 && <p className="text-sm opacity-70">Nothing here yet. Go doodle!</p>}
      <div className="flex flex-col gap-1">
        {rows.map(({ it, i }) => (
          <div
            key={it.id}
            className={`flex items-center gap-1 wobbly px-2 py-1 ${selectedId === it.id ? 'bg-[#ffe066]' : 'bg-[#fffdf5]'}`}
          >
            <button
              className="flex-1 text-left truncate"
              style={{ opacity: it.visible === false ? 0.4 : 1 }}
              onClick={() => it.type !== 'stroke' && onSelect(it.id)}
            >
              {nameOf(it, i)}
            </button>
            <button title="Bring forward" disabled={i === items.length - 1} onClick={() => onMove(it.id, 1)}>
              ⬆️
            </button>
            <button title="Send backward" disabled={i === 0} onClick={() => onMove(it.id, -1)}>
              ⬇️
            </button>
            <button title="Show / hide" onClick={() => onToggle(it.id)}>
              {it.visible === false ? '🙈' : '👁️'}
            </button>
            <button title="Delete" onClick={() => onRemove(it.id)}>
              🗑️
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
