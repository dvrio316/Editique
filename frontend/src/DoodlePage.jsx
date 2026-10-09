import { useCallback, useEffect, useRef, useState } from 'react';
import CanvasStage from './CanvasStage.jsx';
import { BackgroundPanel, LayersPanel, StickersPanel, TextPanel } from './Panels.jsx';
import { CARD_H, CARD_W, PRESETS, uid, useHistory } from './utils.js';
import { api } from './api.js';

const initialDoc = {
  items: [],
  bg: '#e9e9e9',
  frameColor: '#ffffff',
  images: [PRESETS[0].src, PRESETS[1].src, PRESETS[2].src],
};

const shellW = () => Math.min(window.innerWidth, 430);
const shellH = () => Math.min(window.innerHeight, 880);
const fitZoom = () =>
  Math.max(0.3, Math.min(1, (shellW() - 56) / CARD_W, (shellH() - 230) / CARD_H));

/* ---- small inline icons so the bar looks like the prototype ---- */
const Svg = ({ children }) => (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    {children}
  </svg>
);
const IconSmile = () => (
  <Svg>
    <circle cx="12" cy="12" r="9" fill="currentColor" stroke="none" />
    <circle cx="9" cy="10" r="1.3" fill="#1b1b8f" stroke="none" />
    <circle cx="15" cy="10" r="1.3" fill="#1b1b8f" stroke="none" />
    <path d="M8 14.5c1 2 7 2 8 0" stroke="#1b1b8f" />
  </Svg>
);
const IconPen = () => (
  <Svg>
    <path d="M4 20l1-4L16 5a2.1 2.1 0 013 3L8 19z" fill="currentColor" />
  </Svg>
);
const IconEraser = () => (
  <Svg>
    <path d="M4 16l9-9a2 2 0 013 0l3 3a2 2 0 010 3l-6 6H8z" fill="currentColor" />
    <path d="M13 20h8" />
  </Svg>
);
const IconLayers = () => (
  <Svg>
    <path d="M12 3l9 5-9 5-9-5z" fill="currentColor" />
    <path d="M3 13l9 5 9-5" />
  </Svg>
);
const IconImage = () => (
  <Svg>
    <rect x="3" y="4" width="18" height="16" rx="2" />
    <circle cx="9" cy="10" r="1.5" fill="currentColor" />
    <path d="M4 18l5-5 4 4 3-3 4 4" />
  </Svg>
);

const Tool = ({ label, active, disabled, onClick, children, title }) => (
  <button className={`tool ${active ? 'active' : ''}`} onClick={onClick} disabled={disabled} title={title || label}>
    <span className="dot">{children}</span>
    <span>{label}</span>
  </button>
);

export default function DoodlePage({ photos, onBack, user, onNeedLogin, onGallery }) {
  const { doc, commit, undo, redo, canUndo, canRedo } = useHistory({
    ...initialDoc,
    images: photos && photos.length === 3 ? photos : initialDoc.images,
  });
  const [tool, setTool] = useState('pen');
  const [penColor, setPenColor] = useState('#e5484d');
  const [penSize, setPenSize] = useState(6);
  const [eraserSize, setEraserSize] = useState(24);
  const [zoom, setZoom] = useState(fitZoom);
  const [panel, setPanel] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [toast, setToast] = useState('');
  const stageRef = useRef(null);
  const barRef = useRef(null);
  const [barEnd, setBarEnd] = useState(false);

  const selected = doc.items.find((i) => i.id === selectedId) || null;
  const togglePanel = (p) => setPanel((cur) => (cur === p ? null : p));

  // chevron: scroll the bar to reveal more tools, flips to "back" at the end
  const onBarScroll = () => {
    const el = barRef.current;
    if (el) setBarEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 8);
  };
  const scrollBar = () => {
    const el = barRef.current;
    if (!el) return;
    el.scrollTo({ left: barEnd ? 0 : el.scrollLeft + el.clientWidth * 0.8, behavior: 'smooth' });
  };

  // ---- item operations ----
  const addItem = useCallback(
    (item) => {
      commit((d) => ({ ...d, items: [...d.items, item] }));
      setSelectedId(item.id);
      setTool('select');
    },
    [commit]
  );

  const onStrokeEnd = useCallback((s) => commit((d) => ({ ...d, items: [...d.items, s] })), [commit]);

  const addSticker = (emoji) =>
    addItem({
      id: uid(),
      type: 'sticker',
      emoji,
      x: CARD_W / 2 + (Math.random() - 0.5) * 120,
      y: CARD_H / 2 + (Math.random() - 0.5) * 400,
      rotation: 0,
      scaleX: 1.2,
      scaleY: 1.2,
    });

  const addText = () => {
    addItem({
      id: uid(),
      type: 'text',
      text: 'hello!',
      x: CARD_W / 2,
      y: CARD_H / 2,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      fontFamily: 'Caveat',
      fontSize: 48,
      fill: penColor,
      bold: true,
      italic: false,
    });
    setPanel('text');
  };

  const patchSelected = (props, key) =>
    commit(
      (d) => ({ ...d, items: d.items.map((i) => (i.id === selectedId ? { ...i, ...props } : i)) }),
      key ? { key } : {}
    );

  const removeItem = useCallback(
    (id) => {
      commit((d) => ({ ...d, items: d.items.filter((i) => i.id !== id) }));
      setSelectedId((cur) => (cur === id ? null : cur));
    },
    [commit]
  );

  const duplicateSelected = useCallback(() => {
    if (!selected) return;
    const copy = { ...selected, id: uid(), x: selected.x + 30, y: selected.y + 30 };
    commit((d) => {
      const idx = d.items.findIndex((i) => i.id === selected.id);
      const items = [...d.items];
      items.splice(idx + 1, 0, copy);
      return { ...d, items };
    });
    setSelectedId(copy.id);
  }, [selected, commit]);

  const moveLayer = (id, dir) =>
    commit((d) => {
      const i = d.items.findIndex((x) => x.id === id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= d.items.length) return d;
      const items = [...d.items];
      [items[i], items[j]] = [items[j], items[i]];
      return { ...d, items };
    });

  const toggleVisible = (id) =>
    commit((d) => ({
      ...d,
      items: d.items.map((i) => (i.id === id ? { ...i, visible: i.visible === false } : i)),
    }));

  // ---- export / print ----
  const exportPng = () => {
    const url = stageRef.current.toDataURL();
    const a = document.createElement('a');
    a.href = url;
    a.download = 'editique-strip.png';
    a.click();
  };

  // save the finished strip to the Django server (needs login)
  const saveToServer = async () => {
    if (!user) return onNeedLogin();
    setToast('Saving…');
    try {
      const url = stageRef.current.toDataURL();
      const blob = await (await fetch(url)).blob();
      await api.saveStrip(blob, 'Editique strip');
      setToast('Saved to My strips ✓');
    } catch (e) {
      setToast(e.status === 401 ? 'Please log in again.' : e.message);
    }
    setTimeout(() => setToast(''), 2800);
  };

  const printIt = () => {
    const url = stageRef.current.toDataURL();
    const iframe = document.createElement('iframe');
    iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0';
    document.body.appendChild(iframe);
    const w = iframe.contentWindow;
    w.document.write(
      `<html><head><style>@page{margin:0}body{margin:0}img{height:100vh;display:block;margin:0 auto}</style></head><body><img src="${url}"></body></html>`
    );
    w.document.close();
    const img = w.document.querySelector('img');
    const go = () => {
      w.focus();
      w.print();
      setTimeout(() => iframe.remove(), 1500);
    };
    img.complete ? go() : (img.onload = go);
  };

  // ---- keyboard shortcuts ----
  useEffect(() => {
    const onKey = (e) => {
      const tag = e.target.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        e.shiftKey ? redo() : undo();
      } else if (mod && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        redo();
      } else if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId) {
        removeItem(selectedId);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [undo, redo, selectedId, removeItem]);

  const changeZoom = (z) => setZoom(Math.min(3, Math.max(0.3, +z)));
  const activeSize = tool === 'eraser' ? eraserSize : penSize;
  const setActiveSize = (v) => (tool === 'eraser' ? setEraserSize(v) : setPenSize(v));

  return (
    <>
      {toast && (
        <button
          className="note absolute top-16 left-1/2 -translate-x-1/2 z-40 px-4 py-2 text-base whitespace-nowrap"
          onClick={() => toast.startsWith('Saved') && onGallery()}
        >
          {toast}
          {toast.startsWith('Saved') && <span className="underline ml-2">view</span>}
        </button>
      )}
        {/* header */}
        <header className="relative flex items-center justify-center pt-4 pb-2 shrink-0">
          <h1 className="title-box text-xl md:text-2xl relative">
            Editique
            <svg className="absolute left-1 -bottom-2 w-[95%]" height="8" viewBox="0 0 200 8" preserveAspectRatio="none">
              <path d="M2 5 Q 25 0 50 5 T 100 4 T 150 5 T 198 3" fill="none" stroke="#e5484d" strokeWidth="3" strokeLinecap="round" />
            </svg>
          </h1>
          <button
            className="absolute left-4 top-3 text-[#1b1b8f] text-3xl font-bold leading-none px-2"
            onClick={onBack}
            aria-label="Back to camera"
            title="Back to camera"
          >
            ‹
          </button>
          <span className="absolute right-5 top-4 text-2xl -rotate-12 select-none text-[#e5484d]" aria-hidden>★</span>
        </header>

        {/* scrollable, zoomable canvas area */}
        <main
          className="flex-1 overflow-auto scroll-hide mx-3 rounded-lg bg-[#ececec]/80"
          onWheel={(e) => {
            if (e.ctrlKey) {
              e.preventDefault();
              changeZoom(zoom - e.deltaY * 0.002);
            }
          }}
        >
          <div className="min-h-full flex items-start justify-center px-4 pb-4 pt-8">
            <div className="relative">
              <span className="tape" style={{ left: '50%', top: -14, marginLeft: -45, transform: 'rotate(3deg)', zIndex: 5 }} />
              <div className="card-shadow">
                <CanvasStage
                  ref={stageRef}
                  doc={doc}
                  tool={tool}
                  penColor={penColor}
                  penSize={penSize}
                  eraserSize={eraserSize}
                  zoom={zoom}
                  selectedId={selectedId}
                  setSelectedId={setSelectedId}
                  commit={commit}
                  onStrokeEnd={onStrokeEnd}
                  onDuplicate={duplicateSelected}
                  onDelete={() => removeItem(selectedId)}
                />
              </div>
            </div>
          </div>
        </main>

        {/* popover panel */}
        {panel && (
          <div className="relative shrink-0 px-3 pt-2">
            <div className="note mx-auto max-w-md p-3 max-h-[40vh] overflow-y-auto scroll-hide relative">
              <button className="absolute right-2 top-1 text-xl" onClick={() => setPanel(null)} aria-label="Close panel">
                ✕
              </button>
              {panel === 'bg' && <BackgroundPanel doc={doc} commit={commit} />}
              {panel === 'stickers' && <StickersPanel onAdd={addSticker} />}
              {panel === 'text' && <TextPanel selected={selected} onAdd={addText} onChange={patchSelected} />}
              {panel === 'layers' && (
                <LayersPanel
                  items={doc.items}
                  selectedId={selectedId}
                  onSelect={(id) => {
                    setSelectedId(id);
                    setTool('select');
                  }}
                  onMove={moveLayer}
                  onToggle={toggleVisible}
                  onRemove={removeItem}
                />
              )}
            </div>
          </div>
        )}

        {/* bottom bar: smiley, pen, color wheel, then ">" scrolls to the rest */}
        <nav className="shrink-0 mx-3 my-3 rounded-2xl bg-[#e8e8ee] border-2 border-[#2b2b2b] relative">
          <div ref={barRef} onScroll={onBarScroll} className="flex items-start gap-4 px-4 py-2 pr-14 overflow-x-auto scroll-hide">
            <Tool label="Stickers" active={panel === 'stickers'} onClick={() => togglePanel('stickers')}>
              <IconSmile />
            </Tool>
            <Tool
              label="Pen"
              active={tool === 'pen'}
              onClick={() => {
                setTool('pen');
                setSelectedId(null);
              }}
            >
              <IconPen />
            </Tool>

            {/* color wheel (pen color) */}
            <label className="tool cursor-pointer" title="Pen color">
              <span className="dot wheel relative">
                <span
                  className="absolute rounded-full border-2 border-white"
                  style={{ width: 16, height: 16, background: penColor, right: -2, bottom: -2 }}
                />
                <input
                  type="color"
                  value={penColor}
                  onChange={(e) => setPenColor(e.target.value)}
                  className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                  aria-label="Pen color"
                />
              </span>
              <span>Color</span>
            </label>

            <label className="tool" title="Brush size">
              <span className="flex items-center justify-center h-12 gap-1">
                <span
                  className="rounded-full shrink-0 border border-[#2b2b2b]"
                  style={{
                    width: Math.min(26, Math.max(4, activeSize)),
                    height: Math.min(26, Math.max(4, activeSize)),
                    background: tool === 'eraser' ? '#bbb' : penColor,
                  }}
                />
                <input
                  type="range"
                  min={1}
                  max={tool === 'eraser' ? 80 : 40}
                  value={activeSize}
                  onChange={(e) => setActiveSize(+e.target.value)}
                  className="w-24"
                  aria-label="Brush size"
                />
              </span>
              <span>Size {activeSize}</span>
            </label>

            <Tool
              label="Eraser"
              active={tool === 'eraser'}
              onClick={() => {
                setTool('eraser');
                setSelectedId(null);
              }}
              title="Eraser (doodles only)"
            >
              <IconEraser />
            </Tool>
            <Tool label="Select" active={tool === 'select'} onClick={() => setTool('select')} title="Select / move">
              <span style={{ fontSize: 22 }}>☝</span>
            </Tool>
            <Tool label="Text" active={panel === 'text'} onClick={() => togglePanel('text')}>
              <b style={{ fontFamily: 'Libre Baskerville, serif' }}>Aa</b>
            </Tool>
            <Tool label="Photo/BG" active={panel === 'bg'} onClick={() => togglePanel('bg')}>
              <IconImage />
            </Tool>
            <Tool label="Layers" active={panel === 'layers'} onClick={() => togglePanel('layers')}>
              <IconLayers />
            </Tool>
            <Tool label="Undo" disabled={!canUndo} onClick={undo} title="Undo (Ctrl+Z)">
              ↶
            </Tool>
            <Tool label="Redo" disabled={!canRedo} onClick={redo} title="Redo (Ctrl+Shift+Z)">
              ↷
            </Tool>

            {/* zoom */}
            <div className="tool" style={{ cursor: 'default' }}>
              <span className="flex items-center h-12 gap-1">
                <button onClick={() => changeZoom(zoom - 0.1)} className="text-2xl w-7 leading-none" aria-label="Zoom out">
                  −
                </button>
                <input type="range" min={0.3} max={3} step={0.05} value={zoom} onChange={(e) => changeZoom(e.target.value)} className="w-24" aria-label="Zoom" />
                <button onClick={() => changeZoom(zoom + 0.1)} className="text-2xl w-7 leading-none" aria-label="Zoom in">
                  ＋
                </button>
              </span>
              <span>
                Zoom {Math.round(zoom * 100)}%{' '}
                <button className="underline" onClick={() => setZoom(fitZoom())}>
                  fit
                </button>
              </span>
            </div>

            <Tool label="Save" onClick={exportPng}>
              ⬇
            </Tool>
            <Tool label={user ? 'Cloud' : 'Log in'} onClick={saveToServer} title="Save to your account on the server">
              ☁
            </Tool>
            <Tool label="Print" onClick={printIt}>
              ⎙
            </Tool>
          </div>

          {/* chevron like the prototype */}
          <button
            onClick={scrollBar}
            className="absolute right-0 top-0 h-full w-12 grid place-items-center text-[#1b1b8f] text-4xl font-bold rounded-r-2xl bg-gradient-to-l from-[#e8e8ee] via-[#e8e8ee] to-transparent"
            aria-label={barEnd ? 'Back to start' : 'More tools'}
          >
            {barEnd ? '‹' : '›'}
          </button>
        </nav>
    </>
  );
}
