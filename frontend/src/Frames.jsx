import { useState } from 'react';
import { Stage, Layer } from 'react-konva';
import { FrameArt } from './CanvasStage.jsx';
import { BUILTIN, layout } from './frames.js';
import { PRESETS } from './utils.js';

function Preview({ frame }) {
  const L = layout(frame);
  const s = Math.min(220 / L.w, 330 / L.h);
  const images = L.slots.map((_, i) => PRESETS[i % PRESETS.length].src);
  return (
    <Stage width={Math.round(L.w * s)} height={Math.round(L.h * s)} scaleX={s} scaleY={s}>
      <Layer listening={false}>
        <FrameArt frame={frame} L={L} color={frame.color} bg="#e9e9e9" images={images} />
      </Layer>
    </Stage>
  );
}

// Line up the photo windows with an uploaded frame picture
function Adjust({ adj, setAdj, onUse, onCancel }) {
  const p = adj.params;
  const set = (k) => (v) => setAdj({ ...adj, params: { ...p, [k]: v } });
  return (
    <div className="absolute inset-0 z-30 bg-white flex flex-col overflow-y-auto scroll-hide p-4 gap-3">
      <h2 className="hand text-2xl text-center">line up the photo windows</h2>
      <div className="relative mx-auto border-2 border-[#151515]" style={{ width: 200, aspectRatio: `${CARD_W} / ${p.h}` }}>
        <img src={adj.img.src} alt="your frame" className="absolute inset-0 w-full h-full" />
        {Array.from({ length: p.count }, (_, i) => (
          <div
            key={i}
            className="absolute"
            style={{
              left: `${(p.left / CARD_W) * 100}%`,
              top: `${((p.top + i * (p.height + p.gap)) / p.h) * 100}%`,
              width: `${(p.width / CARD_W) * 100}%`,
              height: `${(p.height / p.h) * 100}%`,
              outline: '2px solid #151515',
              background: 'rgba(0,0,0,0.12)',
            }}
          />
        ))}
      </div>
      <Slider label="Photos" value={p.count} min={1} max={6} onChange={set('count')} />
      <Slider label="Left" value={p.left} min={0} max={300} onChange={set('left')} />
      <Slider label="Top" value={p.top} min={0} max={p.h} onChange={set('top')} />
      <Slider label="Width" value={p.width} min={40} max={CARD_W} onChange={set('width')} />
      <Slider label="Height" value={p.height} min={40} max={p.h} onChange={set('height')} />
      <Slider label="Gap" value={p.gap} min={0} max={200} onChange={set('gap')} />
      <div className="flex gap-3 justify-center pb-2">
        <button className="btn" onClick={onCancel}>cancel</button>
        <button className="btn" style={{ background: '#e6e6e6' }} onClick={onUse}>use this frame</button>
      </div>
    </div>
  );
}

// Step before the camera: flip through frames with the arrows, customize, or upload your own.
export default function Frames({ onBack, onSelect }) {
  const [frames, setFrames] = useState(BUILTIN);
  const [i, setI] = useState(0);
  const f = frames[i];
  
  const patch = (props) => setFrames((fs) => fs.map((x, k) => (k === i ? { ...x, ...props } : x)));
  const go = (d) => setI((v) => (v + d + frames.length) % frames.length);

  return (
    <div className="flex flex-col h-full">
      <header className="relative flex items-center justify-between px-3 pt-3 pb-1 shrink-0">
        <button className="icon-btn" onClick={onBack} aria-label="Back">‹</button>
        <h1 className="title-box text-base">CHOOSE A FRAME</h1>
        <span style={{ width: 40 }} />
      </header>

      <main className="flex-1 overflow-y-auto scroll-hide px-4 pb-3 flex flex-col items-center justify-center gap-4">
        
        <div className="flex items-center justify-center gap-4 w-full">
          <button className="icon-btn shrink-0" onClick={() => go(-1)} aria-label="Previous frame">‹</button>
          <div className="card-shadow bg-white shrink-0"><Preview frame={f} /></div>
          <button className="icon-btn shrink-0" onClick={() => go(1)} aria-label="Next frame">›</button>
        </div>
        
        <div className="flex flex-col items-center gap-2">
            <div className="hand text-xl text-center">{f.name} · {layout(f).slots.length} pics</div>
            <div className="flex gap-1 justify-center">
            {frames.map((_, k) => (
                <span key={k} className="w-2.5 h-2.5 rounded-full border-2 border-[#151515]" style={{ background: k === i ? '#151515' : '#fff' }} />
            ))}
            </div>
        </div>

        {f.custom && (
          <div className="note w-full max-w-[340px] p-3 flex flex-col gap-2 mt-2">
            <div className="flex items-center gap-2">
              <input type="color" value={f.color} onChange={(e) => patch({ color: e.target.value })} aria-label="Frame color" />
              <span>frame color</span>
              <button className={`btn ${f.holes ? 'active' : ''}`} style={{ minHeight: 36 }} onClick={() => patch({ holes: !f.holes, holeColor: '#ffffff' })}>
                film holes
              </button>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <span>photos</span>
              {[2, 3, 4, 5].map((n) => (
                <button key={n} className={`btn ${f.count === n ? 'active' : ''}`} style={{ minHeight: 36, minWidth: 36 }} onClick={() => patch({ count: n })}>
                  {n}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <span>caption</span>
              <input className="field flex-1 min-w-0" value={f.caption} maxLength={20} onChange={(e) => patch({ caption: e.target.value })} />
            </div>
            
          </div>
        )}
      </main>

      <div className="shrink-0 flex flex-col items-center pb-4">
        <button className="btn" style={{ background: '#e6e6e6', padding: '0.3rem 2rem', fontSize: 22 }} onClick={() => onSelect(f)}>
          select ●
        </button>
      </div>
    </div>
  );
}